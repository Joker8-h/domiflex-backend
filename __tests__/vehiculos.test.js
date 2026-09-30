process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-domi';
const request = require('supertest');
const { app } = require('../index');
const jwt = require('jsonwebtoken');

jest.mock('../SERVICES/VehiculosService', () => ({
    create: jest.fn().mockImplementation((data) => {
        if (!data.marca) throw new Error("La marca es requerida");
        return Promise.resolve({ idVehiculos: 1, ...data });
    }),
    getById: jest.fn().mockImplementation((id) => {
        if (id === '999') return Promise.resolve(null);
        return Promise.resolve({ idVehiculos: id, marca: 'Toyota' });
    }),
    getSolicitudesCambio: jest.fn().mockResolvedValue([
        { id: 1, idVehiculo: 10, estado: 'PENDIENTE', motivo: 'Cambio de moto' }
    ])
}));
jest.mock('../SERVICES/CloudinaryService', () => ({
    subirImagen: jest.fn().mockResolvedValue('http://imagen.cloudinary.com/test.jpg')
}));

const testToken = jwt.sign(
    { id: 1, email: 'repartidor@test.com', nombre: 'Test', idRol: 2, rol: 'REPARTIDOR' },
    process.env.JWT_SECRET || 'secreto_super_seguro',
    { expiresIn: '1h' }
);

const adminToken = jwt.sign(
    { id: 99, email: 'admin@test.com', nombre: 'Admin', idRol: 1, rol: 'ADMIN' },
    process.env.JWT_SECRET || 'secreto_super_seguro',
    { expiresIn: '1h' }
);

describe('Pruebas Estructurales de Validación - Vehículos', () => {

    it('Debería retornar un error al faltar campos requeridos en la creación (POST /api/vehiculos)', async () => {
        const response = await request(app)
            .post('/api/vehiculos')
            .set('Authorization', `Bearer ${testToken}`)
            .send({
                modelo: "Avanza",
                placa: "XYZ123",
                capacidad: "4"
            });

        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/marca/i);
    });

    it('Debería obtener un vehículo usando Mock y obtener un 404 para uno que no existe', async () => {
        // 1. Test para un id que existe según mock
        const responseExitoso = await request(app)
            .get('/api/vehiculos/1')
            .set('Authorization', `Bearer ${testToken}`);
                
        expect(responseExitoso.status).toBe(200);
        expect(responseExitoso.body).toHaveProperty('marca', 'Toyota');

        // 2. Test para ID que no existe
        const responseFallido = await request(app)
            .get('/api/vehiculos/999') // El mock retorna null para id 999
            .set('Authorization', `Bearer ${testToken}`);
            
        expect(responseFallido.status).toBe(404);
        expect(responseFallido.body.error).toBe("Vehículo no encontrado");
    });

    it('Debería rechazar solicitudes de cambio pendientes a usuarios no-admin (403)', async () => {
        const res = await request(app)
            .get('/api/vehiculos/solicitudes/pendientes')
            .set('Authorization', `Bearer ${testToken}`);

        expect(res.status).toBe(403);
    });

    it('Debería permitir al ADMIN listar solicitudes pendientes sin ser interceptado por /:id (200)', async () => {
        const res = await request(app)
            .get('/api/vehiculos/solicitudes/pendientes')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0]).toHaveProperty('motivo', 'Cambio de moto');
    });
});
