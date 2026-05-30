const { ethers } = require("ethers");
const prisma = require("../lib/prisma");
const { createNotification } = require("../lib/notifications");
const contractConfig = require("../../shared/contractConfig");

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || contractConfig.CONTRACT_ADDRESS;
const CONTRACT_ABI = contractConfig.CONTRACT_ABI || [];

function getReadContract() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL || "";
  const provider = !rpcUrl || rpcUrl.includes("your_api_key")
    ? ethers.getDefaultProvider("sepolia")
    : new ethers.JsonRpcProvider(rpcUrl);
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

function serializeRecord(record) {
  return {
    id: Number(record.id),
    cid: record.cid,
    uploadedBy: record.uploadedBy,
    timestamp: Number(record.timestamp),
  };
}

async function getRecord(recordId) {
  const records = await getReadContract().getAllRecords();
  return records.map(serializeRecord).find((record) => record.id === Number(recordId));
}

exports.upsertRecordKey = async (req, res) => {
  try {
    const { recordId, recipientWallet, encryptedKey, accessType = "doctor", accessTarget } = req.body;
    if (!recordId || !recipientWallet || !encryptedKey) {
      return res.status(400).json({ error: "recordId, recipientWallet, and encryptedKey are required" });
    }

    const record = await getRecord(recordId);
    if (!record) return res.status(404).json({ error: "Record not found on-chain" });

    const ownerWallet = record.uploadedBy.toLowerCase();
    const authWallet = req.authWallet.toLowerCase();
    const normalizedRecipient = recipientWallet.toLowerCase();
    const normalizedAccessTarget = String(accessTarget || normalizedRecipient).toLowerCase();
    const ownerSavingShare = ownerWallet === authWallet;
    const doctorDeliveringToPatient = ownerWallet === normalizedRecipient && authWallet !== ownerWallet;
    if (!ownerSavingShare && !doctorDeliveringToPatient) {
      return res.status(403).json({ error: "Only the owner or creating clinician can store this key envelope" });
    }
    const shouldNotifyInstitutionAdmin =
      accessType === "institution" &&
      !(await prisma.recordKey.findFirst({
        where: {
          recordId: Number(recordId),
          accessType: "institution",
          accessTarget: normalizedAccessTarget,
        },
      }));

    const row = await prisma.recordKey.upsert({
      where: { recordId_recipientWallet: { recordId: Number(recordId), recipientWallet: normalizedRecipient } },
      update: {
        ownerWallet,
        encryptedKey,
        accessType,
        accessTarget: normalizedAccessTarget,
      },
      create: {
        recordId: Number(recordId),
        ownerWallet,
        recipientWallet: normalizedRecipient,
        encryptedKey,
        accessType,
        accessTarget: normalizedAccessTarget,
      },
    });

    await createNotification(
      normalizedRecipient,
      "record_key_shared",
      "Encrypted record key shared",
      `A key envelope is available for record #${recordId}.`
    );
    if (shouldNotifyInstitutionAdmin) {
      const institution = await prisma.institution.findUnique({
        where: { institutionId: Number(normalizedAccessTarget) },
      });
      if (institution) {
        await createNotification(
          institution.adminWallet,
          "institution_record_shared",
          "Record shared with institution",
          `Record #${recordId} was shared with ${institution.name}.`
        );
      }
    }
    res.json({ ...row, encryptedKey: undefined, hasEncryptedKey: true });
  } catch (error) {
    res.status(500).json({ error: "Unable to store encrypted record key", detail: error.message });
  }
};

exports.getRecordKey = async (req, res) => {
  try {
    const recordId = Number(req.params.recordId);
    const recipientWallet = req.authWallet.toLowerCase();
    const row = await prisma.recordKey.findUnique({
      where: { recordId_recipientWallet: { recordId, recipientWallet } },
    });
    if (!row) return res.status(404).json({ error: "Encrypted key was not found" });

    const contract = getReadContract();
    const record = await getRecord(recordId);
    const isOwner = record?.uploadedBy?.toLowerCase() === recipientWallet;
    const hasChainAccess = isOwner || (await contract.hasAccess(recordId, recipientWallet));
    if (!hasChainAccess) {
      return res.status(403).json({ error: "Wallet does not currently have on-chain access" });
    }

    res.json(row);
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch encrypted record key", detail: error.message });
  }
};

exports.getOwnedRecordKeys = async (req, res) => {
  try {
    const keys = await prisma.recordKey.findMany({
      where: { ownerWallet: req.authWallet.toLowerCase() },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        recordId: true,
        ownerWallet: true,
        recipientWallet: true,
        accessType: true,
        accessTarget: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json(keys.map((key) => ({ ...key, hasEncryptedKey: true })));
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch key overview", detail: error.message });
  }
};

exports.getInstitutionKeys = async (req, res) => {
  try {
    const institution = await prisma.institution.findFirst({
      where: { institutionId: Number(req.params.institutionId), adminWallet: req.authWallet.toLowerCase() },
    });
    if (!institution) return res.status(403).json({ error: "Only the institution admin can view institution keys" });

    const keys = await prisma.recordKey.findMany({
      where: { accessType: "institution", accessTarget: String(req.params.institutionId) },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        recordId: true,
        ownerWallet: true,
        recipientWallet: true,
        accessType: true,
        accessTarget: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json(keys.map((key) => ({ ...key, hasEncryptedKey: true })));
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch institution key overview", detail: error.message });
  }
};

exports.deleteRecordKey = async (req, res) => {
  try {
    const { recordId, recipientWallet, accessType, accessTarget } = req.body;
    const ownerWallet = req.authWallet.toLowerCase();
    const where = recipientWallet
      ? { recordId: Number(recordId), ownerWallet, recipientWallet: recipientWallet.toLowerCase() }
      : { recordId: Number(recordId), ownerWallet, accessType, accessTarget: String(accessTarget).toLowerCase() };

    const deletedRows = await prisma.recordKey.findMany({ where });
    const result = await prisma.recordKey.deleteMany({ where });
    await Promise.all(
      deletedRows.map((row) =>
        createNotification(
          row.recipientWallet,
          "record_key_revoked",
          "Encrypted record key removed",
          `Your key envelope for record #${recordId} was removed.`
        )
      )
    );
    if (!recipientWallet && accessType === "institution") {
      const institution = await prisma.institution.findUnique({
        where: { institutionId: Number(accessTarget) },
      });
      if (institution) {
        await createNotification(
          institution.adminWallet,
          "institution_record_revoked",
          "Institution record access revoked",
          `Record #${recordId} was no longer shared with ${institution.name}.`
        );
      }
    }
    res.json({ deleted: result.count });
  } catch (error) {
    res.status(500).json({ error: "Unable to delete encrypted key", detail: error.message });
  }
};
