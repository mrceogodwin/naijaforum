/** Private login id derived from public username. Users never type an email. */
export function accountEmail(username: string) {
  const u = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "")
    .slice(0, 24);
  return `${u || "user"}@users.naijaforum.app`;
}

export function publicUsername(raw: string) {
  return raw.trim().replace(/\s+/g, "").slice(0, 24);
}
