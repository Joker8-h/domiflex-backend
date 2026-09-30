process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-domi';
const request = require('supertest');
const { app } = require('../index');
const jwt = require('jsonwebtoken');

jest.mock('../SERVICES/ChatService', () => ({
    getConversacionByPedido: jest.fn().mockImplementation((idPedido, idUsuario) => {
        if (idPedido === '999') throw new Error("Pedido no encontrado");
        return Promise.resolve({
            idConversacion: 10,
            idPedido: parseInt(idPedido),
            mensajes: [
                { idMensaje: 1, mensaje: 'Hola, voy saliendo del restaurante', remitente: 'Repartidor' }
            ]
        });
    }),
    enviarMensaje: jest.fn().mockImplementation((data) => {
        if (!data.mensaje) throw new Error("El mensaje no puede estar vacío");
        return Promise.resolve({
            idMensaje: 2,
            idConversacion: data.idConversacion,
            mensaje: data.mensaje,
            idRemitente: data.idRemitente
        });
    })
}));

const userToken = jwt.sign(
    { id: 10, email: 'cliente@domiflex.com', nombre: 'Juan Camilo', idRol: 3, rol: 'CLIENTE' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
);

describe('Pruebas de Rutas y Servicios - Chat de Pedidos', () => {

    it('GET /api/chat/pedido/:idPedido debería rechazar peticiones sin token', async () => {
        const response = await request(app).get('/api/chat/pedido/1');
        expect(response.status).toBe(401);
    });

    it('GET /api/chat/pedido/:idPedido debería retornar conversación con token válido', async () => {
        const response = await request(app)
            .get('/api/chat/pedido/1')
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('idConversacion', 10);
        expect(Array.isArray(response.body.mensajes)).toBe(true);
        expect(response.body.mensajes[0]).toHaveProperty('mensaje', 'Hola, voy saliendo del restaurante');
    });

    it('POST /api/chat/mensajes debería validar contenido del mensaje', async () => {
        const response = await request(app)
            .post('/api/chat/mensajes')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ idConversacion: 10, mensaje: '' });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
    });

    it('POST /api/chat/mensajes debería registrar y devolver el mensaje enviado', async () => {
        const response = await request(app)
            .post('/api/chat/mensajes')
            .set('Authorization', `Bearer ${userToken}`)
            .send({ idConversacion: 10, mensaje: 'Muchas gracias, quedo atento' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('idMensaje', 2);
        expect(response.body).toHaveProperty('mensaje', 'Muchas gracias, quedo atento');
    });
});
