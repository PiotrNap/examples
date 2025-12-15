import React, { useEffect, useMemo, useState } from "react";
import { getWallet, signWithWallet } from "./mesh";
import { api } from "./api";

// Hold our local X25519 keypair (demo: persisted in localStorage)
function useLocalKeypair() {
  const [kp, setKp] = useState(null);

  useEffect(() => {
    const pub = localStorage.getItem("x25519_pub");
    const sec = localStorage.getItem("x25519_sec");
    if (pub && sec) {
      setKp({ publicKeyBase64: pub, secretKeyBase64: sec });
    }
  }, []);

  const generate = () => {
    // const pair = nacl.box.keyPair();
    // const pubB64 = util.encodeBase64(pair.publicKey);
    // const secB64 = util.encodeBase64(pair.secretKey);
    // localStorage.setItem("x25519_pub", pubB64);
    // localStorage.setItem("x25519_sec", secB64);
    // setKp({ publicKeyBase64: pubB64, secretKeyBase64: secB64 });
  };

  return { kp, generate };
}

export default function App() {
  const [wallet, setWallet] = useState(null);
  const [address, setAddress] = useState("");
  const [recipients, setRecipients] = useState([]);
  const [toAddr, setToAddr] = useState("");
  const [message, setMessage] = useState("");
  const [inbox, setInbox] = useState([]);
  const { kp, generate } = useLocalKeypair();

  async function connect() {
    const w = await getWallet();
    setWallet(w);
    const addrs = await w.getUsedAddresses();
    const a = addrs?.[0];
    setAddress(a);
  }

  async function register() {
    if (!wallet) throw new Error("Connect wallet first");
    if (!kp) throw new Error("Generate local X25519 keys first");

    // Sign a simple payload to bind address -> pubkey
    const payload = "Mesh Encryption Demo";
    const payloadHex = Buffer.from(payload, "utf8").toString("hex");
    const { coseKeyHex, signatureHex } = await signWithWallet(
      wallet,
      address,
      payloadHex,
    );

    await api.register({
      address,
      payloadHex,
      coseKeyHex,
      signatureHex,
      x25519PublicKeyBase64: kp.publicKeyBase64,
    });
    await refreshRecipients();
  }

  async function refreshRecipients() {
    const r = await api.recipients();
    setRecipients(r.recipients);
  }

  async function send() {
    if (!toAddr) throw new Error("Pick recipient");
    const rec = recipients.find((r) => r.address === toAddr);
    if (!rec) throw new Error("Recipient not found");

    // client-side hybrid encryption (sealed box style)
    // const recipientPub = util.decodeBase64(rec.x25519PublicKeyBase64);
    // const ephem = nacl.box.keyPair();
    // const nonce = nacl.randomBytes(nacl.box.nonceLength);
    // const ciphertext = nacl.box(
    //   util.decodeUTF8(message),
    //   nonce,
    //   recipientPub,
    //   ephem.secretKey,
    // );

    // await api.sendNote({
    //   toAddress: toAddr,
    //   fromAddress: address,
    //   ciphertext: util.encodeBase64(ciphertext),
    //   nonce: util.encodeBase64(nonce),
    //   ephemPublicKey: util.encodeBase64(ephem.publicKey),
    // });
    setMessage("");
  }

  async function loadInbox() {
    if (!address) throw new Error("Connect wallet first");
    const r = await api.fetchNotes(address);
    setInbox(r.notes);
  }

  function decrypt(n) {
    if (!kp) return "(no keys)";
    try {
      // const msg = nacl.box.open(
      //   util.decodeBase64(n.ciphertext),
      //   util.decodeBase64(n.nonce),
      //   util.decodeBase64(n.ephemPublicKey),
      //   util.decodeBase64(kp.secretKeyBase64),
      // );
      // return msg ? util.encodeUTF8(msg) : "(failed)";
    } catch {
      return "(failed)";
    }
  }

  return (
    <div style={{ maxWidth: 750, margin: "2rem auto", fontFamily: "system-ui" }}>
      <h1>Mesh + Express + React: Asymmetric Encryption Demo</h1>

      <section style={{ marginTop: 24 }}>
        <h2>1) Wallet & Local Keys</h2>
        <div>
          <button onClick={connect}>Connect Wallet</button>
          <span style={{ marginLeft: 12 }}>Address: {address || "(not connected)"}</span>
        </div>
        <div style={{ marginTop: 12 }}>
          <button onClick={generate}>Generate Local X25519 Keypair</button>
          <span style={{ marginLeft: 12 }}>
            {kp ? "Keypair ready" : "(no keypair yet)"}
          </span>
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>2) Register</h2>
        <p>
          Bind your encryption public key to your Cardano address by signing with wallet
          (CIP-8).
        </p>
        <button onClick={register} disabled={!wallet || !kp}>
          Register
        </button>
        <button onClick={refreshRecipients} style={{ marginLeft: 8 }}>
          Reload recipients
        </button>
        <div style={{ marginTop: 12 }}>
          <strong>Recipients:</strong>
          <select
            value={toAddr}
            onChange={(e) => setToAddr(e.target.value)}
            style={{ marginLeft: 8 }}
          >
            <option value="">-- select --</option>
            {recipients.map((r) => (
              <option key={r.address} value={r.address}>
                {r.address.slice(0, 24)}…
              </option>
            ))}
          </select>
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>3) Send Encrypted Note</h2>
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Secret message..."
          style={{ width: "100%" }}
        />
        <button onClick={send} disabled={!toAddr || !message}>
          Send
        </button>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>4) Inbox</h2>
        <button onClick={loadInbox} disabled={!address}>
          Load
        </button>
        <ul>
          {inbox.map((n, i) => (
            <li
              key={i}
              style={{ marginTop: 8, borderBottom: "1px solid #ddd", paddingBottom: 8 }}
            >
              <div>
                <strong>From:</strong> {n.fromAddress.slice(0, 24)}…
              </div>
              <div>
                <strong>Decrypted:</strong> {decrypt(n)}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
