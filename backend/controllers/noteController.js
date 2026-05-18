const prisma = require("../lib/prisma");
const { createNotification } = require("../lib/notifications");

exports.upsertNote = async (req, res) => {
  try {
    const { recordId, patientWallet, status = "reviewed", note } = req.body;
    if (!recordId || !patientWallet) {
      return res.status(400).json({ message: "recordId and patientWallet are required" });
    }

    const doctorWallet = req.authWallet.toLowerCase();
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
    res.status(500).json({ message: "Unable to save doctor note", error: error.message });
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
    res.status(500).json({ message: "Unable to fetch doctor notes", error: error.message });
  }
};
