const prisma = require("../lib/prisma");
const { createNotification } = require("../lib/notifications");
const { ethers } = require("ethers");
const contractConfig = require("../../shared/contractConfig");

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || contractConfig.CONTRACT_ADDRESS;
const CONTRACT_ABI = contractConfig.CONTRACT_ABI || [];

function getReadContract() {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL));
}

function serializeRecord(record) {
  return {
    id: Number(record.id),
    uploadedBy: record.uploadedBy.toLowerCase(),
  };
}

async function validateDoctorRecordAccess(recordId, patientWallet, doctorWallet) {
  const contract = getReadContract();
  const records = await contract.getAllRecords();
  const record = records.map(serializeRecord).find((item) => item.id === Number(recordId));
  if (!record) return { ok: false, status: 404, message: "Record not found on-chain" };
  if (record.uploadedBy !== patientWallet.toLowerCase()) {
    return { ok: false, status: 400, message: "Patient wallet does not match the selected record" };
  }
  const hasAccess = await contract.hasAccess(Number(recordId), doctorWallet);
  if (!hasAccess) {
    const keyEnvelope = await prisma.recordKey.findFirst({
      where: {
        recordId: Number(recordId),
        recipientWallet: doctorWallet.toLowerCase(),
        ownerWallet: patientWallet.toLowerCase(),
      },
    });
    if (!keyEnvelope) return { ok: false, status: 403, message: "Doctor does not have access to this record" };
  }
  return { ok: true };
}

exports.createDocument = async (req, res) => {
  try {
    const { patientWallet, recordId, cid, encrypted = false, documentType, title, content } = req.body;
    if (!patientWallet || !recordId || !documentType || !title) {
      return res.status(400).json({ error: "patientWallet, recordId, documentType, and title are required" });
    }

    const doctorWallet = req.authWallet.toLowerCase();
    const access = await validateDoctorRecordAccess(recordId, patientWallet, doctorWallet);
    if (!access.ok) return res.status(access.status).json({ error: access.message });

    const document = await prisma.doctorDocument.create({
      data: {
        patientWallet: patientWallet.toLowerCase(),
        doctorWallet,
        recordId: recordId ? Number(recordId) : null,
        cid,
        encrypted: Boolean(encrypted),
        documentType,
        title,
        content: content || "Encrypted IPFS record",
      },
    });
    await createNotification(patientWallet.toLowerCase(), "doctor_document", "Care document added", `${title} is available.`);
    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ error: "Unable to create care document", detail: error.message });
  }
};

exports.getMine = async (req, res) => {
  try {
    const wallet = req.authWallet.toLowerCase();
    const documents = await prisma.doctorDocument.findMany({
      where: { OR: [{ patientWallet: wallet }, { doctorWallet: wallet }] },
      orderBy: { createdAt: "desc" },
    });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch care documents", detail: error.message });
  }
};
