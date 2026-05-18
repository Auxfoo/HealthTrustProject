const express = require("express");
const recordKeyController = require("../controllers/recordKeyController");
const { requireWalletAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/", requireWalletAuth("store-record-key"), recordKeyController.upsertRecordKey);
router.get("/owned", requireWalletAuth("read-owned-record-keys"), recordKeyController.getOwnedRecordKeys);
router.get("/institution/:institutionId", requireWalletAuth("read-institution-keys"), recordKeyController.getInstitutionKeys);
router.get("/:recordId", requireWalletAuth("read-record-key"), recordKeyController.getRecordKey);
router.delete("/", requireWalletAuth("delete-record-key"), recordKeyController.deleteRecordKey);

module.exports = router;
