import axios from "axios";
import { createAuthHeaders } from "./auth";
import { encryptRecordKeyForDoctor } from "./keySharing";

export async function buildRecipientKeyEnvelope(API_URL, record, aesKey, recipientWallet) {
  const response = await axios.get(`${API_URL}/api/users/${recipientWallet}`);
  const publicKey = response.data?.encryptionPublicKey;
  if (!publicKey) {
    throw new Error("This user has not registered a MetaMask encryption public key yet.");
  }
  return {
    recordId: record.id,
    recipientWallet,
    encryptedKey: encryptRecordKeyForDoctor(aesKey, publicKey),
    accessType: "doctor",
    accessTarget: recipientWallet.toLowerCase(),
  };
}

export async function buildDoctorKeyEnvelope(API_URL, patientWallet, doctorWallet, record, aesKey) {
  return buildRecipientKeyEnvelope(API_URL, record, aesKey, doctorWallet);
}

export async function buildInstitutionKeyEnvelopes(API_URL, institution, doctors, record, aesKey) {
  const envelopes = [];
  for (const doctorWallet of doctors) {
    const envelope = await buildRecipientKeyEnvelope(API_URL, record, aesKey, doctorWallet);
    envelopes.push({ ...envelope, accessType: "institution", accessTarget: String(institution.institutionId) });
  }
  return envelopes;
}

export async function storeKeyEnvelope(API_URL, walletAddress, envelope) {
  return axios.post(`${API_URL}/api/record-keys`, envelope, {
    headers: await createAuthHeaders(walletAddress),
  });
}

export async function storeKeyEnvelopes(API_URL, walletAddress, envelopes) {
  for (const envelope of envelopes) {
    await storeKeyEnvelope(API_URL, walletAddress, envelope);
  }
}

export async function deleteKeyEnvelope(API_URL, walletAddress, payload) {
  return axios.delete(`${API_URL}/api/record-keys`, {
    data: payload,
    headers: await createAuthHeaders(walletAddress),
  });
}
