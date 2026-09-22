const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dns = require('dns').promises;
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
require('dotenv').config();

const prisma = new PrismaClient();
const notificacionesService = require("./NotificacionesService");

const JWT_SECRET = process.env.JWT_SECRET || "secreto_super_seguro";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || process.env.EXPIRE_TIME || "1d";
const FRONTEND_URL = process.env.FRONTEND_URL || "https://domiflex-web-production.up.railway.app";

const emailService = require("./EmailService");

/**
 * Valida que la contraseña cumpla con requisitos de seguridad
 * @param {string} password - Contraseña a validar
 * @returns {object} - { isValid: boleano, errors: string[] }
 */
function validarPasswordSegura(password) {
    const errors = [];

    if (!password) {
        errors.push("La contraseña es requerida.");
        return { isValid: false, errors };
    }

    // Mínimo 8 caracteres
    if (password.length < 8) {
        errors.push("La contraseña debe tener al menos 8 caracteres.");
    }

    // Máximo 128 caracteres (para evitar ataques DoS)
    if (password.length > 128) {
        errors.push("La contraseña no puede tener más de 128 caracteres.");
    }

    // Al menos una letra mayúscula
    if (!/[A-Z]/.test(password)) {
        errors.push("La contraseña debe contener al menos una letra mayúscula.");
    }

    // Al menos una letra minúscula
    if (!/[a-z]/.test(password)) {
        errors.push("La contraseña debe contener al menos una letra minúscula.");
    }

    // Al menos un número
    if (!/[0-9]/.test(password)) {
        errors.push("La contraseña debe contener al menos un número.");
    }

    // Al menos un carácter especial
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push("La contraseña debe contener al menos un carácter especial (!@#$%^&*()_+-=[]{}|;':\",./<>?).");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Valida si el dominio del correo tiene registros MX (servidores de correo activos)
 * @param {string} email - Correo a validar
 * @returns {Promise<boolean>} - True si tiene registros MX
 */
async function validarDominioCorreo(email) {
    try {
        const dominio = email.split('@')[1];
        if (!dominio) return false;

        const registros = await dns.resolveMx(dominio);
        return registros && registros.length > 0;
    } catch (error) {
        console.error(`[DNS-VALIDATION] El dominio no tiene registros MX o es inválido:`, error.message);
        return false;
    }
}

const authService = {
    async registrar(data) {
        const { email, password, nombre, telefono, rol, fotoPerfil, nombreEmergencia, numeroEmergencia } = data;

        console.log("DEBUG authService.registrar - fotoPerfil recibido:", fotoPerfil);
        console.log("DEBUG authService.registrar - Longitud de fotoPerfil:", fotoPerfil ? fotoPerfil.length : 0);

        // 1. Validar contraseña segura
        const validacionPassword = validarPasswordSegura(password);
        if (!validacionPassword.isValid) {
            throw new Error(`Contraseña no válida: ${validacionPassword.errors.join(" ")}`);
        }

        // 2. Verificar si el usuario ya existe
        const usuarioExiste = await prisma.usuarios.findUnique({
            where: { email },
        });

        if (usuarioExiste) {
            throw new Error("El usuario ya existe con ese correo electrónico.");
        }

        // 3. Validar verificación previa del email
        const verificacion = await prisma.emailVerificacion.findUnique({
            where: { email }
        });

        if (!verificacion || !verificacion.verificado) {
            throw new Error("El correo electrónico no ha sido verificado mediante OTP.");
        }

        // 2. Resolver el Rol (String -> ID)

        const rolesPublicos = ["CLIENTE", "REPARTIDOR", "COMERCIO"];
        const nombreRol = rolesPublicos.includes(String(rol || "").toUpperCase())
            ? String(rol).toUpperCase()
            : "CLIENTE";
        const rolDb = await prisma.roles.findUnique({
            where: { nombre: nombreRol }
        });

        if (!rolDb) {
            throw new Error("El rol solicitado no está disponible.");
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUsuario = await prisma.usuarios.create({
            data: {
                email,
                passwordHash,
                nombre,
                telefono,
                fotoPerfil,
                idRol: rolDb.idRol,
                estado: "ACTIVO",
                isEmailVerified: true,
                nombreEmergencia,
                numeroEmergencia
            },
            include: {
                rol: true
            }
        });

        console.log("DEBUG authService.registrar - Usuario creado. fotoPerfil guardado:", newUsuario.fotoPerfil);

        // NOTIFICACIÓN AUTOMÁTICA DE BIENVENIDA
        try {
            await notificacionesService.crearNotificacion({
                idUsuario: newUsuario.idUsuarios,
                titulo: "¡Bienvenido a MOVI!",
                mensaje: `Hola ${newUsuario.nombre}, gracias por registrarte. ¡Esperamos que disfrutes de tus pedidos!`,
                tipo: "SISTEMA"
            });
        } catch (notifError) {
            console.error("Error al crear notificación de bienvenida:", notifError.message);
        }

        // 5. Limpiar registro de verificación temporal
        try {
            await prisma.emailVerificacion.delete({ where: { email } });
        } catch (e) {
            console.error("Error al eliminar verificación temporal:", e.message);
        }

        // 6. Retornar sin password
        const { passwordHash: _, ...usuarioSinPassword } = newUsuario;
        return usuarioSinPassword;
    },

    async buscarPorEmailONombre(email, nombre) {
        let usuario = null;

        if (email) {
            usuario = await prisma.usuarios.findUnique({
                where: { email },
                include: { rol: true }
            });
        }

        if (!usuario && nombre) {
            usuario = await prisma.usuarios.findFirst({
                where: { nombre },
                include: { rol: true }
            });
        }

        if (!usuario) {
            return null;
        }

        const { passwordHash: _, ...usuarioSinPassword } = usuario;
        return usuarioSinPassword;
    },

    async iniciarSesion(email, password) {
        // Buscar usuario e incluir su Rol
        const usuario = await prisma.usuarios.findUnique({
            where: { email },
            include: { rol: true }
        });

        if (!usuario) {
            throw new Error("Credenciales inválidas.");
        }

        const passwordValida = await bcrypt.compare(
            password,
            usuario.passwordHash
        );

        if (!passwordValida) {
            throw new Error("Credenciales inválidas.");
        }

        if (usuario.estado !== "ACTIVO") {
            throw new Error("Usuario inactivo o suspendido.");
        }

        // Generar JWT
        const token = jwt.sign(
            {
                id: usuario.idUsuarios, // ID del usuario
                email: usuario.email,
                nombre: usuario.nombre, // Agregamos el nombre
                idRol: usuario.idRol,   // ID del rol (para middleware)
                rol: usuario.rol.nombre // Nombre del rol (para frontend)

            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        const { passwordHash: _, ...usuarioSinPassword } = usuario;

        return {
            usuario: usuarioSinPassword,
            token,
        };
    },

    async buscarPorNombre(nombre) {
        return await prisma.usuarios.findFirst({
            where: { nombre },
            include: { rol: true }
        });
    },

    async loginFacial(idUsuarios) {
        const usuario = await prisma.usuarios.findUnique({
            where: { idUsuarios: parseInt(idUsuarios) },
            include: { rol: true }
        });

        if (!usuario) {
            throw new Error("Usuario no encontrado.");
        }

        if (usuario.estado !== "ACTIVO") {
            throw new Error("Usuario inactivo o suspendido.");
        }

        const token = jwt.sign(
            {
                id: usuario.idUsuarios,
                email: usuario.email,
                nombre: usuario.nombre, // Agregamos el nombre
                idRol: usuario.idRol,
                rol: usuario.rol.nombre

            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        const { passwordHash: _, ...usuarioSinPassword } = usuario;

        return {
            usuario: usuarioSinPassword,
            token,
        };
    },

    async obtenerTodosUsuarios() {
        // Listar usuarios con el nombre de su rol
        const users = await prisma.usuarios.findMany({
            select: {
                idUsuarios: true,
                nombre: true,
                fotoPerfil: true,
                email: true,
                telefono: true,
                estado: true,
                creadoEn: true,
                rol: {
                    select: {
                        nombre: true,
                        idRol: true
                    }
                }
            },
            orderBy: {
                creadoEn: 'desc'
            }
        });
        return users;
    },

    /** Lista solo repartidores (excluye ADMIN) */
    async obtenerRepartidores() {
        return await prisma.usuarios.findMany({
            where: {
                rol: { nombre: 'REPARTIDOR' }
            },
            select: {
                idUsuarios: true,
                nombre: true,
                fotoPerfil: true,
                email: true,
                telefono: true,
                estado: true,
                creadoEn: true,
                rol: {
                    select: {
                        nombre: true,
                        idRol: true
                    }
                }
            },
            orderBy: {
                creadoEn: 'desc'
            }
        });
    },

    /** Lista solo clientes (excluye REPARTIDOR y ADMIN) */
    async obtenerClientes() {
        return await prisma.usuarios.findMany({
            where: {
                rol: { nombre: 'CLIENTE' }
            },
            select: {
                idUsuarios: true,
                nombre: true,
                fotoPerfil: true,
                email: true,
                telefono: true,
                estado: true,
                creadoEn: true,
                rol: {
                    select: {
                        nombre: true,
                        idRol: true
                    }
                }
            },
            orderBy: {
                creadoEn: 'desc'
            }
        });
    },

    async actualizarUsuario(id, data) {
        const { password, ...datosActualizar } = data; // Evitar actualizar password aquí directamente


        if (datosActualizar.rol && typeof datosActualizar.rol === 'string') {
            const rolDb = await prisma.roles.findUnique({ where: { nombre: datosActualizar.rol } });
            if (rolDb) {
                datosActualizar.idRol = rolDb.idRol;
            }
            delete datosActualizar.rol; // Borramos el string para que no choque con prisma
        }

        const usuarioActualizado = await prisma.usuarios.update({
            where: { idUsuarios: parseInt(id) },
            data: datosActualizar,
            select: {
                idUsuarios: true,
                nombre: true,
                email: true,
                telefono: true,
                estado: true,
                rol: true,
                nombreEmergencia: true,
                numeroEmergencia: true
            }
        });
        return usuarioActualizado;
    },

    async actualizarEstadoUsuario(id, estado) {
        const usuarioActualizado = await prisma.usuarios.update({
            where: { idUsuarios: parseInt(id) },
            data: { estado }, // El enum debe coincidir 'ACTIVO', 'INACTIVO', etc.
            select: {
                idUsuarios: true,
                nombre: true,
                email: true,
                estado: true
            }
        });

        // Si el estado cambió a ACTIVO, enviar notificación por correo
        if (estado === "ACTIVO" || estado === "activo") {
            try {
                await emailService.enviarNotificacionActivacion(usuarioActualizado.email, usuarioActualizado.nombre);
            } catch (emailError) {
                console.error("Error al enviar notificación de activación:", emailError.message);
            }
        } else if (estado === "INACTIVO" || estado === "inactivo" || estado === "SUSPENDIDO" || estado === "suspendido") {
            try {
                await emailService.enviarNotificacionDesactivacion(usuarioActualizado.email, usuarioActualizado.nombre);
            } catch (emailError) {
                console.error("Error al enviar notificación de desactivación:", emailError.message);
            }
        }

        return usuarioActualizado;
    },

    async eliminarUsuario(id) {
        const usuarioEliminado = await prisma.usuarios.delete({
            where: { idUsuarios: parseInt(id) }
        });
        return usuarioEliminado;
    },

    async obtenerUsuariosPorDiaSemana(dia) {
        const diasMapa = {
            'lunes': 0,
            'martes': 1,
            'miercoles': 2,
            'jueves': 3,
            'viernes': 4,
            'sabado': 5,
            'domingo': 6
        };

        let diaNum;
        if (isNaN(dia)) {
            const diaNormalizado = dia.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            diaNum = diasMapa[diaNormalizado];
        } else {
            diaNum = parseInt(dia);
        }

        if (diaNum === undefined || diaNum < 0 || diaNum > 6) {
            throw new Error("Día no válido. Use el nombre del día (ej. lunes) o un número del 0 (Lunes) al 6 (Domingo).");
        }

        // MySQL WEEKDAY() devuelve 0 para lunes, 1 para martes, ..., 6 para domingo
        const usuarios = await prisma.$queryRaw`
            SELECT u.idUsuarios, u.nombre, u.email, u.telefono, u.estado, u.creadoEn, r.nombre as rolNombre
            FROM Usuarios u
            JOIN Roles r ON u.idRol = r.idRol
            WHERE WEEKDAY(u.creadoEn) = ${diaNum}
        `;

        return usuarios;
    },

    async obtenerTodasLasFotos() {
        const usuarios = await prisma.usuarios.findMany({
            where: {
                fotoPerfil: { not: null }
            },
            select: {
                fotoPerfil: true
            }
        });
        return usuarios.map(u => u.fotoPerfil).filter(url => url !== null);
    },

    async buscarPorFoto(fotoUrl) {
        return await prisma.usuarios.findFirst({
            where: { fotoPerfil: fotoUrl },
            include: { rol: true }
        });
    },

    async obtenerUsuarioPorId(id) {
        const usuario = await prisma.usuarios.findUnique({
            where: { idUsuarios: parseInt(id) },
            include: { rol: true }
        });

        if (!usuario) {
            return null;
        }

        const { passwordHash: _, ...usuarioSinPassword } = usuario;
        return usuarioSinPassword;
    },

    async buscarGlobal(query) {
        return await prisma.usuarios.findMany({
            where: {
                OR: [
                    { nombre: { contains: query } },
                    { email: { contains: query } },
                    { documentacion: { numeroDocumento: { contains: query } } },
                    { vehiculos: { some: { placa: { contains: query } } } }
                ]
            },
            select: {
                idUsuarios: true,
                nombre: true,
                email: true,
                telefono: true,
                estado: true,
                creadoEn: true,
                rol: true,
                documentacion: {
                    select: {
                        numeroDocumento: true,
                        tipoDocumento: true,
                        estado: true
                    }
                },
                vehiculos: {
                    select: {
                        idVehiculos: true,
                        placa: true,
                        marca: true,
                        modelo: true
                    }
                }

            },
            orderBy: {
                nombre: 'asc'
            }
        });
    },

    async solicitarOtpPreRegistro(email) {
        // 1. Verificar si el usuario ya existe
        const usuarioExiste = await prisma.usuarios.findUnique({ where: { email } });
        if (usuarioExiste) {
            throw new Error("El correo ya está registrado.");
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 10 * 60 * 1000);

        await prisma.emailVerificacion.upsert({
            where: { email },
            update: { otpCode: otp, otpExpiry: expiry, verificado: false },
            create: { email, otpCode: otp, otpExpiry: expiry }
        });

        await emailService.enviarOtp(email, otp, "Usuario Nuevo");
        return { mensaje: "Código enviado a tu correo." };
    },

    async googleLogin(idToken) {
        try {
            // 1. Verificar el token de Google
            const ticket = await client.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID
            });
            const payload = ticket.getPayload();
            const { sub: googleId, email, name, picture } = payload;

            // 2. Buscar usuario por googleId
            let usuario = await prisma.usuarios.findUnique({
                where: { googleId },
                include: { rol: true }
            });

            // 3. Si no existe por googleId, buscar por email para vincular
            if (!usuario) {
                usuario = await prisma.usuarios.findUnique({
                    where: { email },
                    include: { rol: true }
                });

                if (usuario) {
                    // Vincular cuenta existente con Google
                    usuario = await prisma.usuarios.update({
                        where: { idUsuarios: usuario.idUsuarios },
                        data: { googleId, isEmailVerified: true },
                        include: { rol: true }
                    });
                } else {
                    // 4. Crear nuevo usuario si no existe
                    let rolDb = await prisma.roles.findUnique({
                        where: { nombre: "CLIENTE" }
                    });

                    if (!rolDb) {
                        rolDb = await prisma.roles.create({
                            data: { nombre: "CLIENTE" }
                        });
                    }

                    // Generar un passwordHash vacío o aleatorio para usuarios de Google
                    // No podrán loguearse con password a menos que usen "olvidé mi contraseña"
                    const temporaryPassword = Math.random().toString(36).slice(-10);
                    const salt = await bcrypt.genSalt(10);
                    const passwordHash = await bcrypt.hash(temporaryPassword, salt);

                    usuario = await prisma.usuarios.create({
                        data: {
                            email,
                            nombre: name,
                            googleId,
                            fotoPerfil: picture,
                            idRol: rolDb.idRol,
                            estado: "ACTIVO",
                            isEmailVerified: true,
                            passwordHash
                        },
                        include: { rol: true }
                    });

                    // Notificación de bienvenida
                    try {
                        await notificacionesService.crearNotificacion({
                            idUsuario: usuario.idUsuarios,
                            titulo: "¡Bienvenido a MOVI!",
                            mensaje: `Hola ${usuario.nombre}, gracias por registrarte con Google.`,
                            tipo: "SISTEMA"
                        });
                    } catch (nErr) {
                        console.error("Error notificación Google:", nErr.message);
                    }
                }
            }

            if (usuario.estado !== "ACTIVO") {
                throw new Error("Usuario inactivo o suspendido.");
            }

            // 5. Generar JWT de MOVI
            const token = jwt.sign(
                {
                    id: usuario.idUsuarios,
                    email: usuario.email,
                    nombre: usuario.nombre,
                    idRol: usuario.idRol,
                    rol: usuario.rol.nombre
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            const { passwordHash: _, ...usuarioSinPassword } = usuario;
            return { usuario: usuarioSinPassword, token };
        } catch (error) {
            console.error("Error Google Auth:", error.message);
            throw new Error("Error en la autenticación con Google");
        }
    },

    async googleLogin(idToken) {
        try {
            // 1. Verificar el token de Google
            const ticket = await client.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID
            });
            const payload = ticket.getPayload();
            const { sub: googleId, email, name, picture } = payload;

            // 2. Buscar usuario por googleId
            let usuario = await prisma.usuarios.findUnique({
                where: { googleId },
                include: { rol: true }
            });

            // 3. Si no existe por googleId, buscar por email para vincular
            if (!usuario) {
                usuario = await prisma.usuarios.findUnique({
                    where: { email },
                    include: { rol: true }
                });

                if (usuario) {
                    // Vincular cuenta existente con Google
                    usuario = await prisma.usuarios.update({
                        where: { idUsuarios: usuario.idUsuarios },
                        data: { googleId, isEmailVerified: true },
                        include: { rol: true }
                    });
                } else {
                    // 4. Crear nuevo usuario si no existe
                    let rolDb = await prisma.roles.findUnique({
                        where: { nombre: "CLIENTE" }
                    });

                    if (!rolDb) {
                        rolDb = await prisma.roles.create({
                            data: { nombre: "CLIENTE" }
                        });
                    }

                    // Generar un passwordHash vacío o aleatorio para usuarios de Google
                    const temporaryPassword = Math.random().toString(36).slice(-10);
                    const salt = await bcrypt.genSalt(10);
                    const passwordHash = await bcrypt.hash(temporaryPassword, salt);

                    usuario = await prisma.usuarios.create({
                        data: {
                            email,
                            nombre: name,
                            googleId,
                            fotoPerfil: picture,
                            idRol: rolDb.idRol,
                            estado: "ACTIVO",
                            isEmailVerified: true,
                            passwordHash
                        },
                        include: { rol: true }
                    });

                    // Notificación de bienvenida
                    try {
                        await notificacionesService.crearNotificacion({
                            idUsuario: usuario.idUsuarios,
                            titulo: "¡Bienvenido a MOVI!",
                            mensaje: `Hola ${usuario.nombre}, gracias por registrarte con Google.`,
                            tipo: "SISTEMA"
                        });
                    } catch (nErr) {
                        console.error("Error notificación Google:", nErr.message);
                    }
                }
            }

            if (usuario.estado !== "ACTIVO") {
                throw new Error("Usuario inactivo o suspendido.");
            }

            // 5. Generar JWT de MOVI
            const token = jwt.sign(
                {
                    id: usuario.idUsuarios,
                    email: usuario.email,
                    nombre: usuario.nombre,
                    idRol: usuario.idRol,
                    rol: usuario.rol.nombre
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            const { passwordHash: _, ...usuarioSinPassword } = usuario;
            return { usuario: usuarioSinPassword, token };
        } catch (error) {
            console.error("Error Google Auth:", error.message);
            throw new Error("Error en la autenticación con Google");
        }
    },

    async validarOtpPreRegistro(email, otp) {
        const registro = await prisma.emailVerificacion.findUnique({ where: { email } });

        if (!registro || registro.otpCode !== otp) {
            throw new Error("Código incorrecto.");
        }

        if (new Date() > registro.otpExpiry) {
            throw new Error("El código ha expirado.");
        }

        await prisma.emailVerificacion.update({
            where: { email },
            data: { verificado: true }
        });

        return { mensaje: "Correo verificado correctamente.", verificado: true };
    },

    async solicitarRecuperacionPassword(email) {
        const usuario = await prisma.usuarios.findUnique({ where: { email } });
        if (!usuario) {
            // Por seguridad, no decimos si el email existe o no
            return { mensaje: "Si el correo está registrado, recibirás un enlace de recuperación." };
        }

        const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

        await prisma.usuarios.update({
            where: { email },
            data: {
                resetToken: token,
                resetTokenExpiry: expiry
            }
        });

        const resetLink = `${FRONTEND_URL}/reset-password/${token}`;
        await emailService.enviarLinkRecuperacion(email, usuario.nombre, resetLink);

        return { mensaje: "Si el correo está registrado, recibirás un enlace de recuperación." };
    },

    async restablecerPassword(token, nuevaPassword) {
        const usuario = await prisma.usuarios.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: { gt: new Date() }
            }
        });

        if (!usuario) {
            throw new Error("El enlace es inválido o ha expirado.");
        }

        const validacion = validarPasswordSegura(nuevaPassword);
        if (!validacion.isValid) {
            throw new Error(validacion.errors.join(" "));
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(nuevaPassword, salt);

        await prisma.usuarios.update({
            where: { idUsuarios: usuario.idUsuarios },
            data: {
                passwordHash,
                resetToken: null,
                resetTokenExpiry: null
            }
        });

        return { mensaje: "Contraseña actualizada correctamente." };
    },

    async guardarFcmToken(idUsuario, token) {
        const limpio = String(token || "").trim();
        if (!limpio || limpio.length > 512) {
            throw new Error("Token de notificación inválido.");
        }
        await prisma.usuarios.update({
            where: { idUsuarios: parseInt(idUsuario) },
            data: { fcmToken: limpio },
        });
        return { mensaje: "Token de notificación guardado." };
    }
};

module.exports = authService;
