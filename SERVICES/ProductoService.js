const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class ProductoService {
  async getByNegocio(negocioId) {
    return prisma.producto.findMany({
      where: { restauranteId: Number(negocioId), disponible: true },
      orderBy: { categoria: "asc" },
    });
  }

  async getById(id) {
    const producto = await prisma.producto.findUnique({
      where: { id: Number(id) },
      include: { restaurante: true },
    });
    if (!producto) throw new Error("Producto no encontrado");
    return producto;
  }

  rolDe(user) {
    const raw = user?.rol?.nombre || user?.rol;
    return String(raw || "").toUpperCase();
  }

  async assertDueno(restauranteId, user) {
    const negocio = await prisma.negocios.findUnique({ where: { id: Number(restauranteId) } });
    if (!negocio) throw new Error("Negocio no encontrado");
    if (this.rolDe(user) === "ADMIN") return negocio;
    if (negocio.ownerId !== Number(user?.id)) {
      const err = new Error("No puedes modificar el menú de este negocio.");
      err.status = 403;
      throw err;
    }
    return negocio;
  }

  async create(data, user) {
    await this.assertDueno(data.restauranteId, user);
    return prisma.producto.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        precio: data.precio,
        imagen: data.imagen,
        categoria: data.categoria,
        restauranteId: data.restauranteId,
        disponible: data.disponible !== undefined ? data.disponible : true,
      },
    });
  }

  async update(id, data, user) {
    const actual = await this.getById(id);
    await this.assertDueno(actual.restauranteId, user);
    const permitidos = ["nombre", "descripcion", "precio", "imagen", "categoria", "disponible"];
    const limpio = {};
    for (const campo of permitidos) {
      if (data[campo] !== undefined) limpio[campo] = data[campo];
    }
    return prisma.producto.update({
      where: { id: Number(id) },
      data: limpio,
    });
  }

  async delete(id, user) {
    const actual = await this.getById(id);
    await this.assertDueno(actual.restauranteId, user);
    return prisma.producto.delete({ where: { id: Number(id) } });
  }

  async getCategorias(restauranteId) {
    const productos = await prisma.producto.findMany({
      where: { restauranteId: Number(restauranteId), disponible: true },
      select: { categoria: true },
      distinct: ["categoria"],
    });
    return [...new Set(productos.map((p) => p.categoria))];
  }
}

module.exports = new ProductoService();
