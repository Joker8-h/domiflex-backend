const { createServer } = require("http");
const { Server } = require("socket.io");
const Client = require("socket.io-client");
const socketService = require('../SERVICES/SocketService');
const jwt = require("jsonwebtoken");

// JWT válido para simular al usuario que se conecta (Rol Admin)
const adminToken = jwt.sign(
    { id: 999, email: 'admin@sockets.com', nombre: 'AdminTest', idRol: 1, rol: 'ADMIN' },
    process.env.JWT_SECRET || 'secreto_super_seguro',
    { expiresIn: '10m' }
);

// Mocks a la Base de datos (Prisma) limitando la inserción de registro log de la Sesión y las notificaciones físicas
jest.mock('@prisma/client', () => {
    return {
        PrismaClient: jest.fn().mockImplementation(() => ({
            sesionesUsuario: {
                create: jest.fn().mockResolvedValue({ idSesion: 1 }),
                update: jest.fn().mockResolvedValue(true)
            },
            usuarios: {
                findMany: jest.fn().mockResolvedValue([{ idUsuarios: 999 }])
            }
        }))
    };
});
jest.mock('../SERVICES/NotificacionesService', () => ({
    crearNotificacion: jest.fn().mockResolvedValue(true)
}));

describe("Pruebas Unidad - Tiempo Real y Sockets", () => {
    let io, serverSocket, clientSocket;

    beforeAll((done) => {
        // Levantamos un servidor http exclusivamente para esta prueba (diferente al de producción)
        const httpServer = createServer();

        // 1. Inicializamos tu clase real en este servidor temporal
        socketService.init(httpServer);

        // Elegir un puerto libre al azar para que no choque con tu app
        httpServer.listen(() => {
            const port = httpServer.address().port;
            clientSocket = new Client(`http://localhost:${port}`, {
                auth: { token: adminToken }
            });
            clientSocket.on("connect", done);
        });
    });

    afterAll(() => {
        // Al terminar, cerramos limpieza de red para no gastar puertos
        if(clientSocket && clientSocket.connected) {
             clientSocket.disconnect();
        }
        if(socketService.io) {
             socketService.io.close();
        }
    });

    it("Debería conectar a un Cliente correctamente con un Token Valido y añadirlo a la lista de Online", (done) => {
        expect(clientSocket.connected).toBe(true);
        // Validamos que tu función del servicio lo haya registrado en memoria
        const online = socketService.getOnlineUsers();
        
        // Verifica que encontró el token descodificado midware (id: 999)
        expect(online.length).toBeGreaterThan(0);
        expect(online.some(user => user.id === 999)).toBe(true);
        
        done();
    });

    it("Debería recibir notificaciones en tiempo real para Administradores emitidas desde un controller", (done) => {
        // Escuchamos lo que le vaya a llegar
        clientSocket.on("user_connected", (data) => {
            expect(data).toHaveProperty("nombre", "Usuario Fantasma");
            done();
        });

        // Tu código usa notifyAdmins para emitir reportes globales a este canal ("user_connected", etc).
        // Llamaremos a notifyAdmins obligando su disparo.
        socketService.notifyAdmins("user_connected", {
            id: 888,
            nombre: "Usuario Fantasma",
            rol: "CLIENTE"
        });
    });
});
