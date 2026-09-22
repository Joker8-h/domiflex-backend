const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
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

  console.log("🌱 Sembrando usuarios y el local de demostración...");
  const hash = async (plain) => bcrypt.hash(plain, 10);
  const rolPorNombre = async (nombre) => prisma.roles.findUnique({ where: { nombre } });

  const cuentas = [
    { nombre: "Admin DomiFlex", email: "admin@domiflex.com", password: "Admin1234!", rol: "ADMIN" },
    { nombre: "Cliente Demo", email: "cliente@domiflex.com", password: "Cliente1234!", rol: "CLIENTE" },
    { nombre: "Saber Casero", email: "demo@domiflex.com", password: "Demo1234!", rol: "COMERCIO" },
  ];

  const usuarios = {};
  for (const cuenta of cuentas) {
    const rol = await rolPorNombre(cuenta.rol);
    const data = {
      nombre: cuenta.nombre,
      email: cuenta.email,
      passwordHash: await hash(cuenta.password),
      idRol: rol.idRol,
      estado: "ACTIVO",
    };
    usuarios[cuenta.rol] = await prisma.usuarios.upsert({
      where: { email: cuenta.email },
      update: { nombre: cuenta.nombre, idRol: rol.idRol, estado: "ACTIVO" },
      create: data,
    });
    console.log(`  ✅ ${cuenta.email}`);
  }

  const categoria = await prisma.categoriasNegocio.findUnique({ where: { nombre: "Restaurantes" } });
  const datosNegocio = {
    nombre: "Saber Casero Popayán",
    descripcion: "Comida típica payanesa para llevar.",
    tipo: "COMIDA",
    direccion: "Calle 5 #4-40, Centro, Popayán",
    latitud: 2.44192,
    longitud: -76.60629,
    telefono: "3000000000",
    imagen: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1200&q=80",
    costoEnvio: 2000,
    envioMinimo: 0,
    tiempoEstimadoMin: 25,
    activo: true,
    ownerId: usuarios.COMERCIO.idUsuarios,
    categoriaId: categoria?.id || null,
  };
  const existente = await prisma.negocios.findFirst({
    where: { nombre: datosNegocio.nombre, ownerId: usuarios.COMERCIO.idUsuarios },
  });
  const negocio = existente
    ? await prisma.negocios.update({ where: { id: existente.id }, data: { activo: true, costoEnvio: 2000 } })
    : await prisma.negocios.create({ data: datosNegocio });

  const platos = [
    { nombre: "Empanadas de pipián", precio: 3500, categoria: "Entradas", imagen: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80" },
    { nombre: "Bandeja payanesa", precio: 18000, categoria: "Platos", imagen: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80" },
    { nombre: "Sancocho de gallina", precio: 16000, categoria: "Platos", imagen: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80" },
    { nombre: "Salpicón", precio: 7000, categoria: "Bebidas", imagen: "https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=800&q=80" },
  ];

  for (const plato of platos) {
    const existente = await prisma.producto.findFirst({
      where: { nombre: plato.nombre, restauranteId: negocio.id },
    });
    if (!existente) {
      await prisma.producto.create({
        data: { ...plato, descripcion: plato.nombre, restauranteId: negocio.id, disponible: true },
      });
    }
  }
  console.log(`  ✅ ${negocio.nombre} con ${platos.length} productos`);

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
