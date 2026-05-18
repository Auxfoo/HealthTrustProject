const prisma = require("../lib/prisma");
const { createNotification } = require("../lib/notifications");

exports.createDocument = async (req, res) => {
  try {
    const { patientWallet, recordId, cid, encrypted = false, documentType, title, content } = req.body;
    if (!patientWallet || !documentType || !title) {
      return res.status(400).json({ message: "patientWallet, documentType, and title are required" });
    }

    const document = await prisma.doctorDocument.create({
      data: {
        patientWallet: patientWallet.toLowerCase(),
        doctorWallet: req.authWallet.toLowerCase(),
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
    res.status(500).json({ message: "Unable to create care document", error: error.message });
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
    res.status(500).json({ message: "Unable to fetch care documents", error: error.message });
  }
};
