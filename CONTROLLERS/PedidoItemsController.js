const PedidoItemService = require("../SERVICES/PedidoItemService");

class PedidoItemsController {
  async getByPedido(req, res) {
    try {
      const items = await PedidoItemService.getByPedido(req.params.pedidoId);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async create(req, res) {
    try {
      const item = await PedidoItemService.create(req.body);
      res.status(201).json(item);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async createMany(req, res) {
    try {
      const items = await PedidoItemService.createMany(req.params.pedidoId, req.body.items);
      res.status(201).json(items);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteByPedido(req, res) {
    try {
      await PedidoItemService.deleteByPedido(req.params.pedidoId);
      res.json({ message: "Items eliminados" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new PedidoItemsController();
