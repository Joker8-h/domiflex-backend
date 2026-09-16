const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const categoriasIniciales = [
  { nombre: "Restaurantes", icono: "🍔" },
  { nombre: "Farmacias", icono: "💊" },
  { nombre: "Supermercados", icono: "🛒" },
  { nombre: "Tiendas", icono: "🏪" },
  { nombre: "Paquetería", icono: "📦" },
  { nombre: "Electrónica", icono: "📱" },
  { nombre: "Ropa", icono: "👕" },
  { nombre: "Mascotas", icono: "🐕" },
];

async function main() {
  console.log("🌱 Iniciando seed de la base de datos...");

  // Seed de Roles (preservado de Fase 1)
  console.log("Creando roles...");
  const roles = [
    { nombre: "ADMIN" },
    { nombre: "REPARTIDOR" },
    { nombre: "CLIENTE" },
    { nombre: "COMERCIO" },
  ];

  for (const rol of roles) {
    const existingRole = await prisma.roles.findUnique({
      where: { nombre: rol.nombre },
    });

    if (!existingRole) {
      await prisma.roles.create({ data: rol });
      console.log(`  ✅ Rol creado: ${rol.nombre}`);
    } else {
      console.log(`  Rol ya existe: ${rol.nombre}`);
    }
  }

  console.log("🌱 Sembrando categorías de negocio...");
  for (const cat of categoriasIniciales) {
    await prisma.categoriasNegocio.upsert({
      where: { nombre: cat.nombre },
      update: {},
      create: cat,
    });
    console.log(`  ✅ ${cat.icono} ${cat.nombre}`);
  }

  console.log("✅ Seed completado exitosamente!");
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
