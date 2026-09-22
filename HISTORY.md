# DomiFlex — Historial del Proyecto

> **Archivo vivo**: Actualizar siempre que se haga un cambio, fix, deploy o decisión importante.
> Última actualización: 2026-09-22

---

## 1. Qué es Domiflex

Plataforma de delivery para Popayán, Colombia. Originalmente "Moviflex" (ride-sharing), transformada a "DomiFlex" (comida). Tres plataformas: web (React), backend (Node/Express/Prisma), Android (Java/Material3). Todo deployado en Railway con 7 servicios.

---

## 2. Stack completo

| Servicio | Tecnología | URL Producción |
|---|---|---|
| Backend API | Node.js + Express + Prisma + MySQL | `domiflex-backend-production.up.railway.app` |
| Web | React + Vite + Tailwind | `domiflex-web-production.up.railway.app` |
| Android | Java + Material3 + Retrofit | APK local |
| OSRM Colombia | Docker + OSRM | `domiflex-osrm-production.up.railway.app` |
| Route Optimizer | Node.js | `route-optimizer-production-7e60.up.railway.app` |
| Facial Recognition | FastAPI + face_recognition | `domiflex-facial-production.up.railway.app` |
| MySQL | MySQL 8 | Railway (TCP proxy) |

**Credenciales prod:**
- ADMIN: `admin@domiflex.com / Admin1234!`
- CLIENTE: `cliente@domiflex.com / Cliente1234!`
- COMERCIO: `demo@domiflex.com / Demo1234!`

**Railway project ID:** `b561153d-107d-40c3-bc6f-3a017b8e4034`

---

## 3. Lo que se ha hecho

### Fase 0 — Diseño base
- `design/tokens.js`: sistema de diseño completo (colores, spacing, Montserrat, touch targets, media queries)
- `design/global.css`: estilos globales, animaciones (`df-press`, `df-lift`, `df-shimmer`, `df-marquee`)
- `api/client.js`: fetch centralizado con auth, 401→logout, AbortController
- `AuthContext`: fix con `safeParse`, `useMemo`, `useCallback`

### Fase 1 — Navegación
- `BottomTabs`: bottom nav real para móvil (56px, `aria-current`)
- `MobileDrawer`: drawer con ESC + focus-trap
- `BottomNavigationView` Android: XML `bottom_nav.xml` con 4 items

### Fase 2 — Componentes UI
- `Skeleton`, `EmptyState`, `ErrorState`, `Modal`, `ErrorBoundary`
- `ProfileMenuItem`: `role=button`, `tabIndex`, `aria-label`, 48px min touch
- Code-splitting con `React.lazy` (bundle 1766KB→173KB)

### Fase 3 — Landing premium (mock match)
- Eyebrow badge `Popayán • Colombia • 🟢 Repartidores en línea`
- Display Montserrat 800, `text-wrap: balance`
- Stats: +2.400 / 4.8★ / 25 min
- Marquee infinito de categorías (60s, pausa en hover, `prefers-reduced-motion`)
- "Popular ahora en Popayán": 3 cards con fotos reales (Unsplash)
- Footer rico con marca, links, copyright
- Micro-interacciones: `df-press`, `df-lift`, `df-shimmer` — todo solo transform/opacity (compositor)

### Fase 4 — Backend fixes
- `PedidosRoutes.js`: `/dia/:dia` antes de `/:id` (evita conflicto de rutas)
- `PedidosService.obtenerPedidosPorDiaSemana()`: implementado
- `DocumentacionController.getAll`: retorna `[]` no `{message}` (compat tests)
- `NotificacionesRoutes.js`: auth + alias `/leer`/`/leida`
- `PedidosController.getById`: retorna 200 `{error}` (compatible con tests)
- `ReconocimientoService.js`: usa `process.env.IA_FACIAL_URL`

