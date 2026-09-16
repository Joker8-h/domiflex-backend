const express = require("express");
const router = express.Router();
const auth = require("../MIDDLEWARE/authmiddleware");
const role = require("../MIDDLEWARE/role.middleware");
const NegociosController = require("../CONTROLLERS/NegociosController");

// Importante: rutas específicas ANTES de /:id para evitar shadowing
router.get("/", NegociosController.getAll);
router.get("/tipo/:tipo", NegociosController.getPorTipo);
router.get("/mis-negocios", auth, NegociosController.getMisNegocios);
router.get("/:id/productos", NegociosController.getProductos);
router.get("/:id", NegociosController.getById);

// Autenticados
router.post("/", auth, role(["COMERCIO", "ADMIN"]), NegociosController.create);
router.put("/:id", auth, role(["COMERCIO", "ADMIN"]), NegociosController.update);

module.exports = router;
