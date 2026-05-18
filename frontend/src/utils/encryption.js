import CryptoJS from "crypto-js";

export function deriveKey(walletAddress, signature) {
  return CryptoJS.SHA256(`${walletAddress.toLowerCase()}:${signature}`).toString();
}

export function generateRandomKey() {
  return CryptoJS.lib.WordArray.random(32).toString();
}

function arrayBufferToWordArray(buffer) {
  const bytes = new Uint8Array(buffer);
  const words = [];

  for (let i = 0; i < bytes.length; i += 1) {
    words[i >>> 2] |= bytes[i] << (24 - (i % 4) * 8);
  }

  return CryptoJS.lib.WordArray.create(words, bytes.length);
}

function wordArrayToUint8Array(wordArray) {
  const words = wordArray.words;
  const sigBytes = wordArray.sigBytes;
  const bytes = new Uint8Array(sigBytes);

  for (let i = 0; i < sigBytes; i += 1) {
    bytes[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }

  return bytes;
}

export async function encryptFile(fileBuffer, key) {
  const wordArray = arrayBufferToWordArray(fileBuffer);
  return CryptoJS.AES.encrypt(wordArray, key).toString();
}

export function decryptFile(encryptedString, key) {
  const decrypted = CryptoJS.AES.decrypt(encryptedString, key);
  return wordArrayToUint8Array(decrypted);
}
