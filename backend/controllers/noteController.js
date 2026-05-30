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

exports.upsertNote = async (req, res) => {
  try {
    const { recordId, patientWallet, status = "reviewed", note } = req.body;
    if (!recordId || !patientWallet) {
      return res.status(400).json({ error: "recordId and patientWallet are required" });
    }

    const doctorWallet = req.authWallet.toLowerCase();
    const access = await validateDoctorRecordAccess(recordId, patientWallet, doctorWallet);
    if (!access.ok) return res.status(access.status).json({ error: access.message });

    const row = await prisma.doctorNote.upsert({
      where: { recordId_doctorWallet: { recordId: Number(recordId), doctorWallet } },
      update: { patientWallet: patientWallet.toLowerCase(), status, note },
      create: {
        recordId: Number(recordId),
        patientWallet: patientWallet.toLowerCase(),
        doctorWallet,
        status,
        note,
      },
    });

    await createNotification(patientWallet.toLowerCase(), "doctor_note", "Doctor note added", `Record #${recordId} was reviewed.`);
    res.json(row);
  } catch (error) {
    res.status(500).json({ error: "Unable to save doctor note", detail: error.message });
  }
};

exports.getMine = async (req, res) => {
  try {
    const wallet = req.authWallet.toLowerCase();
    const notes = await prisma.doctorNote.findMany({
      where: { OR: [{ patientWallet: wallet }, { doctorWallet: wallet }] },
      orderBy: { updatedAt: "desc" },
    });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: "Unable to fetch doctor notes", detail: error.message });
  }
};
