const express = require("express");
const router = express.Router();
const wompiService = require("../SERVICES/WompiService");

router.post("/wompi", async (req, res) => {
    try {
        const resultado = await wompiService.procesarEvento(req.body);
        res.json(resultado);
    } catch (error) {
        res.status(error.status || 400).json({ error: error.message });
    }
});

module.exports = router;
