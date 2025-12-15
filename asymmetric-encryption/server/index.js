import express from "express";
import cors from "cors";
import helmet from "helmet";
import { users, notes } from "./db.js";

// Minimal verification of CIP-8 signData payload:
// Client sends { address, payloadHex, coseKeyHex, signatureHex, x25519PublicKeyBase64 }
// Server SHOULD verify COSE signature properly. For demo, we check presence and bind.
// (Production: verify COSE_Sign1 over payload bound to address's payment key.)
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Register encryption key to address after wallet signature proof
app.post("/api/register", (req, res) => {
  const { address, payloadHex, coseKeyHex, signatureHex, x25519PublicKeyBase64 } =
    req.body || {};
  if (!address || !payloadHex || !coseKeyHex || !signatureHex || !x25519PublicKeyBase64) {
    return res.status(400).json({ ok: false, error: "Missing fields" });
  }
  // TODO: Implement full CIP-8 verification here (using CSL/COSE libs).
  // Demo: accept and bind.
  users.set(address, { x25519PublicKey: x25519PublicKeyBase64, createdAt: Date.now() });
  res.json({ ok: true });
});

// List known recipients (addresses that registered an encryption key)
app.get("/api/recipients", (_req, res) => {
  res.json({
    ok: true,
    recipients: [...users.entries()].map(([addr, v]) => ({
      address: addr,
      x25519PublicKeyBase64: v.x25519PublicKey,
    })),
  });
});

// Store encrypted note
app.post("/api/notes", (req, res) => {
  const { toAddress, fromAddress, ciphertext, nonce, ephemPublicKey } = req.body || {};
  if (!toAddress || !fromAddress || !ciphertext || !nonce || !ephemPublicKey) {
    return res.status(400).json({ ok: false, error: "Missing fields" });
  }
  if (!users.has(toAddress))
    return res.status(404).json({ ok: false, error: "Recipient not registered" });

  notes.push({
    toAddress,
    fromAddress,
    ciphertext,
    nonce,
    ephemPublicKey,
    createdAt: Date.now(),
  });
  res.json({ ok: true });
});

// Fetch encrypted notes for an address
app.get("/api/notes/:address", (req, res) => {
  const { address } = req.params;
  const myNotes = notes.filter((n) => n.toAddress === address);
  res.json({ ok: true, notes: myNotes });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
