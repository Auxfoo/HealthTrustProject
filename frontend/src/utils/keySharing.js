import { base64 } from "@scure/base";
import nacl from "tweetnacl";

function bytesToBase64(bytes) {
  return base64.encode(bytes);
}

function base64ToBytes(value) {
  return base64.decode(value);
}

function utf8ToBytes(value) {
  return new TextEncoder().encode(value);
}

function bytesToUtf8(bytes) {
  return new TextDecoder().decode(bytes);
}

export async function getEncryptionPublicKey(walletAddress) {
  if (!window.ethereum?.request) {
    throw new Error("MetaMask is required to register an encryption key");
  }
  return window.ethereum.request({
    method: "eth_getEncryptionPublicKey",
    params: [walletAddress],
  });
}

export function encryptRecordKeyForDoctor(aesKey, publicKey) {
  if (!publicKey) throw new Error("Recipient encryption public key is missing");
  const ephemeral = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const encrypted = nacl.box(utf8ToBytes(aesKey), nonce, base64ToBytes(publicKey), ephemeral.secretKey);
  return JSON.stringify({
    version: "x25519-xsalsa20-poly1305",
    nonce: bytesToBase64(nonce),
    ephemPublicKey: bytesToBase64(ephemeral.publicKey),
    ciphertext: bytesToBase64(encrypted),
  });
}

export async function decryptRecordKey(encryptedKey, walletAddress) {
  const payload = typeof encryptedKey === "string" ? JSON.parse(encryptedKey) : encryptedKey;
  const message = {
    version: "x25519-xsalsa20-poly1305",
    nonce: payload.nonce,
    ephemPublicKey: payload.ephemPublicKey,
    ciphertext: payload.ciphertext,
  };
  try {
    return await window.ethereum.request({
      method: "eth_decrypt",
      params: [JSON.stringify(message), walletAddress],
    });
  } catch (error) {
    const secret = window.prompt("MetaMask could not decrypt this key. Paste the AES key if the patient shared it with you.");
    if (!secret) throw error;
    return secret;
  }
}

export function decryptRecordKeyLocally(encryptedKey, secretKey) {
  const payload = typeof encryptedKey === "string" ? JSON.parse(encryptedKey) : encryptedKey;
  const decrypted = nacl.box.open(
    base64ToBytes(payload.ciphertext),
    base64ToBytes(payload.nonce),
    base64ToBytes(payload.ephemPublicKey),
    base64ToBytes(secretKey)
  );
  if (!decrypted) throw new Error("Unable to decrypt record key");
  return bytesToUtf8(decrypted);
}
