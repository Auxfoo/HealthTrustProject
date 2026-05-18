const express = require("express");
const noteController = require("../controllers/noteController");
const { requireWalletAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireWalletAuth("save-doctor-note"), noteController.upsertNote);
router.get("/", requireWalletAuth("read-doctor-notes"), noteController.getMine);

module.exports = router;
