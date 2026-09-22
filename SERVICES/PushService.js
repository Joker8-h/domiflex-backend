const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({});

let clienteAuth = null;

async function tokenDeAcceso(credenciales) {
    if (!clienteAuth) {
        const { GoogleAuth } = require("google-auth-library");
        clienteAuth = new GoogleAuth({
            credentials: credenciales,
            scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
        });
    }
    const client = await clienteAuth.getClient();
    const token = await client.getAccessToken();
    return token?.token || token;
}

const pushService = {
    async enviarAUsuarios(ids, titulo, mensaje, data) {
        if (!process.env.FIREBASE_SERVICE_ACCOUNT) return;
        let credenciales;
        try {
            credenciales = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } catch {
            return;
        }
        const projectId = credenciales.project_id;
        if (!projectId) return;

        const unicos = [...new Set((ids || []).filter(Boolean).map((id) => parseInt(id)))];
        if (!unicos.length) return;
        const usuarios = await prisma.usuarios.findMany({
            where: { idUsuarios: { in: unicos }, fcmToken: { not: null } },
            select: { fcmToken: true },
        });
        if (!usuarios.length) return;

        let accessToken;
        try {
            accessToken = await tokenDeAcceso(credenciales);
        } catch {
            return;
        }

        const datos = {};
        Object.entries(data || {}).forEach(([clave, valor]) => {
            datos[clave] = valor == null ? "" : String(valor);
        });

        await Promise.all(usuarios.map(async (usuario) => {
            try {
                await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        message: {
                            token: usuario.fcmToken,
                            notification: { title: titulo, body: mensaje },
                            data: datos,
                        },
                    }),
                });
            } catch {
                // La notificación en base de datos ya quedó registrada.
            }
        }));
    },
};

module.exports = pushService;
