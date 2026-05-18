const express = require("express");
const notificationController = require("../controllers/notificationController");
const { requireWalletAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireWalletAuth("read-notifications"), notificationController.getMine);
router.patch("/:id/read", requireWalletAuth("read-notifications"), notificationController.markRead);

module.exports = router;
