const SibApiV3Sdk = require('sib-api-v3-sdk');

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const EmailService = {
    /**
     * Envía un código OTP al correo del usuario
     * @param {string} email - Correo del destinatario
     * @param {string} otp - Código de 6 dígitos
     * @param {string} nombre - Nombre del usuario
     */
    async enviarOtp(emailDestino, otp, nombre) {
        try {
            const email = {
                sender: {
                    name: "MoviFlex verificacion",
                    email: process.env.EMAIL_USER || "no-reply@moviflex.com"
                },
                to: [{
                    email: emailDestino
                }],
                subject: "Verifica tu cuenta en MoviFlex",
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <img src="https://res.cloudinary.com/davda0bon/image/upload/v1741731600/TODO_MOVI_TRANSPARENTE.png" alt="MoviFlex Logo" style="width: 180px; max-width: 100%;">
                        </div>
                        <h2 style="color: #4acfbd; text-align: center;">Bienvenido a MoviFlex</h2>
                        <p>Hola <strong>${nombre}</strong>,</p>
                        <p>Gracias por registrarte en MoviFlex. Para completar tu registro y verificar tu correo electrónico, utiliza el siguiente código de verificación:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; background-color: #f8fafb; padding: 10px 20px; border-radius: 5px; border: 1px dashed #4acfbd;">
                                ${otp}
                            </span>
                        </div>
                        <p>Este código expirará en 10 minutos. Si no solicitaste este registro, puedes ignorar este mensaje.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #8899a6; text-align: center;">Este es un correo automático, por favor no respondas a este mensaje.</p>
                    </div>
                `
            };

            const result = await apiInstance.sendTransacEmail(email);
            console.log(`[EmailService] OTP enviado a ${emailDestino}. ID: ${result.messageId}`);
            return true;
        } catch (error) {
            console.error(`[EmailService] Error enviando OTP:`, error.message);
            throw new Error("No se pudo enviar el código de verificación por correo.");
        }
    },

    /**
     * Notifica al usuario que su cuenta ha sido activada
     * @param {string} emailDestino - Correo del destinatario
     * @param {string} nombre - Nombre del usuario
     */
    async enviarNotificacionActivacion(emailDestino, nombre) {
        try {
            const email = {
                sender: {
                    name: "MoviFlex",
                    email: process.env.EMAIL_USER || "no-reply@moviflex.com"
                },
                to: [{
                    email: emailDestino
                }],
                subject: "¡Tu cuenta en MoviFlex ha sido activada!",
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <img src="https://res.cloudinary.com/davda0bon/image/upload/v1741731600/TODO_MOVI_TRANSPARENTE.png" alt="MoviFlex Logo" style="width: 180px; max-width: 100%;">
                        </div>
                        <h2 style="color: #4acfbd; text-align: center;">¡Buenas noticias, ${nombre}!</h2>
                        <p>Nos complace informarte que tu cuenta en <strong>MoviFlex</strong> ha sido activada satisfactoriamente por nuestro equipo administrativo.</p>
                        <p>A partir de este momento, ya puedes iniciar sesión en la plataforma y comenzar a disfrutar de todos los servicios que tenemos para ti.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'https://domiflex-web-production.up.railway.app'}/login" style="background-color: #4acfbd; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Iniciar Sesión ahora</a>
                        </div>
                        <p>¡Gracias por confiar en nosotros!</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #8899a6; text-align: center;">MoviFlex Team</p>
                    </div>
                `
            };

            const result = await apiInstance.sendTransacEmail(email);
            console.log(`[EmailService] Notificación de activación enviada a ${emailDestino}. ID: ${result.messageId}`);
            return true;
        } catch (error) {
            console.error(`[EmailService] Error enviando notificación de activación:`, error.message);
            // No lanzamos error aquí para no bloquear el proceso de activación en la DB
            return false;
        }
    },

    /**
     * Notifica al administrador sobre un nuevo reporte de pago
     * @param {string} nombreRepartidor - Nombre del repartidor
     * @param {number} monto - Monto de la comisión esperada
     * @param {string} fotoComprobante - URL de la imagen del comprobante
     * @param {number|string} cantidadEnviada - Cantidad reportada por el repartidor
     */
    async enviarNotificacionReportePago(nombreRepartidor, monto, fotoComprobante, cantidadEnviada) {
        try {
            // Enviar al email del admin configurado
            const emailAdmin = process.env.ADMIN_EMAIL || process.env.EMAIL_USER || 'admin@moviflex.com';

            const email = {
                sender: {
                    name: "MoviFlex Pagos",
                    email: process.env.EMAIL_USER || "no-reply@moviflex.com"
                },
                to: [{
                    email: emailAdmin
                }],
                subject: `Nuevo Reporte de Pago - ${nombreRepartidor}`,
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <img src="https://res.cloudinary.com/davda0bon/image/upload/v1741731600/TODO_MOVI_TRANSPARENTE.png" alt="MoviFlex Logo" style="width: 180px; max-width: 100%;">
                        </div>
                        <h2 style="color: #4acfbd; text-align: center;">Nuevo Reporte de Pago</h2>
                        <p>Se ha recibido un nuevo comprobante de pago en la plataforma <strong>MoviFlex</strong>.</p>
                        <div style="background-color: #f8fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>Repartidor:</strong> ${nombreRepartidor}</p>
                            <p><strong>Monto Comisión (Esperado):</strong> $${Number(monto).toLocaleString()} COP</p>
                            <p><strong>Cantidad Enviada (Reportada):</strong> ${isNaN(Number(cantidadEnviada)) ? cantidadEnviada : '$' + Number(cantidadEnviada).toLocaleString() + ' COP'}</p>
                            <p><strong>Estado:</strong> <span style="color: #f39c12; font-weight: bold;">Pendiente de revisión</span></p>
                        </div>
                        <p><strong>Comprobante adjunto:</strong></p>
                        <div style="text-align: center; margin: 20px 0;">
                            <img src="${fotoComprobante}" alt="Comprobante de Pago" style="max-width: 100%; border-radius: 8px; border: 1px solid #ddd;">
                        </div>
                        <p>Ingresa al panel de administración para revisar y aprobar o rechazar este reporte.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'https://domiflex-web-production.up.railway.app'}/admin/reportes-pago" style="background-color: #4acfbd; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Ver Reportes de Pago</a>
                        </div>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #8899a6; text-align: center;">MoviFlex Team</p>
                    </div>
                `
            };

            const result = await apiInstance.sendTransacEmail(email);
            console.log(`[EmailService] Notificación de reporte de pago enviada. ID: ${result.messageId}`);
            return true;
        } catch (error) {
            console.error(`[EmailService] Error enviando notificación de reporte de pago:`, error.message);
            return false;
        }
    },

    /**
     * Notifica al usuario que su cuenta ha sido desactivada
     * @param {string} emailDestino - Correo del destinatario
     * @param {string} nombre - Nombre del usuario
     */
    async enviarNotificacionDesactivacion(emailDestino, nombre) {
        try {
            const email = {
                sender: {
                    name: "MoviFlex",
                    email: process.env.EMAIL_USER || "no-reply@moviflex.com"
                },
                to: [{
                    email: emailDestino
                }],
                subject: "Tu cuenta en MoviFlex ha sido suspendida/desactivada",
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <img src="https://res.cloudinary.com/davda0bon/image/upload/v1741731600/TODO_MOVI_TRANSPARENTE.png" alt="MoviFlex Logo" style="width: 180px; max-width: 100%;">
                        </div>
                        <h2 style="color: #e74c3c; text-align: center;">Aviso Importante, ${nombre}</h2>
                        <p>Te informamos que tu cuenta en <strong>MoviFlex</strong> ha sido desactivada o suspendida por nuestro departamento administrativo.</p>
                        <p>Si consideras que esto es un error, por favor ponte en contacto con nuestro equipo de soporte para aclarar la situación.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #8899a6; text-align: center;">MoviFlex Team</p>
                    </div>
                `
            };

            const result = await apiInstance.sendTransacEmail(email);
            console.log(`[EmailService] Notificación de desactivación enviada a ${emailDestino}. ID: ${result.messageId}`);
            return true;
        } catch (error) {
            console.error(`[EmailService] Error enviando notificación de desactivación:`, error.message);
            return false;
        }
    },

    /**
     * Envía recordatorio de pago al repartidor 5 días antes de fin de mes
     * @param {string} emailDestino - Correo del repartidor
     * @param {string} nombre - Nombre del repartidor
     * @param {number} montoComision - Monto pendiente
     * @param {number} diasRestantes - Días restantes para el fin de mes
     */
    async enviarRecordatorioPago(emailDestino, nombre, montoComision, diasRestantes) {
        try {
            const email = {
                sender: {
                    name: "MoviFlex Pagos",
                    email: process.env.EMAIL_USER || "no-reply@moviflex.com"
                },
                to: [{
                    email: emailDestino
                }],
                subject: `⚠️ Recordatorio de pago - Te quedan ${diasRestantes} días`,
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <img src="https://res.cloudinary.com/davda0bon/image/upload/v1741731600/TODO_MOVI_TRANSPARENTE.png" alt="MoviFlex Logo" style="width: 180px; max-width: 100%;">
                        </div>
                        <h2 style="color: #f39c12; text-align: center;">⚠️ Recordatorio de Pago</h2>
                        <p>Hola <strong>${nombre}</strong>,</p>
                        <p>Te recordamos que tienes una comisión pendiente por pagar en <strong>MoviFlex</strong>.</p>
                        <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f39c12;">
                            <p style="margin: 5px 0;"><strong>Comisión pendiente:</strong> $${Number(montoComision).toLocaleString()} COP</p>
                            <p style="margin: 5px 0;"><strong>Días restantes:</strong> <span style="color: #e74c3c; font-weight: bold;">${diasRestantes} días</span></p>
                        </div>
                        <p>⚠️ <strong>Importante:</strong> Si no envías el comprobante de pago antes de que termine el mes, tu cuenta será <strong>suspendida automáticamente</strong> y no podrás seguir ofreciendo pedidos.</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'https://domiflex-web-production.up.railway.app'}/repartidor-home" style="background-color: #4acfbd; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Enviar Comprobante Ahora</a>
                        </div>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #8899a6; text-align: center;">MoviFlex Team</p>
                    </div>
                `
            };

            const result = await apiInstance.sendTransacEmail(email);
            console.log(`[EmailService] Recordatorio de pago enviado a ${emailDestino}. ID: ${result.messageId}`);
            return true;
        } catch (error) {
            console.error(`[EmailService] Error enviando recordatorio de pago:`, error.message);
            return false;
        }
    },

    /**
     * Envía un enlace para recuperación de contraseña
     * @param {string} emailDestino - Correo del usuario
     * @param {string} nombre - Nombre del usuario
     * @param {string} link - URL de recuperación
     */
    async enviarLinkRecuperacion(emailDestino, nombre, link) {
        try {
            const email = {
                sender: {
                    name: "MoviFlex Soporte",
                    email: process.env.EMAIL_USER || "no-reply@moviflex.com"
                },
                to: [{
                    email: emailDestino
                }],
                subject: "Recuperación de contraseña - MoviFlex",
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <img src="https://res.cloudinary.com/davda0bon/image/upload/v1741731600/TODO_MOVI_TRANSPARENTE.png" alt="MoviFlex Logo" style="width: 180px; max-width: 100%;">
                        </div>
                        <h2 style="color: #4acfbd; text-align: center;">Recuperar Contraseña</h2>
                        <p>Hola <strong>${nombre}</strong>,</p>
                        <p>Has solicitado restablecer tu contraseña en MoviFlex. Haz clic en el siguiente botón para continuar:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${link}" style="background-color: #4acfbd; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Restablecer mi contraseña</a>
                        </div>
                        <p>Este enlace expirará en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.</p>
                        <p>Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
                        <p style="word-break: break-all; color: #8899a6; font-size: 13px;">${link}</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #8899a6; text-align: center;">MoviFlex Team</p>
                    </div>
                `
            };

            const result = await apiInstance.sendTransacEmail(email);
            console.log(`[EmailService] Link de recuperación enviado a ${emailDestino}. ID: ${result.messageId}`);
            return true;
        } catch (error) {
            console.error(`[EmailService] Error enviando link de recuperación:`, error.message);
            throw new Error("No se pudo enviar el correo de recuperación.");
        }
    }
};

module.exports = EmailService;
