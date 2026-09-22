const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class NegociosService {
  async getAll(filtros = {}) {
    const where = { activo: true };

    if (filtros.tipo) where.tipo = filtros.tipo;
    if (filtros.categoriaId) where.categoriaId = Number(filtros.categoriaId);
    if (filtros.busqueda) {
      where.OR = [
        { nombre: { contains: filtros.busqueda } },
        { descripcion: { contains: filtros.busqueda } },
      ];
    }

    return prisma.negocios.findMany({
      where,
      include: {
        categoria: true,
        _count: { select: { productos: true, pedidos: true } },
      },
      orderBy: { calificacion: "desc" },
    });
  }

  async getById(id) {
    const negocio = await prisma.negocios.findUnique({
      where: { id: Number(id) },
      include: {
        categoria: true,
        productos: { where: { disponible: true } },
        owner: {
          select: { idUsuarios: true, nombre: true, email: true, telefono: true },
        },
        _count: { select: { pedidos: true } },
      },
    });
    if (!negocio) throw new Error("Negocio no encontrado");
    return negocio;
  }

  async create(data, ownerId) {
    return prisma.negocios.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        tipo: data.tipo || "COMIDA",
        direccion: data.direccion,
        latitud: data.latitud,
        longitud: data.longitud,
        telefono: data.telefono,
        imagen: data.imagen,
        banner: data.banner,
        tiempoEstimadoMin: data.tiempoEstimadoMin || 15,
        costoEnvio: data.costoEnvio || 2000,
        envioMinimo: data.envioMinimo || 0,
        ownerId: ownerId,
        categoriaId: data.categoriaId || null,
      },
    });
  }

  rolDe(user) {
    const raw = user?.rol?.nombre || user?.rol;
    return String(raw || "").toUpperCase();
  }

  async assertPuedeEditar(id, user) {
    const negocio = await prisma.negocios.findUnique({ where: { id: Number(id) } });
    if (!negocio) throw new Error("Negocio no encontrado");
    if (this.rolDe(user) === "ADMIN") return negocio;
    if (negocio.ownerId !== Number(user?.id)) {
      const err = new Error("No puedes modificar este negocio.");
      err.status = 403;
      throw err;
    }
    return negocio;
  }

  async update(id, data, user) {
    await this.assertPuedeEditar(id, user);
    const permitidos = ["nombre", "descripcion", "tipo", "direccion", "latitud", "longitud", "telefono", "imagen", "banner", "tiempoEstimadoMin", "costoEnvio", "envioMinimo", "categoriaId", "activo"];
    const limpio = {};
    for (const campo of permitidos) {
      if (data[campo] !== undefined) limpio[campo] = data[campo];
    }
    return prisma.negocios.update({
      where: { id: Number(id) },
      data: limpio,
    });
  }

  async getMisNegocios(ownerId) {
    return prisma.negocios.findMany({
      where: { ownerId: Number(ownerId) },
      include: {
        categoria: true,
        _count: { select: { productos: true, pedidos: true } },
      },
    });
  }

  async getMenuGestion(negocioId, user) {
    await this.assertPuedeEditar(negocioId, user);
    return prisma.producto.findMany({
      where: { restauranteId: Number(negocioId) },
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
    });
  }

  async getProductos(negocioId) {
    await this.getById(negocioId);
    return prisma.producto.findMany({
      where: { restauranteId: Number(negocioId), disponible: true },
      orderBy: { categoria: "asc" },
    });
  }

  async getPorTipo(tipo) {
    return prisma.negocios.findMany({
      where: { tipo, activo: true },
      include: {
        categoria: true,
        _count: { select: { productos: true } },
      },
      orderBy: { calificacion: "desc" },
    });
  }
}

module.exports = new NegociosService();
