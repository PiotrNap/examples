import nacl from "tweetnacl";
import * as util from "tweetnacl-util";

// Helper: encrypt for recipient (sealed box style)
export function encryptForRecipient(messageUtf8, recipientPubKeyBase64) {
  const recipientPublicKey = util.decodeBase64(recipientPubKeyBase64); // 32 bytes
  const ephemKey = nacl.box.keyPair(); // X25519
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const msgBytes = util.decodeUTF8(messageUtf8);

  const cipher = nacl.box(msgBytes, nonce, recipientPublicKey, ephemKey.secretKey);

  return {
    ciphertext: util.encodeBase64(cipher),
    nonce: util.encodeBase64(nonce),
    // expose ephemeral public key so recipient can decrypt
    ephemPublicKey: util.encodeBase64(ephemKey.publicKey),
  };
}

// Decrypt with recipient secret
export function decryptFromSender(
  ciphertextB64,
  nonceB64,
  ephemPubB64,
  recipientSecretB64,
) {
  const cipher = util.decodeBase64(ciphertextB64);
  const nonce = util.decodeBase64(nonceB64);
  const ephemPublicKey = util.decodeBase64(ephemPubB64);
  const recipientSecret = util.decodeBase64(recipientSecretB64);
  const msg = nacl.box.open(cipher, nonce, ephemPublicKey, recipientSecret);
  if (!msg) throw new Error("Decryption failed");
  return util.encodeUTF8(msg);
}
