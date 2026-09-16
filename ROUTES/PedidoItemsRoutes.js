const express = require("express");
const router = express.Router();
const auth = require("../MIDDLEWARE/authmiddleware");
const role = require("../MIDDLEWARE/role.middleware");
const PedidoItemsController = require("../CONTROLLERS/PedidoItemsController");

router.get("/pedido/:pedidoId", auth, PedidoItemsController.getByPedido);
router.post("/", auth, PedidoItemsController.create);
router.post("/pedido/:pedidoId", auth, PedidoItemsController.createMany);
router.delete("/pedido/:pedidoId", auth, role(["CLIENTE", "ADMIN"]), PedidoItemsController.deleteByPedido);

module.exports = router;
