const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({});

function configurado() {
    return Boolean(process.env.WOMPI_PUBLIC_KEY && process.env.WOMPI_INTEGRITY_SECRET);
}

function firmaIntegridad(reference, amountInCents, currency) {
    const raw = `${reference}${amountInCents}${currency}${process.env.WOMPI_INTEGRITY_SECRET}`;
    return crypto.createHash("sha256").update(raw).digest("hex");
}

function valorEn(data, path) {
    return String(path).split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), data);
}

function eventoValido(event) {
    const secret = process.env.WOMPI_EVENTS_SECRET;
    if (!secret || !event?.signature?.checksum || event.timestamp == null) return false;
    const props = Array.isArray(event.signature.properties) ? event.signature.properties : [];
    const concat = props.map((prop) => {
        const value = valorEn(event.data, prop);
        return value == null ? "" : String(value);
    }).join("") + String(event.timestamp) + secret;
    const checksum = crypto.createHash("sha256").update(concat).digest("hex");
    const recibido = String(event.signature.checksum);
    const a = Buffer.from(checksum);
    const b = Buffer.from(recibido);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
}

const wompiService = {
    async crearCheckout(idPedido, idUsuario) {
        if (!configurado()) {
            const error = new Error("Pago en línea no está configurado. El pedido queda en efectivo.");
            error.status = 503;
            throw error;
        }
        const pedido = await prisma.pedidos.findUnique({ where: { idPedido: parseInt(idPedido) } });
        if (!pedido || pedido.idCliente !== parseInt(idUsuario)) {
            const error = new Error("Pedido no encontrado.");
            error.status = 404;
            throw error;
        }
        const currency = "COP";
        const amountInCents = Math.round(Number(pedido.total || 0) * 100);
        if (!amountInCents) {
            const error = new Error("El pedido no tiene un total para cobrar.");
            error.status = 400;
            throw error;
        }
        const reference = `DOMIFLEX-${pedido.idPedido}-${Date.now()}`;
        const front = process.env.FRONTEND_URL || "https://domiflex-web-production.up.railway.app";
        return {
            publicKey: process.env.WOMPI_PUBLIC_KEY,
            currency,
            amountInCents,
            reference,
            signature: firmaIntegridad(reference, amountInCents, currency),
            redirectUrl: `${front}/tracking/${pedido.idPedido}`,
        };
    },

    async procesarEvento(event) {
        if (!process.env.WOMPI_EVENTS_SECRET) {
            const error = new Error("Webhook de Wompi no configurado.");
            error.status = 503;
            throw error;
        }
        if (!eventoValido(event)) {
            const error = new Error("Firma del evento inválida.");
            error.status = 401;
            throw error;
        }
        const tx = event?.data?.transaction;
        if (!tx || tx.status !== "APPROVED") return { ok: true, ignored: true };
        const match = String(tx.reference || "").match(/^DOMIFLEX-(\d+)-/);
        if (!match) return { ok: true, ignored: true };
        await prisma.pagos.updateMany({
            where: { idPedido: Number(match[1]), tipoPago: "PEDIDO" },
            data: { estado: "COMPLETADO" },
        });
        return { ok: true };
    },
};

module.exports = wompiService;
