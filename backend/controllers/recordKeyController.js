const { ethers } = require("ethers");
const prisma = require("../lib/prisma");
const { createNotification } = require("../lib/notifications");
const contractConfig = require("../../shared/contractConfig");

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || contractConfig.CONTRACT_ADDRESS;
const CONTRACT_ABI = contractConfig.CONTRACT_ABI || [];

function getReadContract() {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL));
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
      return res.status(400).json({ message: "recordId, recipientWallet, and encryptedKey are required" });
    }

    const record = await getRecord(recordId);
    if (!record) return res.status(404).json({ message: "Record not found on-chain" });

    const ownerWallet = record.uploadedBy.toLowerCase();
    const authWallet = req.authWallet.toLowerCase();
    const normalizedRecipient = recipientWallet.toLowerCase();
    const ownerSavingShare = ownerWallet === authWallet;
    const doctorDeliveringToPatient = ownerWallet === normalizedRecipient && authWallet !== ownerWallet;
    if (!ownerSavingShare && !doctorDeliveringToPatient) {
      return res.status(403).json({ message: "Only the owner or creating clinician can store this key envelope" });
    }

    const row = await prisma.recordKey.upsert({
      where: { recordId_recipientWallet: { recordId: Number(recordId), recipientWallet: normalizedRecipient } },
      update: {
        ownerWallet,
        encryptedKey,
        accessType,
        accessTarget: String(accessTarget || normalizedRecipient).toLowerCase(),
      },
      create: {
        recordId: Number(recordId),
        ownerWallet,
        recipientWallet: normalizedRecipient,
        encryptedKey,
        accessType,
        accessTarget: String(accessTarget || normalizedRecipient).toLowerCase(),
      },
    });

    await createNotification(
      normalizedRecipient,
      "record_key_shared",
      "Encrypted record key shared",
      `A key envelope is available for record #${recordId}.`
    );
    res.json({ ...row, encryptedKey: undefined, hasEncryptedKey: true });
  } catch (error) {
    res.status(500).json({ message: "Unable to store encrypted record key", error: error.message });
  }
};

exports.getRecordKey = async (req, res) => {
  try {
    const recordId = Number(req.params.recordId);
    const recipientWallet = req.authWallet.toLowerCase();
    const row = await prisma.recordKey.findUnique({
      where: { recordId_recipientWallet: { recordId, recipientWallet } },
    });
    if (!row) return res.status(404).json({ message: "Encrypted key was not found" });

    const contract = getReadContract();
    const record = await getRecord(recordId);
    const isOwner = record?.uploadedBy?.toLowerCase() === recipientWallet;
    const hasChainAccess = isOwner || (await contract.hasAccess(recordId, recipientWallet));
    if (!hasChainAccess) {
      return res.status(403).json({ message: "Wallet does not currently have on-chain access" });
    }

    res.json(row);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch encrypted record key", error: error.message });
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
    res.status(500).json({ message: "Unable to fetch key overview", error: error.message });
  }
};

exports.getInstitutionKeys = async (req, res) => {
  try {
    const institution = await prisma.institution.findFirst({
      where: { institutionId: Number(req.params.institutionId), adminWallet: req.authWallet.toLowerCase() },
    });
    if (!institution) return res.status(403).json({ message: "Only the institution admin can view institution keys" });

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
    res.status(500).json({ message: "Unable to fetch institution key overview", error: error.message });
  }
};

exports.deleteRecordKey = async (req, res) => {
  try {
    const { recordId, recipientWallet, accessType, accessTarget } = req.body;
    const ownerWallet = req.authWallet.toLowerCase();
    const where = recipientWallet
      ? { recordId: Number(recordId), ownerWallet, recipientWallet: recipientWallet.toLowerCase() }
      : { recordId: Number(recordId), ownerWallet, accessType, accessTarget: String(accessTarget).toLowerCase() };

    const result = await prisma.recordKey.deleteMany({ where });
    res.json({ deleted: result.count });
  } catch (error) {
    res.status(500).json({ message: "Unable to delete encrypted key", error: error.message });
  }
};
