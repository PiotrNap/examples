import { BrowserWallet, resolveDataHash } from "@meshsdk/core";

// Connect to a CIP-30 wallet
export async function getWallet() {
  const wallets = await BrowserWallet.getAvailableWallets();
  if (!wallets.length) throw new Error("No CIP-30 wallet found");
  const wallet = await BrowserWallet.enable(wallets[0].name);
  return wallet;
}

// Ask wallet to sign arbitrary data (CIP-8)
export async function signWithWallet(wallet, addressBech32, payloadHex) {
  // Mesh: wallet.signData(address, payload)
  const { key, signature } = await wallet.signData(addressBech32, payloadHex);
  // key/signature are COSE objects, hex strings
  return { coseKeyHex: key, signatureHex: signature };
}
