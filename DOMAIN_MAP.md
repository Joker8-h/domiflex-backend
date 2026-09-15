# DOMAIN_MAP — Moviflexx (viajes compartidos) → DomiFlex (domicilios)

Base duplicada intacta de `Joker8-h/BACKENDMOVI`. Este archivo es el contrato
de la adaptación. Fase 1 (no rompedora) ya aplicada: rename + seed + env.
Fase 2 renombra modelos y adapta controladores/servicios/rutas.

## Roles (`Roles` + `prisma/seed.js` ✅ adaptado)
| Moviflexx   | DomiFlex    |
|-------------|-------------|
| ADMIN       | ADMIN       |
| CONDUCTOR   | REPARTIDOR  |
| PASAJERO    | CLIENTE     |
| —           | COMERCIO (nuevo: restaurante/tienda que origina pedidos) |

## Núcleo de negocio (Fase 2)
| Moviflexx | DomiFlex | Notas |
|-----------|----------|-------|
| `Viajes` (cuposTotales/Disponibles, fechaHoraSalida, precio) | `Pedidos` (origen comercio → destino cliente, items, total, sin cupos) | Estados: `CREADO→ASIGNADO→RECOGIENDO→EN_CAMINO→ENTREGADO→CANCELADO` (reemplaza `EstadoViaje`) |
| `UsuarioViaje` (reserva de asientos, subida/bajada) | `PedidoDetalle` (cliente que pide + repartidor asignado + direcciones pickup/delivery) | `asientosReservados` → `cantidadItems`; `precioFinal/comisionPlataforma` se conservan |
| `ViajeTramos` (asientos por tramo) | `PedidoParadas` (multi-pedido: un repartidor, varias entregas) | Se calcula con `Optimizacion_Of_Rutas /segment-fares` |
| `Rutas` + `Paradas` | Se reutilizan tal cual | Una ruta = recorrido del repartidor; paradas = recogidas/entregas |
| `Vehiculos.capacidad` (pasajeros) | `capacidadKg` + tipo (moto/bici/carro) | `placaValidada` + `fotoPlaca` se conservan (IA placa) |

## Transversal (cambios menores Fase 2)
| Módulo | Cambio |
|--------|--------|
| `Pagos.TipoPago.VIAJE` | `PEDIDO`; `PLAN_CONDUCTOR` → `PLAN_REPARTIDOR` |
| `Pagos.EstadoPago.CONFIRMADO_PASAJERO/CONDUCTOR` | `CONFIRMADO_CLIENTE/REPARTIDOR` |
| `Conversaciones.idPasajero/idConductor` | `idCliente/idRepartidor` (+ `idComercio` opcional) |
| `PlanesConductor/SuscripcionesConductor` | `PlanesRepartidor/SuscripcionesRepartidor` (comisión por entrega) |
| `Calificaciones, Notificacion, Documentacion, IaRutasLog, ReportesPago, SesionesUsuario, EmailVerificacion, SolicitudCambioVehiculo` | Sin cambio estructural; solo textos/roles |
| `SERVICES/SocketService, CronJobs, PricingService, AiObjectRecognitionService, ReconocimientoService, CloudinaryService` | Sin cambio; `PricingService` + optimizer con `OSRM_BASE_URL` Colombia |

## Infra nueva (ya creada)
- OSRM: `arlysv/osrm-colombia` (build en curso) → `https://osrm-colombia-production.up.railway.app`
- Optimizer: `Joker8-h/Optimizacion_Of_Rutas` con `/route-options` (asignación) y `/segment-fares` (prorrateo)
- IAs facial/placa/objetos: se consumen por HTTP, no se duplican