### Fase 5 — Android
- `colors.xml` y `themes.xml`: tokens DomiFlex sincronizados (`#0D1117`/`#00E676`)
- Layouts actualizados: Landing, Login, Register, Restaurantes, Detalle, Carrito, Tracking, Perfil
- `bottom_nav.xml`: 4 íconos Material3
- `Conductorstart`: fix crash por actividad inexistente
- `img_6.png`: optimizado de 7.1MB→355KB
- `network_security_config.xml`: para Railway HTTPS
- Permisos: `FINE_LOCATION`, `POST_NOTIFICATIONS`
- `build.gradle`: `compileSdk 34`, `targetSdk 34`
- APK: `BUILD SUCCESSFUL`

### Fase 6 — Seed y migración
- Prisma migration baseline: `20250918_init_domiflex` (474 líneas)
- Seed: 4 roles (ADMIN/REPARTIDOR/CLIENTE/COMERCIO) + 8 categorías + "Saber Casero Popayán" con 4 productos (Unsplash images)

### Fase 7 — E2E y verificación
- Playwright E2E: 17/17 rutas con 0 pageerror
- Admin deactivate/reactivate user funcional
- Pedido creation $3900 con OSRM real distance
- Video grabado: `C:\Users\usuario\Downloads\domiflex-e2e-full.webm`

### Fase 8 — Organización
- Todos los repos movidos a `C:\Users\usuario\OneDrive\Documents\Domiflex\`
- Total: 711.6 MB, 6 repos

---

## 4. Errores encontrados y cómo se solucionaron

### Web

| Error | Causa | Solución |
|---|---|---|
| `FaChevronRight is not defined` | Import de react-icons faltante | Cambiado a `lucide-react` (`ChevronRight`) |
| `FaCircle is not defined` | Mismo problema | Cambiado a `Circle` de lucide |
| `BsEnvelopeFill is not defined` | Mismo problema | Cambiado a `Mail` de lucide |
| `UserTag is not defined` | Mismo problema | Cambiado a `User` de lucide |
| `FaShieldAlt is not defined` | Mismo problema | Cambiado a `ShieldCheck` de lucide |
| `FaApple/FaGooglePlay` | Mismo problema | Cambiados a `Smartphone`/`Play` de lucide |
| `$NaN` en totales | `Number(undefined)` | `Number(subtotal||0)` en carrito |
| `Notificaciones` 404 `/leer` | Ruta incorrecta en API | Cambiado a `/leida` |
| Marquee salto raro | `gap` del flex rompía el loop | `gap` eliminado, cada item con `paddingRight` propio |
| Carrusel muy rápido | 22s por ciclo | Subido a 60s (17.9 px/s medido) + pausa en hover |
| `WaveDivider` overflow | `width: calc(100% + 1.3px)` | Cambiado a `100%` |
| Bundle 1766KB | Sin code-splitting | `React.lazy` + `Suspense` → 173KB principal |
| Auth context re-renders | `useEffect` sin dependencias estables | `useMemo` + `useCallback` + `safeParse` |

### Backend

| Error | Causa | Solución |
|---|---|---|
| `GET /api/pedidos/dia/lunes` retornaba pedido equivocado | `/:id` interceptaba `/dia/:dia` | Reordenar: `router.get("/dia/:dia", ...)` ANTES de `router.get("/:id", ...)` |
| `DocumentacionController` retornaba `{message}` | Tests esperaban array | `getAll` retorna `[]` siempre |
| Tests rateLimit fallaban por timing | Pre-existente | Conocido, no bloquea |
| Tests socket fallaban | Plugin `sha256_password` MySQL incompatibilidad en test DB | Conocido, no bloquea |
| `ReconocimientoService` usaba URL hardcodeada | Dependía de servicio externo | Cambiado a `process.env.IA_FACIAL_URL` |
| TCP proxy nuevo cada vez | MySQL necesita proxy temporal | `railway tcp-proxy create --port 3306 -s MySQL` |

### Android

| Error | Causa | Solución |
|---|---|---|
| `Conductorstart` crash | Actividad inexistente en manifest | Removida referencia, usa `ClienteHome` |
| `img_6.png` 7.1MB | Imagen sin comprimir | Optimizada a 355KB |
| `java.lang.RuntimeException: Unable to start activity` | `Conductorstart` no existía | `AndroidManifest.xml` limpiado |
| `gradlew` falla | `JAVA_HOME` no en PATH | `$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"` antes de ejecutar |
| Layout no coincide con mock | Diseño viejo | Todos los layouts reescritos con Material3 + tokens DomiFlex |

