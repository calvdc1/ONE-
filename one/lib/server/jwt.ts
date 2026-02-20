import crypto from "crypto";

const b64url = (buf: Buffer) =>
  buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

export function sign(payload: Record<string, unknown>, secret: string, expiresInSec: number = 60 * 60 * 24 * 7) {
  const header = { alg: "HS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSec;
  const body = { ...payload, iat, exp };
  const headerB64 = b64url(Buffer.from(JSON.stringify(header)));
  const payloadB64 = b64url(Buffer.from(JSON.stringify(body)));
  const data = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  const sigB64 = b64url(sig);
  return `${data}.${sigB64}`;
}

export function verify(token: string, secret: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const expected = b64url(crypto.createHmac("sha256", secret).update(data).digest());
  if (expected !== s) return null;
  try {
    const payload = JSON.parse(Buffer.from(p, "base64").toString("utf8"));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
