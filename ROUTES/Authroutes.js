const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const verfificacion = require('../MIDDLEWARE/authmiddleware.js');
const authController = require('../CONTROLLERS/authcontroller.js');

// Rate Limiting para Login (protección contra fuerza bruta)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100,
    message: 'Demasiados intentos de inicio de sesión. Por favor intente más tarde.',
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/registro', authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/request-pre-otp', authController.requestPreRegOtp);
router.post('/verify-pre-otp', authController.verifyPreRegOtp);
router.post('/google', authController.googleAuth);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.post('/fcm-token', verfificacion, authController.guardarFcmToken);

const authorize = require('../MIDDLEWARE/role.middleware.js');




router.get('/', verfificacion, authorize(['ADMIN']), authController.getUsuarios);
router.get('/repartidores', verfificacion, authorize(['ADMIN']), authController.getRepartidores);
router.get('/clientes', verfificacion, authorize(['ADMIN']), authController.getClientes);

router.put('/:id', verfificacion, authorize(['ADMIN', 'CLIENTE', 'COMERCIO', 'REPARTIDOR']), authController.updateUsuario);
router.patch('/:id/estado', verfificacion, authorize(['ADMIN']), authController.cambiarEstadoUsuario);
router.delete('/:id', verfificacion, authorize(['ADMIN']), authController.eliminarUsuario);
router.get('/search', verfificacion, authorize(['ADMIN']), authController.buscarUsuarios);
router.get('/online-users', verfificacion, authorize(['ADMIN']), authController.getOnlineUsers);
router.get('/usuarios/dia/:dia', verfificacion, authorize(['ADMIN']), authController.getUsuariosPorDia);
router.get('/:id', verfificacion, authorize(['ADMIN', 'CLIENTE', 'COMERCIO', 'REPARTIDOR']), authController.getUsuarioById);


module.exports = router;