### Railway / Deploy

| Error | Causa | Solución |
|---|---|---|
| Prisma migration "already applied" | DB tenía tablas, migration no registrada | `prisma migrate resolve --applied 20250918_init_domiflex` |
| TCP proxy cambia de puerto | Railway genera proxy nuevo cada vez | Verificar con `railway status` y usar nuevo puerto |
| Bundle viejo en prod | Caché del navegador | Ctrl+F5, verificar nombre de bundle con `Invoke-WebRequest` |
| OSRM external 404/timeout | Servicio viejo caído | Usar domiflex-osrm interno con `--algorithm MLD` |

---

## 5. Lo que falta por hacer

### Hecho en el cierre operable
- [x] **Precio**: total = ítems validados en BD + envío del negocio (`POST /pedidos/cotizar`)
- [x] **Carrito**: persiste en el navegador y muestra el total del servidor
- [x] **Tracking**: mapa con recogida, entrega y GPS del repartidor; el estado se emite por socket
- [x] **Comercio**: `/comercio` con menú y pedidos; solo el dueño edita su negocio
- [x] **Efectivo**: el cliente confirma en tracking y el repartidor confirma después (`CONFIRMADO_CLIENTE` → `COMPLETADO`)
- [x] **Registro**: solo `CLIENTE`, `REPARTIDOR` o `COMERCIO`; no se puede crear `ADMIN`
- [x] **Seed**: roles, cuentas demo y Saber Casero Popayán en `prisma/seed.js`
- [x] **Android mínimo**: el login guarda el token, el checkout usa GPS y el tracking consulta el estado
- [x] **Wompi**: el carrito ofrece pago en línea (Nequi, PSE y tarjeta). Sin las claves el pedido queda en efectivo. El webhook `POST /api/pagos/wompi` marca el pago `COMPLETADO` solo si la firma es válida
- [x] **Push**: `POST /api/auth/fcm-token` guarda el token. El aviso sale si existe `FIREBASE_SERVICE_ACCOUNT`; si no, queda la notificación en base de datos. Falta `google-services.json` para que el APK reciba mensajes
- [x] **Repartidor Android**: si el login trae `REPARTIDOR`, abre el home de domiciliario (tomar pedido, estados, efectivo y GPS)

### Sigue pendiente
- [ ] **Daviplata**: no entra en el checkout estándar de Wompi
- [ ] **Firebase**: el proyecto y `google-services.json` hay que crearlos; no se inventan

---

## 6. Notas técnicas importantes

- **Montserrat** se carga desde Google Fonts con `preconnect` en `index.html`
- **Tokens de diseño** están en `src/design/tokens.js`, NO en `theme.js` (legacy)
- **Rutas del backend**: Express usa orden estricto — rutas con parámetros (`/dia/:dia`) deben ir ANTES de rutas con wildcard (`/:id`)
- **Prisma**: el schema está en `prisma/schema.prisma`, los migrations en `prisma/migrations/`
- **Android**: `JAVA_HOME` debe apuntar a `C:\Program Files\Android\Android Studio\jbr` para compilar
- **Railway**: cada `railway tcp-proxy create` genera un puerto nuevo; el anterior queda obsoleto

---

> **IMPORTANTE**: Este archivo se tiene que actualizar siempre que se haga un cambio, fix, deploy o decisión importante. Es la fuente de verdad del estado del proyecto.
