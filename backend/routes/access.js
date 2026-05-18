const express = require("express");
const accessController = require("../controllers/accessController");

const router = express.Router();

router.post("/grant/doctor", accessController.grantAccessToDoctor);
router.post("/revoke/doctor", accessController.revokeAccessFromDoctor);
router.post("/grant/institution", accessController.grantAccessToInstitution);
router.post("/revoke/institution", accessController.revokeAccessFromInstitution);
router.get("/check", accessController.checkAccess);

module.exports = router;
