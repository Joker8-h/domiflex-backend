const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class PedidoItemService {
  async getByPedido(pedidoId) {
    return prisma.pedidoItem.findMany({
      where: { pedidoId: Number(pedidoId) },
      include: { menuItem: true },
    });
  }

  async create(data) {
    return prisma.pedidoItem.create({
      data: {
        cantidad: data.cantidad || 1,
        precio: data.precio,
        pedidoId: data.pedidoId,
        menuItemId: data.menuItemId,
      },
      include: { menuItem: true },
    });
  }

  async createMany(pedidoId, items) {
    const data = items.map((item) => ({
      cantidad: item.cantidad || 1,
      precio: item.precio,
      pedidoId: pedidoId,
      menuItemId: item.menuItemId,
    }));

    await prisma.pedidoItem.createMany({ data });
    return this.getByPedido(pedidoId);
  }

  async deleteByPedido(pedidoId) {
    return prisma.pedidoItem.deleteMany({
      where: { pedidoId: Number(pedidoId) },
    });
  }
}

module.exports = new PedidoItemService();
