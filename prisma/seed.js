const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed de la base de datos...');

    // Seed de Roles
    console.log('Creando roles...');

    const roles = [
        { nombre: 'ADMIN' },
        { nombre: 'REPARTIDOR' },
        { nombre: 'CLIENTE' },
        { nombre: 'COMERCIO' }
    ];

    for (const rol of roles) {
        const existingRole = await prisma.roles.findUnique({
            where: { nombre: rol.nombre }
        });

        if (!existingRole) {
            await prisma.roles.create({
                data: rol
            });
            console.log(` Rol creado: ${rol.nombre}`);
        } else {
            console.log(`  Rol ya existe: ${rol.nombre}`);
        }
    }

    console.log(' Seed completado exitosamente!');
}

main()
    .catch((e) => {
        console.error('❌ Error en el seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
