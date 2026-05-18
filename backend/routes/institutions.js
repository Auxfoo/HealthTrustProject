const express = require("express");
const institutionController = require("../controllers/institutionController");

const router = express.Router();

router.post("/register", institutionController.registerInstitution);
router.post("/addDoctor", institutionController.addDoctor);
router.post("/removeDoctor", institutionController.removeDoctor);
router.get("/", institutionController.getInstitutions);
router.get("/:id/doctors", institutionController.getInstitutionDoctors);

module.exports = router;
