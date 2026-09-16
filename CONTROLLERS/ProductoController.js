const ProductoService = require("../SERVICES/ProductoService");

class ProductoController {
  async getByNegocio(req, res) {
    try {
      const productos = await ProductoService.getByNegocio(req.params.negocioId);
      res.json(productos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const producto = await ProductoService.getById(req.params.id);
      res.json(producto);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  async create(req, res) {
    try {
      const producto = await ProductoService.create(req.body);
      res.status(201).json(producto);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      const producto = await ProductoService.update(req.params.id, req.body);
      res.json(producto);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      await ProductoService.delete(req.params.id);
      res.json({ message: "Producto eliminado" });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getCategorias(req, res) {
    try {
      const categorias = await ProductoService.getCategorias(req.params.negocioId);
      res.json(categorias);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new ProductoController();
