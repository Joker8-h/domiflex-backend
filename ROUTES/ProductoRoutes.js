const express = require("express");
const router = express.Router();
const auth = require("../MIDDLEWARE/authmiddleware");
const role = require("../MIDDLEWARE/role.middleware");
const ProductoController = require("../CONTROLLERS/ProductoController");

// Públicos
router.get("/negocio/:negocioId", ProductoController.getByNegocio);
router.get("/categorias/:negocioId", ProductoController.getCategorias);
router.get("/:id", ProductoController.getById);

// Autenticados (COMERCIO/ADMIN)
router.post("/", auth, role(["COMERCIO", "ADMIN"]), ProductoController.create);
router.put("/:id", auth, role(["COMERCIO", "ADMIN"]), ProductoController.update);
router.delete("/:id", auth, role(["COMERCIO", "ADMIN"]), ProductoController.delete);

module.exports = router;
