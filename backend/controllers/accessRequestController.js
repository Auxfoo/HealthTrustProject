const prisma = require("../lib/prisma");
const { createNotification } = require("../lib/notifications");

exports.createRequest = async (req, res) => {
  try {
    const { recordId, patientWallet, requestType = "doctor", institutionId, reason } = req.body;
    if (!recordId || !patientWallet) {
      return res.status(400).json({ error: "recordId and patientWallet are required" });
    }

    const requesterWallet = req.authWallet.toLowerCase();
    const existing = await prisma.accessRequest.findFirst({
      where: {
        recordId: Number(recordId),
        patientWallet: patientWallet.toLowerCase(),
        requesterWallet,
        status: { in: ["pending", "approved"] },
      },
    });
    if (existing) {
      return res.status(409).json({
        error:
          existing.status === "approved"
            ? "You already have approved access for this record"
            : "You already have a pending request for this record",
      });
    }

    const request = await prisma.accessRequest.create({
      data: {
        recordId: Number(recordId),
        patientWallet: patientWallet.toLowerCase(),
        requesterWallet,
        requestType,
        institutionId: institutionId ? Number(institutionId) : null,
        reason,
      },
    });

    const requesterLabel =
      requestType === "emergency" ? "A doctor requested emergency access" : requestType === "institution" ? "An institution requested access" : "A doctor requested access";
    await createNotification(
      patientWallet.toLowerCase(),
      requestType === "emergency" ? "emergency_access_request" : "access_request",
      requestType === "emergency" ? "Emergency access request" : "New access request",
      `${requesterLabel} for record #${recordId}.${reason ? ` Reason: ${reason}` : ""}`
    );
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: "Unable to create access request", detail: error.message });
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
    res.status(500).json({ error: "Unable to fetch access requests", detail: error.message });
  }
};

exports.updateRequest = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid request status" });
    }

    const existing = await prisma.accessRequest.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) return res.status(404).json({ error: "Access request not found" });
    if (existing.patientWallet.toLowerCase() !== req.authWallet.toLowerCase()) {
      return res.status(403).json({ error: "Only the patient can update this request" });
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
    res.status(500).json({ error: "Unable to update access request", detail: error.message });
  }
};
