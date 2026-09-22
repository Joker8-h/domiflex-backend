const axios = require('axios');
const FormData = require('form-data');

const aiObjectRecognitionService = {
    // URL del servidor Python (ajustar según configuración)
    get AI_LICENSE_URL() {
        let url = process.env.AI_LICENSE_URL || process.env.IA_OBJETOS_URL || "";
        if (url && !url.startsWith('http')) {
            url = 'https://' + url;
        }
        // Si la URL no termina en /predict, se añade (a menos que ya tenga otra ruta)
        if (url && !url.includes('/predict') && !url.includes('/verificar-')) {
            url = url.endsWith('/') ? url + 'predict' : url + '/predict';
        }
        return url;
    },
    get AI_PLATE_URL() {
        let url = process.env.AI_PLATE_URL || process.env.IA_PLACA_URL || "";
        if (url && !url.startsWith('http')) {
            url = 'https://' + url;
        }
        // Si la URL no termina en /verificar-placa, se añade
        if (url && !url.includes('/verificar-placa')) {
            url = url.endsWith('/') ? url + 'verificar-placa' : url + '/verificar-placa';
        }
        return url;
    },

    /**
     * Envía una imagen para verificar su autenticidad (Licencia) y extraer datos.
     */
    async verificarAutenticidad(imageUrl) {
        try {
            console.log(`[AI-BRIDGE] Descargando imagen desde Cloudinary para Licencia: ${imageUrl}`);
            const responseImage = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            console.log(`[AI-BRIDGE] Imagen descargada exitosamente (${responseImage.data.length} bytes). Enviando a servicio Python...`);
            const buffer = Buffer.from(responseImage.data, 'binary');

            const form = new FormData();
            form.append('file', buffer, { filename: 'license_image.jpg', contentType: 'image/jpeg' });

            console.log(`[AI-BRIDGE] URL de IA: ${this.AI_LICENSE_URL}`);
            const aiResponse = await axios.post(this.AI_LICENSE_URL, form, {
                headers: { ...form.getHeaders() }
            });

            const { is_fully_equipped, detected_items, missing_items, data, message } = aiResponse.data;

            return {
                sospecha_fraude: !is_fully_equipped,
                confianza: is_fully_equipped ? 0.98 : 0.45,
                detalles: message,
                detected_items,
                missing_items,
                extracted_data: data || {},
                error: false
            };
        } catch (error) {
            console.error("[AI-BRIDGE] Error en validación de licencia:", error.message);
            return { sospecha_fraude: false, confianza: 0, error: true, extracted_data: {} };
        }
    },

    get AI_PLATE_URL_URL() {
        // Obtenemos la URL base (que podría terminar en /verificar-placa o similar)
        let url = process.env.AI_PLATE_URL || process.env.IA_PLACA_URL || "";
        console.log(`[AI-BRIDGE-DEBUG] Raw process.env.AI_PLATE_URL: ${url}`);

        // Extraemos solo el dominio/base
        let baseUrl = url.split('/verificar-placa')[0];
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

        if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl;

        return `${baseUrl}/verificar-placa-url`;
    },

    /**
     * Envía una imagen para detectar placa y extraer texto vía OCR.
     * Ahora optimizado para enviar la URL directamente a la IA.
     */
    async verificarPlaca(imageUrl) {
        try {
            const finalUrl = this.AI_PLATE_URL_URL;
            console.log(`[AI-BRIDGE] Verificando placa vía URL: ${imageUrl}`);
            console.log(`[AI-BRIDGE] Llamando a endpoint de IA: ${finalUrl}`);

            const aiResponse = await axios.post(finalUrl, {
                image_url: imageUrl
            });

            const { is_detected, plate_text, detections, message } = aiResponse.data;

            return {
                is_detected,
                plate_text: plate_text || null,
                confianza: is_detected ? 0.95 : 0,
                detalles: message,
                error: false
            };
        } catch (error) {
            console.error("[AI-BRIDGE] Error detallado en validación de placa:");
            if (error.response) {
                // El servidor respondió con un estatus fuera del rango 2xx
                console.error(" - Status:", error.response.status);
                console.error(" - Data:", error.response.data);
            } else if (error.request) {
                // El request se hizo pero no hubo respuesta
                console.error(" - No hubo respuesta del servidor (Request enviado)");
            } else {
                // Algo pasó al configurar la petición
                console.error(" - Error Message:", error.message);
            }
            return { is_detected: false, plate_text: null, confianza: 0, error: true, message: error.message };
        }
    }
};

module.exports = aiObjectRecognitionService;
