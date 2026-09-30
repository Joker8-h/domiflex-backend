process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-domi';
const request = require('supertest');
const { app } = require('../index');
const jwt = require('jsonwebtoken');

jest.mock('../SERVICES/NegociosService', () => ({
    getAllAdmin: jest.fn().mockResolvedValue([
        { id: 1, nombre: 'Pizzería Popayán', activo: true, tipo: 'COMIDA' },
        { id: 2, nombre: 'Droguería La Estación', activo: false, tipo: 'FARMACIA' }
    ]),
    getAll: jest.fn().mockImplementation((filtros) => {
        const lista = [
            { id: 1, nombre: 'Pizzería Popayán', tipo: 'COMIDA' },
            { id: 3, nombre: 'Hamburguesas El Morro', tipo: 'COMIDA' }
        ];
        if (filtros?.tipo) {
            return Promise.resolve(lista.filter(n => n.tipo === filtros.tipo));
        }
        return Promise.resolve(lista);
    }),
    getById: jest.fn().mockImplementation((id) => {
        if (id === '999') throw new Error("Negocio no encontrado");
        return Promise.resolve({ id: parseInt(id), nombre: 'Pizzería Popayán', tipo: 'COMIDA' });
    }),
    update: jest.fn().mockImplementation((id, data, user) => {
        if (!data || Object.keys(data).length === 0) throw new Error("Datos requeridos");
        return Promise.resolve({ id: parseInt(id), ...data });
    })
}));

const adminToken = jwt.sign(
    { id: 1, email: 'admin@domiflex.com', nombre: 'Admin', idRol: 1, rol: 'ADMIN' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
);

const clienteToken = jwt.sign(
    { id: 3, email: 'cliente@domiflex.com', nombre: 'Cliente', idRol: 3, rol: 'CLIENTE' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
);

describe('Pruebas de Rutas y Servicios - Negocios', () => {

    it('GET /api/negocios debería listar los comercios públicos/activos', async () => {
        const response = await request(app).get('/api/negocios');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]).toHaveProperty('nombre', 'Pizzería Popayán');
    });

    it('GET /api/negocios/:id debería retornar 404 para un local inexistente', async () => {
        const response = await request(app).get('/api/negocios/999');
        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error');
    });

    it('GET /api/negocios/admin/todos debería ser accesible para ADMIN', async () => {
        const response = await request(app)
            .get('/api/negocios/admin/todos')
            .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(2);
    });

    it('GET /api/negocios/admin/todos debería denegar acceso a CLIENTE con 403', async () => {
        const response = await request(app)
            .get('/api/negocios/admin/todos')
            .set('Authorization', `Bearer ${clienteToken}`);

        expect(response.status).toBe(403);
    });

    it('PUT /api/negocios/:id debería actualizar el estado del negocio con ADMIN', async () => {
        const response = await request(app)
            .put('/api/negocios/1')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ activo: false });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('activo', false);
    });
});
