// 1. CARGA CRÍTICA: Asegura que process.env.JWT_SECRET esté definido antes de usarse.
require('dotenv').config();

const jwt = require('jsonwebtoken');

// Obtener la clave secreta con fallback seguro para desarrollo / pruebas
const JWT_SECRET = process.env.JWT_SECRET || "secreto_super_seguro";

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
    console.error("ERROR CRÍTICO DE CONFIGURACIÓN: La variable de entorno JWT_SECRET no está definida en producción. Verifique su archivo .env.");
}

function verificarToken(req, res, next) {
    // 1. Extraer la cabecera de autorización
    const authHeader = req.headers['authorization'];

    // 2. Verificar si el encabezado existe
    if (!authHeader) {
        // 401 Unauthorized: No hay credenciales (token)
        return res.status(401).json({ mensaje: "Acceso denegado. No se encontró el token de autorización." });
    }

    // 3. El formato esperado es "Bearer <token>"
    // Dividir el encabezado y tomar la segunda parte
    const parts = authHeader.split(' ');

    // Verificar el formato (Debe tener 2 partes y la primera debe ser 'Bearer')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ mensaje: "Formato de token inválido. Debe ser 'Bearer <token>'" });
    }

    const token = parts[1];
    const secret = process.env.JWT_SECRET || JWT_SECRET;

    // 4. Verificar la clave secreta antes de usar jwt.verify
    if (!secret) {
        return res.status(500).json({ mensaje: "Error interno: Configuración de seguridad faltante." });
    }

    // 5. Verificar el token
    jwt.verify(token, secret, (err, decoded) => {
        if (err) {
            // 403 Forbidden: El usuario tiene credenciales, pero son inválidas

            let mensajeError = "Token inválido o corrupto.";

            if (err.name === 'TokenExpiredError') {
                mensajeError = "Token expirado. Por favor, inicie sesión de nuevo.";
            }

            return res.status(403).json({
                mensaje: mensajeError,
                error: err.name // Añadir el tipo de error para el cliente
            });
        }

        // Token Válido: Adjuntar el payload decodificado (req.user)
        req.user = decoded;

        // Continuar con la función o controlador de ruta
        next();
    });
}

module.exports = verificarToken;