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
    `estado` ENUM('ACTIVO', 'INACTIVO', 'SUSPENDIDO') NOT NULL DEFAULT 'ACTIVO',
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Usuarios_email_key`(`email`),
    PRIMARY KEY (`idUsuarios`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vehiculos` (
    `idVehiculos` INTEGER NOT NULL AUTO_INCREMENT,
    `idUsuario` INTEGER NOT NULL,
    `marca` VARCHAR(50) NULL,
    `modelo` VARCHAR(50) NULL,
    `placa` VARCHAR(20) NULL,
    `capacidad` INTEGER NOT NULL,
    `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',

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
    `tipo` ENUM('SUBIDA', 'BAJADA', 'AMBAS') NOT NULL DEFAULT 'AMBAS',

    PRIMARY KEY (`idParada`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Viajes` (
    `idViajes` INTEGER NOT NULL AUTO_INCREMENT,
    `idRuta` INTEGER NOT NULL,
    `idVehiculos` INTEGER NOT NULL,
    `fechaHoraSalida` DATETIME(3) NOT NULL,
    `cuposTotales` INTEGER NOT NULL,
    `cuposDisponibles` INTEGER NOT NULL,
    `estado` ENUM('CREADO', 'PUBLICADO', 'EN_CURSO', 'FINALIZADO', 'CANCELADO') NOT NULL DEFAULT 'CREADO',
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`idViajes`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `UsuarioViaje` (
    `idUsuarios` INTEGER NOT NULL,
    `idViajes` INTEGER NOT NULL,
    `idParadaSubida` INTEGER NOT NULL,
    `idParadaBajada` INTEGER NOT NULL,
    `asientosReservados` INTEGER NOT NULL DEFAULT 1,
    `distanciaRecorrida` DECIMAL(10, 2) NULL,
    `precioFinal` DECIMAL(10, 2) NULL,
    `estado` ENUM('RESERVADO', 'CANCELADO', 'COMPLETADO') NOT NULL DEFAULT 'RESERVADO',
    `creadoEn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`idUsuarios`, `idViajes`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ViajeTramos` (
    `idViaje` INTEGER NOT NULL,
    `idParadaInicio` INTEGER NOT NULL,
    `idParadaFin` INTEGER NOT NULL,
    `asientosTotales` INTEGER NOT NULL,
    `asientosOcupados` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`idViaje`, `idParadaInicio`, `idParadaFin`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Calificaciones` (
    `idCalificacion` INTEGER NOT NULL AUTO_INCREMENT,
    `idViaje` INTEGER NOT NULL,
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
    `idViaje` INTEGER NOT NULL,
    `idPasajero` INTEGER NOT NULL,
    `idConductor` INTEGER NOT NULL,
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
    `idUsuario` INTEGER NOT NULL,
    `monto` DECIMAL(10, 2) NULL,
    `tipoPago` ENUM('VIAJE', 'PLAN_CONDUCTOR') NOT NULL,
    `estado` ENUM('PENDIENTE', 'PAGADO', 'FALLIDO') NOT NULL,
    `fechaPago` DATETIME(3) NULL,

    PRIMARY KEY (`idPago`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlanesConductor` (
    `idPlan` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(50) NULL,
    `descripcion` VARCHAR(255) NULL,
    `tipo` ENUM('SEMANAL', 'MENSUAL', 'POR_VIAJE') NOT NULL,
    `precio` DECIMAL(10, 2) NULL,
    `maxViajes` INTEGER NULL,
    `porcentajeComision` DECIMAL(5, 2) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`idPlan`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SuscripcionesConductor` (
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
    `imagenFrontalUrl` VARCHAR(255) NULL,
    `imagenDorsalUrl` VARCHAR(255) NULL,
    `estado` ENUM('PENDIENTE', 'APROBADO', 'RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
    `fechaSubida` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `observaciones` VARCHAR(255) NULL,

    UNIQUE INDEX `Documentacion_idUsuario_key`(`idUsuario`),
    PRIMARY KEY (`idDocumentacion`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Usuarios` ADD CONSTRAINT `Usuarios_idRol_fkey` FOREIGN KEY (`idRol`) REFERENCES `Roles`(`idRol`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vehiculos` ADD CONSTRAINT `Vehiculos_idUsuario_fkey` FOREIGN KEY (`idUsuario`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Paradas` ADD CONSTRAINT `Paradas_idRuta_fkey` FOREIGN KEY (`idRuta`) REFERENCES `Rutas`(`idRuta`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Viajes` ADD CONSTRAINT `Viajes_idRuta_fkey` FOREIGN KEY (`idRuta`) REFERENCES `Rutas`(`idRuta`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Viajes` ADD CONSTRAINT `Viajes_idVehiculos_fkey` FOREIGN KEY (`idVehiculos`) REFERENCES `Vehiculos`(`idVehiculos`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsuarioViaje` ADD CONSTRAINT `UsuarioViaje_idUsuarios_fkey` FOREIGN KEY (`idUsuarios`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsuarioViaje` ADD CONSTRAINT `UsuarioViaje_idViajes_fkey` FOREIGN KEY (`idViajes`) REFERENCES `Viajes`(`idViajes`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsuarioViaje` ADD CONSTRAINT `UsuarioViaje_idParadaSubida_fkey` FOREIGN KEY (`idParadaSubida`) REFERENCES `Paradas`(`idParada`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UsuarioViaje` ADD CONSTRAINT `UsuarioViaje_idParadaBajada_fkey` FOREIGN KEY (`idParadaBajada`) REFERENCES `Paradas`(`idParada`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ViajeTramos` ADD CONSTRAINT `ViajeTramos_idViaje_fkey` FOREIGN KEY (`idViaje`) REFERENCES `Viajes`(`idViajes`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ViajeTramos` ADD CONSTRAINT `ViajeTramos_idParadaInicio_fkey` FOREIGN KEY (`idParadaInicio`) REFERENCES `Paradas`(`idParada`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ViajeTramos` ADD CONSTRAINT `ViajeTramos_idParadaFin_fkey` FOREIGN KEY (`idParadaFin`) REFERENCES `Paradas`(`idParada`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Calificaciones` ADD CONSTRAINT `Calificaciones_idViaje_fkey` FOREIGN KEY (`idViaje`) REFERENCES `Viajes`(`idViajes`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Calificaciones` ADD CONSTRAINT `Calificaciones_idCalificador_fkey` FOREIGN KEY (`idCalificador`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Calificaciones` ADD CONSTRAINT `Calificaciones_idCalificado_fkey` FOREIGN KEY (`idCalificado`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversaciones` ADD CONSTRAINT `Conversaciones_idViaje_fkey` FOREIGN KEY (`idViaje`) REFERENCES `Viajes`(`idViajes`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversaciones` ADD CONSTRAINT `Conversaciones_idPasajero_fkey` FOREIGN KEY (`idPasajero`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Conversaciones` ADD CONSTRAINT `Conversaciones_idConductor_fkey` FOREIGN KEY (`idConductor`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mensajes` ADD CONSTRAINT `Mensajes_idConversacion_fkey` FOREIGN KEY (`idConversacion`) REFERENCES `Conversaciones`(`idConversacion`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Mensajes` ADD CONSTRAINT `Mensajes_idRemitente_fkey` FOREIGN KEY (`idRemitente`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pagos` ADD CONSTRAINT `Pagos_idUsuario_fkey` FOREIGN KEY (`idUsuario`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SuscripcionesConductor` ADD CONSTRAINT `SuscripcionesConductor_idUsuario_fkey` FOREIGN KEY (`idUsuario`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SuscripcionesConductor` ADD CONSTRAINT `SuscripcionesConductor_idPlan_fkey` FOREIGN KEY (`idPlan`) REFERENCES `PlanesConductor`(`idPlan`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IaRutasLog` ADD CONSTRAINT `IaRutasLog_idRuta_fkey` FOREIGN KEY (`idRuta`) REFERENCES `Rutas`(`idRuta`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Documentacion` ADD CONSTRAINT `Documentacion_idUsuario_fkey` FOREIGN KEY (`idUsuario`) REFERENCES `Usuarios`(`idUsuarios`) ON DELETE RESTRICT ON UPDATE CASCADE;
