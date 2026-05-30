const express = require("express");
const accessController = require("../controllers/accessController");
const { requireWalletAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/grant/doctor", requireWalletAuth("grant-doctor-access"), accessController.grantAccessToDoctor);
router.post("/revoke/doctor", requireWalletAuth("revoke-doctor-access"), accessController.revokeAccessFromDoctor);
router.post("/grant/institution", requireWalletAuth("grant-institution-access"), accessController.grantAccessToInstitution);
router.post("/revoke/institution", requireWalletAuth("revoke-institution-access"), accessController.revokeAccessFromInstitution);
router.get("/check", requireWalletAuth("check-access"), accessController.checkAccess);

module.exports = router;
