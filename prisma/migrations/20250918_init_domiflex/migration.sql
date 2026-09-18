


-- CreateTable
CREATE TABLE `Roles` (
    `idRol` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `Roles_nombre_key`(`nombre`),
    PRIMARY KEY (`idRol`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Usuarios` (
    `idUsuarios` INTEGER NOT NULL AUTO_INCREMENT,
    `idRol` INTEGER NOT NULL,
    `nombre` VARCHAR(100) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `telefono` VARCHAR(20) NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `fotoPerfil` VARCHAR(500) NULL,
    `estado` ENUM('ACTIVO', 'INACTIVO', 'SUSPENDIDO') NOT NULL DEFAULT 'ACTIVO',
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `otpCode` VARCHAR(6) NULL,
    `otpExpiry` DATETIME(3) NULL,
    `isEmailVerified` BOOLEAN NOT NULL DEFAULT false,
    `googleId` VARCHAR(255) NULL,
    `resetToken` VARCHAR(255) NULL,
    `resetTokenExpiry` DATETIME(3) NULL,
    `nombreEmergencia` VARCHAR(100) NULL,
    `numeroEmergencia` VARCHAR(20) NULL,

    UNIQUE INDEX `Usuarios_email_key`(`email`),
    UNIQUE INDEX `Usuarios_googleId_key`(`googleId`),
    PRIMARY KEY (`idUsuarios`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vehiculos` (
    `idVehiculos` INTEGER NOT NULL AUTO_INCREMENT,
    `idUsuario` INTEGER NOT NULL,
    `marca` VARCHAR(50) NULL,
    `modelo` VARCHAR(50) NULL,
    `placa` VARCHAR(20) NULL,
    `tipo` ENUM('MOTO', 'BICICLETA', 'CARRO', 'FURGON') NOT NULL DEFAULT 'MOTO',
    `capacidad` INTEGER NOT NULL,
    `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    `fotoPlaca` VARCHAR(500) NULL,
    `fotoAuto1` VARCHAR(500) NULL,
    `fotoAuto2` VARCHAR(500) NULL,
    `fotoAuto3` VARCHAR(500) NULL,
    `placaValidada` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `Vehiculos_placa_key`(`placa`),
    PRIMARY KEY (`idVehiculos`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Rutas` (
    `idRuta` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NULL,
    `descripcion` VARCHAR(255) NULL,
    `origen` VARCHAR(191) NOT NULL DEFAULT 'IA',
    `estado` ENUM('BORRADOR', 'DISPONIBLE', 'ARCHIVADA') NOT NULL DEFAULT 'BORRADOR',
    `scoreIa` DECIMAL(5, 2) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`idRuta`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Paradas` (
    `idParada` INTEGER NOT NULL AUTO_INCREMENT,
    `idRuta` INTEGER NOT NULL,
    `nombre` VARCHAR(100) NULL,
    `lat` DECIMAL(10, 8) NULL,
    `lng` DECIMAL(11, 8) NULL,
    `orden` INTEGER NOT NULL,
    `kmAcumulado` DECIMAL(10, 2) NULL,
    `tipo` ENUM('RECOGIDA', 'ENTREGA', 'AMBAS') NOT NULL DEFAULT 'AMBAS',

    PRIMARY KEY (`idParada`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pedidos` (
    `idPedido` INTEGER NOT NULL AUTO_INCREMENT,
    `idCliente` INTEGER NOT NULL,
    `idRepartidor` INTEGER NULL,
    `idComercio` INTEGER NULL,
    `idRuta` INTEGER NULL,
    `idVehiculo` INTEGER NULL,
    `negocioId` INTEGER NULL,
    `nombreRecogida` VARCHAR(255) NULL,
    `dirRecogida` VARCHAR(255) NULL,
    `latRecogida` DECIMAL(10, 8) NULL,
    `lngRecogida` DECIMAL(11, 8) NULL,
    `nombreEntrega` VARCHAR(255) NULL,
    `dirEntrega` VARCHAR(255) NULL,
    `latEntrega` DECIMAL(10, 8) NULL,
    `lngEntrega` DECIMAL(11, 8) NULL,
    `detallePedido` VARCHAR(500) NULL,
    `distanciaKm` DECIMAL(10, 2) NULL,
    `subtotal` DECIMAL(10, 2) NULL,
    `comisionPlataforma` DECIMAL(10, 2) NULL,
    `total` DECIMAL(10, 2) NULL,
    `tipoPago` ENUM('PEDIDO', 'PLAN_REPARTIDOR', 'EFECTIVO', 'TRANSFERENCIA') NOT NULL DEFAULT 'EFECTIVO',
    `estado` ENUM('CREADO', 'ASIGNADO', 'RECOGIENDO', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO') NOT NULL DEFAULT 'CREADO',
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`idPedido`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PedidoParadas` (
    `idPedido` INTEGER NOT NULL,
    `idParada` INTEGER NOT NULL,
    `orden` INTEGER NOT NULL,
    `tipo` ENUM('RECOGIDA', 'ENTREGA', 'AMBAS') NOT NULL DEFAULT 'ENTREGA',
    `completada` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`idPedido`, `idParada`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Calificaciones` (
    `idCalificacion` INTEGER NOT NULL AUTO_INCREMENT,
    `idPedido` INTEGER NOT NULL,
    `idCalificador` INTEGER NOT NULL,
    `idCalificado` INTEGER NOT NULL,
    `puntuacion` INTEGER NOT NULL,
    `comentario` VARCHAR(191) NULL,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`idCalificacion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Conversaciones` (
    `idConversacion` INTEGER NOT NULL AUTO_INCREMENT,
    `idPedido` INTEGER NOT NULL,
    `idCliente` INTEGER NOT NULL,
    `idRepartidor` INTEGER NOT NULL,
    `fechaCreacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `estado` ENUM('ACTIVA', 'CERRADA') NOT NULL,

    PRIMARY KEY (`idConversacion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Mensajes` (
    `idMensaje` INTEGER NOT NULL AUTO_INCREMENT,
    `idConversacion` INTEGER NOT NULL,
    `idRemitente` INTEGER NOT NULL,
    `mensaje` VARCHAR(191) NULL,
    `tipo` ENUM('TEXTO', 'SISTEMA') NOT NULL,
    `fechaEnvio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `leido` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`idMensaje`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pagos` (
    `idPago` INTEGER NOT NULL AUTO_INCREMENT,
    `idPedido` INTEGER NOT NULL,
    `idUsuario` INTEGER NOT NULL,
    `tipoPago` ENUM('PEDIDO', 'PLAN_REPARTIDOR', 'EFECTIVO', 'TRANSFERENCIA') NOT NULL,
    `monto` DECIMAL(10, 2) NULL,
    `estado` ENUM('PENDIENTE', 'PAGADO', 'FALLIDO', 'CONFIRMADO_CLIENTE', 'CONFIRMADO_REPARTIDOR', 'COMPLETADO') NOT NULL DEFAULT 'PENDIENTE',
    `confirmacionCliente` BOOLEAN NOT NULL DEFAULT false,
    `confirmacionRepartidor` BOOLEAN NOT NULL DEFAULT false,
    `fechaPago` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Pagos_idPedido_idUsuario_key`(`idPedido`, `idUsuario`),
    PRIMARY KEY (`idPago`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlanesRepartidor` (
    `idPlan` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(50) NULL,
    `descripcion` VARCHAR(255) NULL,
    `tipo` ENUM('SEMANAL', 'MENSUAL', 'POR_PEDIDO') NOT NULL,
    `precio` DECIMAL(10, 2) NULL,
    `maxPedidos` INTEGER NULL,
    `porcentajeComision` DECIMAL(5, 2) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`idPlan`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SuscripcionesRepartidor` (
    `idSuscripcion` INTEGER NOT NULL AUTO_INCREMENT,
    `idUsuario` INTEGER NOT NULL,
    `idPlan` INTEGER NOT NULL,
    `fechaInicio` DATETIME(3) NULL,
    `fechaFin` DATETIME(3) NULL,
    `estado` ENUM('ACTIVA', 'VENCIDA', 'CANCELADA') NOT NULL DEFAULT 'ACTIVA',
    `renovacionAutomatica` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`idSuscripcion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IaRutasLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idRuta` INTEGER NOT NULL,
    `prompt` VARCHAR(191) NULL,
    `parametrosJson` JSON NULL,
    `modeloIa` VARCHAR(100) NULL,
    `fechaGeneracion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Documentacion` (
    `idDocumentacion` INTEGER NOT NULL AUTO_INCREMENT,
    `idUsuario` INTEGER NOT NULL,
    `tipoDocumento` VARCHAR(50) NULL,
    `numeroDocumento` VARCHAR(50) NULL,
    `fechaExpedicion` VARCHAR(50) NULL,
    `imagenFrontalUrl` VARCHAR(255) NULL,
    `estado` ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
    `fechaSubida` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `observaciones` VARCHAR(255) NULL,
    `datosOcr` JSON NULL,

    UNIQUE INDEX `Documentacion_idUsuario_key`(`idUsuario`),
    PRIMARY KEY (`idDocumentacion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notificaciones` (
    `idNotificacion` INTEGER NOT NULL AUTO_INCREMENT,
    `idUsuario` INTEGER NOT NULL,
    `titulo` VARCHAR(100) NOT NULL,
    `mensaje` TEXT NOT NULL,
    `leido` BOOLEAN NOT NULL DEFAULT false,
    `fechaCreacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tipo` VARCHAR(50) NOT NULL,

    PRIMARY KEY (`idNotificacion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SesionesUsuario` (
    `idSesion` INTEGER NOT NULL AUTO_INCREMENT,
    `idUsuario` INTEGER NOT NULL,
    `inicio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fin` DATETIME(3) NULL,
    `duracionSegundos` INTEGER NULL,

    PRIMARY KEY (`idSesion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SolicitudesCambioVehiculo` (
    `idSolicitud` INTEGER NOT NULL AUTO_INCREMENT,
    `idVehiculo` INTEGER NOT NULL,
    `marcaNueva` VARCHAR(50) NULL,
    `modeloNuevo` VARCHAR(50) NULL,
    `placaNueva` VARCHAR(20) NULL,
    `capacidadNueva` INTEGER NULL,
    `fotoPlacaNuevaUrl` VARCHAR(255) NULL,
    `fotoAuto1NuevaUrl` VARCHAR(255) NULL,
    `fotoAuto2NuevaUrl` VARCHAR(255) NULL,
    `fotoAuto3NuevaUrl` VARCHAR(255) NULL,
    `estado` ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
    `fechaSolicitud` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fechaRevision` DATETIME(3) NULL,
    `observaciones` VARCHAR(255) NULL,

    PRIMARY KEY (`idSolicitud`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailVerificaciones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(150) NOT NULL,
    `otpCode` VARCHAR(6) NOT NULL,
    `otpExpiry` DATETIME(3) NOT NULL,
    `verificado` BOOLEAN NOT NULL DEFAULT false,
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EmailVerificaciones_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReportesPago` (
    `idReporte` INTEGER NOT NULL AUTO_INCREMENT,
    `idUsuario` INTEGER NOT NULL,
    `mesCorrespondiente` DATETIME(3) NOT NULL,
    `montoComision` DECIMAL(10, 2) NOT NULL,
    `fotoComprobante` VARCHAR(500) NOT NULL,
    `cantidadEnviada` DECIMAL(10, 2) NULL,
    `estado` ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
    `fechaEnvio` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fechaRevision` DATETIME(3) NULL,
    `observaciones` VARCHAR(255) NULL,

    PRIMARY KEY (`idReporte`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CategoriasNegocio` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `icono` VARCHAR(10) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `CategoriasNegocio_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Negocios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(150) NOT NULL,
    `descripcion` VARCHAR(500) NULL,
    `tipo` ENUM('COMIDA', 'FARMACIA', 'SUPERMERCADO', 'TIENDA', 'PAQUETERIA', 'OTRO') NOT NULL DEFAULT 'COMIDA',
    `direccion` VARCHAR(255) NOT NULL,
    `latitud` DECIMAL(10, 8) NOT NULL,
    `longitud` DECIMAL(11, 8) NOT NULL,
    `telefono` VARCHAR(20) NULL,
    `imagen` VARCHAR(500) NULL,
    `banner` VARCHAR(500) NULL,
    `calificacion` DECIMAL(3, 2) NOT NULL DEFAULT 0,
    `totalCalificaciones` INTEGER NOT NULL DEFAULT 0,
    `tiempoEstimadoMin` INTEGER NOT NULL DEFAULT 15,
    `costoEnvio` INTEGER NOT NULL DEFAULT 2000,
    `envioMinimo` INTEGER NOT NULL DEFAULT 0,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `ownerId` INTEGER NOT NULL,
    `categoriaId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Producto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(150) NOT NULL,
    `descripcion` VARCHAR(500) NULL,
    `precio` INTEGER NOT NULL,
    `imagen` VARCHAR(500) NULL,
    `categoria` VARCHAR(100) NOT NULL,
    `disponible` BOOLEAN NOT NULL DEFAULT true,
    `restauranteId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PedidoItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cantidad` INTEGER NOT NULL DEFAULT 1,
    `precio` INTEGER NOT NULL,
    `pedidoId` INTEGER NOT NULL,
    `menuItemId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Usuarios` ADD CONSTRAINT `Usuarios_idRol_fkey` FOREIGN KEY (`idRol`) REFERENCES `Roles`(`idRol`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vehiculos` ADD CONSTRAINT `Vehiculos_idUsuario_fkey` FOREIGN KEY (`idUsuario`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Paradas` ADD CONSTRAINT `Paradas_idRuta_fkey` FOREIGN KEY (`idRuta`) REFERENCES `Rutas`(`idRuta`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pedidos` ADD CONSTRAINT `Pedidos_idCliente_fkey` FOREIGN KEY (`idCliente`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pedidos` ADD CONSTRAINT `Pedidos_idRepartidor_fkey` FOREIGN KEY (`idRepartidor`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pedidos` ADD CONSTRAINT `Pedidos_idComercio_fkey` FOREIGN KEY (`idComercio`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pedidos` ADD CONSTRAINT `Pedidos_idRuta_fkey` FOREIGN KEY (`idRuta`) REFERENCES `Rutas`(`idRuta`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pedidos` ADD CONSTRAINT `Pedidos_idVehiculo_fkey` FOREIGN KEY (`idVehiculo`) REFERENCES `Vehiculos`(`idVehiculos`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pedidos` ADD CONSTRAINT `Pedidos_negocioId_fkey` FOREIGN KEY (`negocioId`) REFERENCES `Negocios`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PedidoParadas` ADD CONSTRAINT `PedidoParadas_idPedido_fkey` FOREIGN KEY (`idPedido`) REFERENCES `Pedidos`(`idPedido`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PedidoParadas` ADD CONSTRAINT `PedidoParadas_idParada_fkey` FOREIGN KEY (`idParada`) REFERENCES `Paradas`(`idParada`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Calificaciones` ADD CONSTRAINT `Calificaciones_idPedido_fkey` FOREIGN KEY (`idPedido`) REFERENCES `Pedidos`(`idPedido`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Calificaciones` ADD CONSTRAINT `Calificaciones_idCalificador_fkey` FOREIGN KEY (`idCalificador`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Calificaciones` ADD CONSTRAINT `Calificaciones_idCalificado_fkey` FOREIGN KEY (`idCalificado`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversaciones` ADD CONSTRAINT `Conversaciones_idPedido_fkey` FOREIGN KEY (`idPedido`) REFERENCES `Pedidos`(`idPedido`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversaciones` ADD CONSTRAINT `Conversaciones_idCliente_fkey` FOREIGN KEY (`idCliente`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversaciones` ADD CONSTRAINT `Conversaciones_idRepartidor_fkey` FOREIGN KEY (`idRepartidor`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mensajes` ADD CONSTRAINT `Mensajes_idConversacion_fkey` FOREIGN KEY (`idConversacion`) REFERENCES `Conversaciones`(`idConversacion`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mensajes` ADD CONSTRAINT `Mensajes_idRemitente_fkey` FOREIGN KEY (`idRemitente`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pagos` ADD CONSTRAINT `Pagos_idUsuario_fkey` FOREIGN KEY (`idUsuario`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pagos` ADD CONSTRAINT `Pagos_idPedido_fkey` FOREIGN KEY (`idPedido`) REFERENCES `Pedidos`(`idPedido`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SuscripcionesRepartidor` ADD CONSTRAINT `SuscripcionesRepartidor_idUsuario_fkey` FOREIGN KEY (`idUsuario`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SuscripcionesRepartidor` ADD CONSTRAINT `SuscripcionesRepartidor_idPlan_fkey` FOREIGN KEY (`idPlan`) REFERENCES `PlanesRepartidor`(`idPlan`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IaRutasLog` ADD CONSTRAINT `IaRutasLog_idRuta_fkey` FOREIGN KEY (`idRuta`) REFERENCES `Rutas`(`idRuta`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Documentacion` ADD CONSTRAINT `Documentacion_idUsuario_fkey` FOREIGN KEY (`idUsuario`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notificaciones` ADD CONSTRAINT `Notificaciones_idUsuario_fkey` FOREIGN KEY (`idUsuario`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SesionesUsuario` ADD CONSTRAINT `SesionesUsuario_idUsuario_fkey` FOREIGN KEY (`idUsuario`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SolicitudesCambioVehiculo` ADD CONSTRAINT `SolicitudesCambioVehiculo_idVehiculo_fkey` FOREIGN KEY (`idVehiculo`) REFERENCES `Vehiculos`(`idVehiculos`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReportesPago` ADD CONSTRAINT `ReportesPago_idUsuario_fkey` FOREIGN KEY (`idUsuario`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Negocios` ADD CONSTRAINT `Negocios_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Negocios` ADD CONSTRAINT `Negocios_categoriaId_fkey` FOREIGN KEY (`categoriaId`) REFERENCES `CategoriasNegocio`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Producto` ADD CONSTRAINT `Producto_restauranteId_fkey` FOREIGN KEY (`restauranteId`) REFERENCES `Negocios`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PedidoItem` ADD CONSTRAINT `PedidoItem_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `Pedidos`(`idPedido`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PedidoItem` ADD CONSTRAINT `PedidoItem_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `Producto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

