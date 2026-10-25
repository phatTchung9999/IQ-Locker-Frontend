// The handle is presentation only. The server identifies accounts through JWTs.
export function accountHandle(fullname) {
  const parts = fullname.trim().split(/\s+/);
  const clean = (value) => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}-]/gu, '');
  const first = clean(parts[0]);
  const last = clean(parts[parts.length - 1]);
  return `${Array.from(first)[0] || 's'}_${last || 'student'}`;
}

export function accountPath(user) {
  return `/${encodeURIComponent(accountHandle(user.fullname))}`;
}

// Profile display only: persistence remains a single fullname string.
export function splitFullname(fullname) {
  const [firstName = '', ...rest] = fullname.trim().split(/\s+/);
  return { firstName, lastName: rest.join(' ') };
}
