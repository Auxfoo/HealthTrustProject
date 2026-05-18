const express = require("express");
const userController = require("../controllers/userController");
const { requireWalletAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/register", requireWalletAuth("register-user"), userController.registerUser);
router.get("/:wallet", userController.getUserByWallet);

module.exports = router;
