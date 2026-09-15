const request = require('supertest');
const { app, server } = require('../index');

describe('Pruebas de Seguridad en Endpoints (Sin afectar la DB)', () => {

    afterAll((done) => {

        done();
    });
    const endpointsProtegidos = [
        // Rutas de Vehículos
        { method: 'get', url: '/api/vehiculos/mis-vehiculos' },
        { method: 'post', url: '/api/vehiculos' },
        { method: 'put', url: '/api/vehiculos/1' },
        { method: 'delete', url: '/api/vehiculos/1' },

        // Rutas de Pedidos (DomiFlex)
        { method: 'post', url: '/api/pedidos' },
        { method: 'get', url: '/api/pedidos/mis-pedidos' },
        { method: 'post', url: '/api/pedidos/1/asignar' },
        { method: 'post', url: '/api/pedidos/1/estado' },
        { method: 'post', url: '/api/pedidos/1/cancelar' },

        // Rutas de Rutas
        { method: 'post', url: '/api/rutas' },
        { method: 'get', url: '/api/rutas/mis-rutas' },

        // Rutas de Pedido-Paradas
        { method: 'post', url: '/api/pedido-paradas' },
        { method: 'get', url: '/api/pedido-paradas/pedido/1' },

        // Rutas de Calificaciones
        { method: 'post', url: '/api/calificaciones' },

        // Rutas de Chat
        { method: 'get', url: '/api/chat/mensajes/1/2' },

        // Rutas Auth y roles (Administración)
        { method: 'get', url: '/api/auth' },
        { method: 'get', url: '/api/auth/repartidores' },
        { method: 'get', url: '/api/auth/clientes' },

        // Documentación
        { method: 'get', url: '/api/documentacion/mis-documentos' }
    ];

    it.each(endpointsProtegidos)(
        'Debería bloquear la ruta $method $url si no se envía un Token de Autenticación',
        async ({ method, url }) => {
            const response = await request(app)[method](url);

            // Verificamos que devuelva 401 (Unauthorized) asegurando que no tocó base de datos
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('mensaje');
            expect(response.body.mensaje).toMatch(/Acceso denegado/i);
        }
    );
});
