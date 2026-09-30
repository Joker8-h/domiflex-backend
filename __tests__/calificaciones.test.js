process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-domi';
const request = require('supertest');
const { app } = require('../index');
const jwt = require('jsonwebtoken');

jest.mock('../SERVICES/CalificacionesService', () => ({
    create: jest.fn().mockImplementation((data) => {
        const puntuacion = parseInt(data.puntuacion);
        if (!puntuacion || puntuacion < 1 || puntuacion > 5) {
            throw new Error("La puntuación debe ser entre 1 y 5");
        }
        return Promise.resolve({
            idCalificacion: 1,
            idPedido: parseInt(data.idPedido),
            idCalificador: data.idCalificador,
            idCalificado: parseInt(data.idCalificado),
            puntuacion,
            comentario: data.comentario || null
        });
    }),
    getPromedioUsuario: jest.fn().mockImplementation((idUsuario) => {
        return Promise.resolve({ promedio: 4.8, total: 25 });
    }),
    getTopRepartidores: jest.fn().mockResolvedValue([
        { idUsuario: 5, nombre: 'Carlos Repartidor', promedio: 4.9, total: 50 }
    ]),
    getTopClientes: jest.fn().mockResolvedValue([
        { idUsuario: 12, nombre: 'Ana Cliente', promedio: 5.0, total: 10 }
    ])
}));

const userToken = jwt.sign(
    { id: 10, email: 'cliente@domiflex.com', nombre: 'Juan Camilo', idRol: 3, rol: 'CLIENTE' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
);

describe('Pruebas de Rutas y Servicios - Calificaciones y Ratings', () => {

    it('POST /api/calificaciones debería crear calificación con valores válidos (1 a 5)', async () => {
        const response = await request(app)
            .post('/api/calificaciones')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                idPedido: 100,
                idCalificado: 5,
                puntuacion: 5,
                comentario: 'Excelente entrega a tiempo'
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('idCalificacion', 1);
        expect(response.body).toHaveProperty('puntuacion', 5);
        expect(response.body).toHaveProperty('comentario', 'Excelente entrega a tiempo');
    });

    it('POST /api/calificaciones debería rechazar calificaciones con puntuación inválida (>5)', async () => {
        const response = await request(app)
            .post('/api/calificaciones')
            .set('Authorization', `Bearer ${userToken}`)
            .send({
                idPedido: 100,
                idCalificado: 5,
                puntuacion: 10
            });

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/entre 1 y 5/i);
    });

    it('GET /api/calificaciones/:idUsuario/promedio debería retornar el promedio', async () => {
        const response = await request(app)
            .get('/api/calificaciones/5/promedio')
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('promedio');
        expect(response.body.promedio).toHaveProperty('promedio', 4.8);
        expect(response.body.promedio).toHaveProperty('total', 25);
    });

    it('GET /api/calificaciones/top-repartidores debería retornar la lista del ranking', async () => {
        const response = await request(app)
            .get('/api/calificaciones/top-repartidores')
            .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body[0]).toHaveProperty('promedio', 4.9);
    });
});
