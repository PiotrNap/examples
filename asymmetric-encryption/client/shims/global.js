// src/shims/global.ts
import { Buffer } from "buffer";

// Ensure globalThis.global exists (for Node-targeted deps)
if (typeof globalThis.global === "undefined") {
  globalThis.global = globalThis;
}

// Provide a global Buffer (Node compatibility)
// if (typeof globalThis.Buffer === "undefined") {
globalThis.Buffer = Buffer;
// }

console.log(globalThis.Buffer);
