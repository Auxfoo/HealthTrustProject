const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HealthTrust", function () {
  async function deployFixture() {
    const [owner, patient, doctor, admin, institutionDoctor] = await ethers.getSigners();
    const HealthTrust = await ethers.getContractFactory("HealthTrust");
    const contract = await HealthTrust.deploy();
    await contract.waitForDeployment();
    return { contract, owner, patient, doctor, admin, institutionDoctor };
  }

  it("grants and revokes direct doctor access per record", async function () {
    const { contract, patient, doctor } = await deployFixture();
    await contract.connect(patient).addRecord("QmPatientRecord");

    expect(await contract.hasAccess(1, doctor.address)).to.equal(false);
    await contract.connect(patient).grantAccessToDoctor(1, doctor.address);
    expect(await contract.hasAccess(1, doctor.address)).to.equal(true);
    await contract.connect(patient).revokeAccessFromDoctor(1, doctor.address);
    expect(await contract.hasAccess(1, doctor.address)).to.equal(false);
  });

  it("allows institution doctors to use institution-level access", async function () {
    const { contract, patient, admin, institutionDoctor } = await deployFixture();
    await contract.connect(patient).addRecord("QmPatientRecord");
    await contract.connect(admin).registerInstitution("Shar", "hospital");
    await contract.connect(admin).addDoctorToInstitution(1, institutionDoctor.address);

    await contract.connect(patient).grantAccessToInstitution(1, 1);
    expect(await contract.hasAccess(1, institutionDoctor.address)).to.equal(true);
    await contract.connect(patient).revokeAccessFromInstitution(1, 1);
    expect(await contract.hasAccess(1, institutionDoctor.address)).to.equal(false);
  });

  it("lets a clinician create a patient-owned record", async function () {
    const { contract, patient, doctor } = await deployFixture();
    await expect(contract.connect(doctor).addRecordForPatient(patient.address, "QmCareDoc")).to.emit(
      contract,
      "RecordAddedForPatient"
    );

    const records = await contract.connect(patient).getMyRecords();
    expect(records).to.have.length(1);
    expect(records[0].uploadedBy).to.equal(patient.address);
    expect(records[0].cid).to.equal("QmCareDoc");
  });
});
