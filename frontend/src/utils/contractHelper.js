import { ethers } from "ethers";
import "../../../shared/contractConfig";

function getConfig() {
  const config = window.HealthTrustContractConfig || {};
  return {
    address: config.CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000",
    abi: config.CONTRACT_ABI || [],
  };
}

export async function getBrowserProvider() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

export async function getSigner() {
  const provider = await getBrowserProvider();
  return provider.getSigner();
}

export function getContract(signerOrProvider) {
  const { address, abi } = getConfig();
  return new ethers.Contract(address, abi, signerOrProvider);
}

export async function getSignedContract() {
  return getContract(await getSigner());
}

export async function addRecord(cid) {
  return (await getSignedContract()).addRecord(cid);
}

export async function grantAccessToDoctor(recordId, doctorAddress) {
  return (await getSignedContract()).grantAccessToDoctor(recordId, doctorAddress);
}

export async function revokeAccessFromDoctor(recordId, doctorAddress) {
  return (await getSignedContract()).revokeAccessFromDoctor(recordId, doctorAddress);
}

export async function grantAccessToInstitution(recordId, institutionId) {
  return (await getSignedContract()).grantAccessToInstitution(recordId, institutionId);
}

export async function revokeAccessFromInstitution(recordId, institutionId) {
  return (await getSignedContract()).revokeAccessFromInstitution(recordId, institutionId);
}

export async function registerInstitution(name, institutionType) {
  return (await getSignedContract()).registerInstitution(name, institutionType);
}

export async function addDoctorToInstitution(institutionId, doctorAddress) {
  return (await getSignedContract()).addDoctorToInstitution(institutionId, doctorAddress);
}

export async function removeDoctorFromInstitution(institutionId, doctorAddress) {
  return (await getSignedContract()).removeDoctorFromInstitution(institutionId, doctorAddress);
}

export async function getInstitutionDoctors(institutionId) {
  const provider = await getBrowserProvider();
  return getContract(provider).getInstitutionDoctors(institutionId);
}

export async function getAllRecords() {
  const provider = await getBrowserProvider();
  const records = await getContract(provider).getAllRecords();
  return records.map((record) => ({
    id: Number(record.id),
    cid: record.cid,
    uploadedBy: record.uploadedBy,
    timestamp: Number(record.timestamp),
  }));
}

export async function hasAccess(recordId, doctorAddress) {
  const provider = await getBrowserProvider();
  return getContract(provider).hasAccess(recordId, doctorAddress);
}

export async function getAllInstitutionsFromChain() {
  const provider = await getBrowserProvider();
  const institutions = await getContract(provider).getAllInstitutions();
  return institutions.map((institution) => ({
    id: Number(institution.id),
    name: institution.name,
    institutionType: institution.institutionType,
    adminWallet: institution.adminWallet,
    isVerified: institution.isVerified,
  }));
}

export async function parseReceiptEvent(receipt, eventName) {
  const { abi } = getConfig();
  const iface = new ethers.Interface(abi);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === eventName) {
        return parsed;
      }
    } catch (error) {
      // Ignore logs emitted by other contracts.
    }
  }
  return null;
}
