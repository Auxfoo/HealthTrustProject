const prisma = require("../lib/prisma");
const { createNotification } = require("../lib/notifications");

exports.createRequest = async (req, res) => {
  try {
    const { institutionId, message } = req.body;
    if (!institutionId) return res.status(400).json({ message: "institutionId is required" });

    const institution = await prisma.institution.findUnique({ where: { institutionId: Number(institutionId) } });
    if (!institution) return res.status(404).json({ message: "Institution not found" });

    const doctorWallet = req.authWallet.toLowerCase();
    const existing = await prisma.institutionJoinRequest.findFirst({
      where: {
        institutionId: Number(institutionId),
        doctorWallet,
        status: { in: ["pending", "approved"] },
      },
    });
    if (existing) {
      return res.status(409).json({
        message:
          existing.status === "approved"
            ? "You are already approved for this institution"
            : "You already have a pending request for this institution",
      });
    }

    const request = await prisma.institutionJoinRequest.create({
      data: {
        institutionId: Number(institutionId),
        doctorWallet,
        message,
      },
    });

    await createNotification(
      institution.adminWallet,
      "membership_request",
      "Doctor membership request",
      `A doctor requested to join ${institution.name}.`
    );
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: "Unable to create membership request", error: error.message });
  }
};

exports.getMine = async (req, res) => {
  try {
    const wallet = req.authWallet.toLowerCase();
    const institutions = await prisma.institution.findMany({ where: { adminWallet: wallet } });
    const adminInstitutionIds = institutions.map((institution) => institution.institutionId);
    const requests = await prisma.institutionJoinRequest.findMany({
      where: {
        OR: [{ doctorWallet: wallet }, { institutionId: { in: adminInstitutionIds } }],
      },
      orderBy: { updatedAt: "desc" },
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: "Unable to fetch membership requests", error: error.message });
  }
};

exports.updateRequest = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ message: "Invalid request status" });
    }

    const existing = await prisma.institutionJoinRequest.findUnique({ where: { id: Number(req.params.id) } });
    if (!existing) return res.status(404).json({ message: "Membership request not found" });
    const institution = await prisma.institution.findUnique({ where: { institutionId: existing.institutionId } });
    if (!institution || institution.adminWallet.toLowerCase() !== req.authWallet.toLowerCase()) {
      return res.status(403).json({ message: "Only the institution admin can update this request" });
    }

    const request = await prisma.institutionJoinRequest.update({
      where: { id: existing.id },
      data: { status },
    });
    if (status === "approved") {
      await prisma.user.updateMany({
        where: { wallet: existing.doctorWallet.toLowerCase(), role: "doctor" },
        data: { institutionId: existing.institutionId },
      });
    }
    await createNotification(
      existing.doctorWallet,
      `membership_${status}`,
      `Membership request ${status}`,
      `Your request to join ${institution.name} was ${status}.`
    );
    res.json(request);
  } catch (error) {
    res.status(500).json({ message: "Unable to update membership request", error: error.message });
  }
};
