// Maps addressBech32 -> { x25519PublicKey(base64), createdAt }
export const users = new Map();

// Array of { toAddress, fromAddress, ciphertext(base64), nonce(base64), createdAt }
export const notes = [];
