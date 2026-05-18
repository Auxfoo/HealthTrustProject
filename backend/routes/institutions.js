const express = require("express");
const institutionController = require("../controllers/institutionController");
const { requireWalletAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/register", requireWalletAuth("register-institution"), institutionController.registerInstitution);
router.post("/addDoctor", requireWalletAuth("add-institution-doctor"), institutionController.addDoctor);
router.post("/removeDoctor", requireWalletAuth("remove-institution-doctor"), institutionController.removeDoctor);
router.get("/", institutionController.getInstitutions);
router.get("/:id/doctors", institutionController.getInstitutionDoctors);

module.exports = router;
