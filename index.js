require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const rateLimit = require('express-rate-limit');

app.set('trust proxy', 1);

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate Limiting Global
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // Límite de 1000 peticiones por ventana
    message: 'Demasiadas peticiones desde esta IP, por favor intente más tarde.',
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(generalLimiter);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));


const authRoutes = require('./ROUTES/Authroutes');
const vehiculosRoutes = require('./ROUTES/VehiculosRoutes');
const rutasRoutes = require('./ROUTES/RutasRoutes');
const pedidosRoutes = require('./ROUTES/PedidosRoutes');
const pagosRoutes = require('./ROUTES/PagosRoutes');
const wompiRoutes = require('./ROUTES/WompiRoutes');
const chatRoutes = require('./ROUTES/ChatRoutes');
const calificacionesRoutes = require('./ROUTES/CalificacionesRoutes');
const suscripcionesRoutes = require('./ROUTES/SuscripcionesRoutes');
const rolesRoutes = require('./ROUTES/RolesRoutes');
const paradasRoutes = require('./ROUTES/ParadasRoutes');
const pedidoParadasRoutes = require('./ROUTES/PedidoParadasRoutes');
const planesRepartidorRoutes = require('./ROUTES/PlanesRepartidorRoutes');
const iaRutasLogRoutes = require('./ROUTES/IaRutasLogRoutes');
const documentacionRoutes = require('./ROUTES/DocumentacionRoutes');
const notificacionesRoutes = require('./ROUTES/NotificacionesRoutes');
const estadisticasRoutes = require('./ROUTES/EstadisticasRoutes');
const contactoRoutes = require('./ROUTES/contactoroutes');
const reportesPagoRoutes = require('./ROUTES/ReportesPagoRoutes');
const negociosRoutes = require('./ROUTES/NegociosRoutes');
const productoRoutes = require('./ROUTES/ProductoRoutes');
const pedidoItemsRoutes = require('./ROUTES/PedidoItemsRoutes');

// Usar Rutas
app.use('/api/auth', authRoutes);
app.use('/api/vehiculos', vehiculosRoutes);
app.use('/api/rutas', rutasRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/pagos', wompiRoutes);
app.use('/api/pagos', pagosRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/calificaciones', calificacionesRoutes);
app.use('/api/suscripciones', suscripcionesRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/paradas', paradasRoutes);
app.use('/api/pedido-paradas', pedidoParadasRoutes);
app.use('/api/planes-repartidor', planesRepartidorRoutes);
app.use('/api/ia-rutas-log', iaRutasLogRoutes);
app.use('/api/documentacion', documentacionRoutes);
app.use('/api/notificaciones', notificacionesRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/contacto', contactoRoutes);
app.use('/api/reportes-pago', reportesPagoRoutes);
app.use('/api/negocios', negociosRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/pedido-items', pedidoItemsRoutes);




const http = require('http');
const server = http.createServer(app);
const socketService = require('./SERVICES/SocketService');

socketService.init(server);

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, () => {
        console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
    // Inicializar tareas automáticas (cron jobs)
    const { initCronJobs } = require('./SERVICES/CronJobs');
    initCronJobs();
}

module.exports = { app, server };
