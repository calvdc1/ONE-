import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

function hash(code: string, email: string) {
  const salt = process.env.OTP_SALT || "otp-demo-salt";
  return createHash("sha256").update(`${email}:${code}:${salt}`).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) return NextResponse.json({ ok: false }, { status: 400 });

    const cookie = req.cookies.get("otp_meta")?.value;
    if (!cookie) return NextResponse.json({ ok: false }, { status: 401 });
    let meta: { email: string; h: string; exp: number };
    try {
      meta = JSON.parse(cookie);
    } catch {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    if (meta.email !== email) return NextResponse.json({ ok: false }, { status: 401 });
    if (Date.now() > meta.exp) return NextResponse.json({ ok: false, expired: true }, { status: 401 });
    const isValid = meta.h === hash(String(code), email);
    if (!isValid) return NextResponse.json({ ok: false }, { status: 401 });

    const res = NextResponse.json({ ok: true });
    // Mark verified for this session for a short time
    res.cookies.set("otp_verified", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60,
    });
    // Clear meta cookie
    res.cookies.set("otp_meta", "", { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 0 });
    return res;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}

