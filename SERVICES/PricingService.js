const axios = require("axios");

const OPTIMIZER_URL = process.env.OPTIMIZER_URL || "http://localhost:8000";

const PricingService = {
    /**
     * Redondea al múltiplo de 100 más cercano (Mínimo 500 COP)
     */
    redondearCop(monto) {
        if (!monto || monto <= 0) return 0;
        const res = Math.ceil(monto / 100) * 100;
        return Math.max(res, 500);
    },

    /**
     * Calcula la distancia Haversine entre dos puntos (km)
     */
    calcularDistancia(lat1, lng1, lat2, lng2) {
        const R = 6371; // Radio Tierra km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    /**
     * Estima el precio de un pedido (domicilio) entre recogida y entrega.
     * Tarifa: base 2000 + 800 * km. Comisión por distancia: <=5km 10%, <=15km 12%, >15km 15%.
     */
    async estimarPrecioPedido({ latRecogida, lngRecogida, latEntrega, lngEntrega }) {
        const latO = parseFloat(latRecogida);
        const lngO = parseFloat(lngRecogida);
        const latD = parseFloat(latEntrega);
        const lngD = parseFloat(lngEntrega);

        if ([latO, lngO, latD, lngD].some((v) => Number.isNaN(v))) {
            throw new Error("Coordenadas de recogida y entrega son obligatorias y deben ser numéricas.");
        }

        let distanciaRecorrida = 0;

        // 1. Intentar con el optimizador (/route-options) para obtener distancia_km
        try {
            const resp = await axios.post(
                `${OPTIMIZER_URL}/route-options`,
                {
                    origin: { lat: latO, lng: lngO },
                    destination: { lat: latD, lng: lngD },
                    preference: "CHEAPEST",
                    k: 1
                },
                { timeout: 10000 }
            );

            const data = resp?.data || {};
            const candidato =
                data.distancia_km ??
                data.distanciaKm ??
                data.distance_km ??
                data.distanceKm ??
                data?.options?.[0]?.distancia_km ??
                data?.options?.[0]?.distance_km ??
                data?.routes?.[0]?.distancia_km ??
                data?.routes?.[0]?.distance_km ??
                0;

            const parsed = parseFloat(candidato);
            if (!Number.isNaN(parsed) && parsed > 0) {
                distanciaRecorrida = parsed;
            }
        } catch (err) {
            console.warn("PricingService: Optimizer falló, usando fallback Haversine", err.message);
        }

        // 2. Fallback Haversine
        if (!distanciaRecorrida || distanciaRecorrida <= 0) {
            distanciaRecorrida = this.calcularDistancia(latO, lngO, latD, lngD);
        }

        const subtotal = this.redondearCop(2000 + 800 * distanciaRecorrida);

        let tasaComision = 0.15;
        if (distanciaRecorrida <= 5) tasaComision = 0.10;
        else if (distanciaRecorrida <= 15) tasaComision = 0.12;

        const comisionPlataforma = this.redondearCop(subtotal * tasaComision);
        const precioFinal = this.redondearCop(subtotal + comisionPlataforma);

        return {
            subtotal,
            precioFinal,
            total: precioFinal,
            comisionPlataforma,
            distanciaRecorrida,
            precioFormateado: `$ ${this.redondearCop(precioFinal).toLocaleString('es-CO')} COP`
        };
    }
};

module.exports = PricingService;
