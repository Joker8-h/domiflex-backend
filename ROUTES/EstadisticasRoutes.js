const express = require('express');
const router = express.Router();
const estadisticasController = require('../CONTROLLERS/EstadisticasController');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || "secreto_super_seguro";

// Middleware local de autenticación básica (compartido con otras rutas)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: "No autenticado" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: "Token inválido o expirado" });
        req.user = user;
        next();
    });
};

router.use(authenticateToken);

router.get('/ganancias', estadisticasController.getGanancias);
router.get('/ingresos', estadisticasController.getIngresosGlobales);
router.get('/pedidos', estadisticasController.getResumenPedidos);
router.get('/rutas', estadisticasController.getMejoresRutas);
router.get('/online-time', estadisticasController.getOnlineTime);

module.exports = router;
