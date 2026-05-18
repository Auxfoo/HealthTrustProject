const prisma = require("../lib/prisma");
const { createNotification } = require("../lib/notifications");

exports.createRequest = async (req, res) => {
  try {
    const { recordId, patientWallet, requestType = "doctor", institutionId, reason } = req.body;
    if (!recordId || !patientWallet) {
      return res.status(400).json({ message: "recordId and patientWallet are required" });
    }

    const request = await prisma.accessRequest.create({
      data: {
        recordId: Number(recordId),
        patientWallet: patientWallet.toLowerCase(),
        requesterWallet: req.authWallet.toLowerCase(),
        requestType,
        institutionId: institutionId ? Number(institutionId) : null,
        reason,
      },
    });

    await createNotification(
      patientWallet.toLowerCase(),
      "access_request",
      "New access request",
      `${requestType === "institution" ? "An institution" : "A doctor"} requested record #${recordId}.`
    );
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: "Unable to create access request", error: error.message });
  }
};

exports.getMine = async (req, res) => {
  try {
    const wallet = req.authWallet.toLowerCase();
    const requests = await prisma.accessRequest.findMany({
      where: {
        OR: [{ patientWallet: wallet }, { requesterWallet: wallet }],
      },
      orderBy: { updatedAt: "desc" },
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch access requests", error: error.message });
  }
};

exports.updateRequest = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid request status" });
    }

    const existing = await prisma.accessRequest.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) return res.status(404).json({ message: "Access request not found" });
    if (existing.patientWallet.toLowerCase() !== req.authWallet.toLowerCase()) {
      return res.status(403).json({ message: "Only the patient can update this request" });
    }

    const request = await prisma.accessRequest.update({
      where: { id: existing.id },
      data: { status },
    });
    await createNotification(
      existing.requesterWallet,
      `access_${status}`,
      `Access request ${status}`,
      `Your request for record #${existing.recordId} was ${status}.`
    );
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: "Unable to update access request", error: error.message });
  }
};
