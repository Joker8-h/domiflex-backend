const SibApiV3Sdk = require('sib-api-v3-sdk');

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const enviarCorreoContacto = async ({ nombre, correo, tipo, mensaje }) => {
  if (!process.env.BREVO_API_KEY) {
    console.warn(`[contactoService] BREVO_API_KEY no configurado. Mensaje simulado de ${nombre} (${correo})`);
    return { simulado: true };
  }

  const senderEmail = process.env.EMAIL_USER || "contacto@domiflex.com";
  const email = {
    sender: {
      name: "Formulario Web DomiFlex",
      email: senderEmail
    },
    to: [{
      email: senderEmail
    }],
    subject: `Nuevo mensaje - ${tipo}`,
    htmlContent: `
      <h2>Nuevo mensaje desde la web DomiFlex</h2>
      <p><strong>Nombre:</strong> ${nombre}</p>
      <p><strong>Correo:</strong> ${correo}</p>
      <p><strong>Tipo:</strong> ${tipo}</p>
      <p><strong>Mensaje:</strong></p>
      <p>${mensaje}</p>
    `
  };

  await apiInstance.sendTransacEmail(email);
};

module.exports = {
  enviarCorreoContacto
};