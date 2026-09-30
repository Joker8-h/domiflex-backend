const { PrismaClient } = require('@prisma/client');

// Singleton PrismaClient para evitar agotar las conexiones de MySQL
const prisma = global.__domiflex_prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
    global.__domiflex_prisma = prisma;
}

module.exports = prisma;
