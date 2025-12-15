const j = (r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

export const api = {
  async register(body) {
    return fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(j);
  },
  async recipients() {
    return fetch("/api/recipients").then(j);
  },
  async sendNote(body) {
    return fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(j);
  },
  async fetchNotes(address) {
    return fetch(`/api/notes/${address}`).then(j);
  },
};
