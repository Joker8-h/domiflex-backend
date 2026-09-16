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

  async create(data) {
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

  async update(id, data) {
    await this.getById(id);
    return prisma.producto.update({
      where: { id: Number(id) },
      data,
    });
  }

  async delete(id) {
    await this.getById(id);
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
