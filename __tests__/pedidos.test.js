process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-domi';
const request = require('supertest');
const { app } = require('../index');
const jwt = require('jsonwebtoken');

// 1. Mock de los servicios de pedidos y documentación (mismo estilo que vehiculos.test.js)
// Firmas reales de SERVICES/PedidosService.js (DomiFlex)
jest.mock('../SERVICES/PedidosService', () => ({
    getPedidosRepartidor: jest.fn().mockImplementation((idUsuario) => {
        if (idUsuario === 1) return Promise.resolve([{ idPedido: 100, dirEntrega: 'Calle 10 #20-30', estado: 'ASIGNADO' }]);
        return Promise.resolve([]);
    }),
    getMisPedidos: jest.fn().mockImplementation((idUsuario) => {
        if (idUsuario === 3) return Promise.resolve([{ idPedido: 101, dirEntrega: 'Carrera 5 #1-02', estado: 'CREADO' }]);
        return Promise.resolve([]);
    }),
    getById: jest.fn().mockImplementation((id) => {
        if (id === '999') return Promise.resolve(null);
        return Promise.resolve({ idPedido: id, estado: 'CREADO', total: 15000 });
    }),
    crearPedido: jest.fn().mockImplementation((idCliente, data) => {
        if (!data.dirEntrega) throw new Error("dirEntrega es obligatoria");
        return Promise.resolve({ idPedido: 200, estado: 'CREADO', tipoPago: 'EFECTIVO', idCliente, ...data });
    }),
    asignarRepartidor: jest.fn().mockImplementation((idPedido, idRepartidor) => {
        return Promise.resolve({ idPedido: parseInt(idPedido), idRepartidor, estado: 'ASIGNADO' });
    }),
    cambiarEstado: jest.fn().mockImplementation((idPedido, estado) => {
        const validos = ['ASIGNADO', 'RECOGIENDO', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO'];
        if (!validos.includes(estado)) throw new Error(`Estado inválido: ${estado}`);
        return Promise.resolve({ idPedido: parseInt(idPedido), estado });
    }),
    cancelarPedido: jest.fn().mockImplementation((idPedido) => {
        return Promise.resolve({ idPedido: parseInt(idPedido), estado: 'CANCELADO' });
    })
}));

jest.mock('../SERVICES/DocumentacionService', () => ({
    getByUsuarioId: jest.fn().mockImplementation((id) => {
        if (id === 2) return Promise.resolve({ estado: 'RECHAZADO' }); // Caso para rechazar
        return Promise.resolve({ estado: 'APROBADO' });
    })
}));

jest.mock('../SERVICES/PagosService', () => ({
    create: jest.fn().mockImplementation((data) => {
        if (!data.idPedido) throw new Error("idPedido es obligatorio");
        return Promise.resolve({ idPago: 300, estado: 'PENDIENTE', tipoPago: 'EFECTIVO', ...data });
    })
}));

// Generamos tokens válidos (roles DomiFlex)
const repartidorToken = jwt.sign(
    { id: 1, email: 'repartidor@test.com', nombre: 'Test', idRol: 2, rol: 'REPARTIDOR' },
    process.env.JWT_SECRET || 'secreto_super_seguro',
    { expiresIn: '1h' }
);

const repartidorRechazadoToken = jwt.sign(
    { id: 2, email: 'malo@test.com', nombre: 'Malo', idRol: 2, rol: 'REPARTIDOR' },
    process.env.JWT_SECRET || 'secreto_super_seguro',
    { expiresIn: '1h' }
);

const clienteToken = jwt.sign(
    { id: 3, email: 'cliente@test.com', nombre: 'Cliente', idRol: 3, rol: 'CLIENTE' },
    process.env.JWT_SECRET || 'secreto_super_seguro',
    { expiresIn: '1h' }
);

describe('Pruebas Estructurales de Validación - Pedidos (DomiFlex)', () => {

    it('Debería retornar los pedidos del repartidor (GET /api/pedidos/mis-pedidos)', async () => {
        const response = await request(app)
            .get('/api/pedidos/mis-pedidos')
            .set('Authorization', `Bearer ${repartidorToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body[0]).toHaveProperty('dirEntrega', 'Calle 10 #20-30');
    });

    it('No debería permitir crear un pedido a un usuario con documentación rechazada (POST /api/pedidos)', async () => {
        const response = await request(app)
            .post('/api/pedidos')
            .set('Authorization', `Bearer ${repartidorRechazadoToken}`)
            .send({ dirEntrega: 'Calle 1 #2-03' });

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatch(/documentación ha sido rechazada/i);
    });

    it('Debería crear un pedido con pago en EFECTIVO (POST /api/pedidos + POST /api/pagos)', async () => {
        const pedidoRes = await request(app)
            .post('/api/pedidos')
            .set('Authorization', `Bearer ${clienteToken}`)
            .send({ dirEntrega: 'Carrera 5 #1-02', total: 15000, tipoPago: 'EFECTIVO' });

        expect(pedidoRes.body).toHaveProperty('idPedido', 200);
        expect(pedidoRes.body).toHaveProperty('tipoPago', 'EFECTIVO');

        const pagoRes = await request(app)
            .post('/api/pagos')
            .set('Authorization', `Bearer ${clienteToken}`)
            .send({ idPedido: 200, monto: 15000, tipoPago: 'EFECTIVO' });

        expect(pagoRes.body).toHaveProperty('tipoPago', 'EFECTIVO');
        expect(pagoRes.body).toHaveProperty('idPedido', 200);
    });

    it('Debería asignar un repartidor al pedido (POST /api/pedidos/:id/asignar)', async () => {
        const response = await request(app)
            .post('/api/pedidos/200/asignar')
            .set('Authorization', `Bearer ${repartidorToken}`)
            .send({ idRepartidor: 1 });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Pedido asignado');
        expect(response.body.pedido).toHaveProperty('estado', 'ASIGNADO');
    });

    it('Debería cambiar el estado del pedido (POST /api/pedidos/:id/estado)', async () => {
        const response = await request(app)
            .post('/api/pedidos/200/estado')
            .set('Authorization', `Bearer ${repartidorToken}`)
            .send({ estado: 'EN_CAMINO' });

        expect(response.status).toBe(200);
        expect(response.body.pedido).toHaveProperty('estado', 'EN_CAMINO');
    });

    it('Debería cancelar el pedido (POST /api/pedidos/:id/cancelar)', async () => {
        const response = await request(app)
            .post('/api/pedidos/200/cancelar')
            .set('Authorization', `Bearer ${clienteToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message', 'Pedido cancelado');
        expect(response.body.pedido).toHaveProperty('estado', 'CANCELADO');
    });

    it('Debería poder consultar un pedido específico y mostrar si no existe (GET /api/pedidos/:id)', async () => {
        // Pedido que sí existe (id: 1)
        const responseOk = await request(app).get('/api/pedidos/1').set('Authorization', `Bearer ${repartidorToken}`);
        expect(responseOk.status).toBe(200);
        expect(responseOk.body).toHaveProperty('estado', 'CREADO');

        // Pedido que no existe (id: 999)
        const responseFail = await request(app).get('/api/pedidos/999').set('Authorization', `Bearer ${repartidorToken}`);
        expect(responseFail.status).toBe(200); // El controlador original devuelve res.json() (status 200 implícito)
        expect(responseFail.body).toHaveProperty('error', 'Pedido no encontrado');
    });
});
