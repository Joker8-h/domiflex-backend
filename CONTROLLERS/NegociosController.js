const NegociosService = require("../SERVICES/NegociosService");

class NegociosController {
  async getAll(req, res) {
    try {
      const { tipo, categoriaId, busqueda } = req.query;
      const negocios = await NegociosService.getAll({ tipo, categoriaId, busqueda });
      res.json(negocios);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const negocio = await NegociosService.getById(req.params.id);
      res.json(negocio);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  async create(req, res) {
    try {
      const negocio = await NegociosService.create(req.body, req.user.id);
      res.status(201).json(negocio);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      const negocio = await NegociosService.update(req.params.id, req.body);
      res.json(negocio);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getMisNegocios(req, res) {
    try {
      const negocios = await NegociosService.getMisNegocios(req.user.id);
      res.json(negocios);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getProductos(req, res) {
    try {
      const productos = await NegociosService.getProductos(req.params.id);
      res.json(productos);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  async getPorTipo(req, res) {
    try {
      const negocios = await NegociosService.getPorTipo(req.params.tipo);
      res.json(negocios);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new NegociosController();
