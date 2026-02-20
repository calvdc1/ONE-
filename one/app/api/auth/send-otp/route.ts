import { NextRequest, NextResponse } from "next/server";
import { randomInt, createHash } from "node:crypto";
import { sendEmail } from "@/lib/server/mailer";

function hash(code: string, email: string) {
  const salt = process.env.OTP_SALT || "otp-demo-salt";
  return createHash("sha256").update(`${email}:${code}:${salt}`).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }
    const code = String(randomInt(100000, 1000000));
    const h = hash(code, email);
    const exp = Date.now() + 5 * 60 * 1000;

    const res = NextResponse.json({ ok: true });
    res.cookies.set("otp_meta", JSON.stringify({ email, h, exp }), {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 300,
    });

    await sendEmail(
      email,
      "Your ONE MSU verification code",
      `Your verification code is: ${code}\nThis code expires in 5 minutes.`
    );

    return res;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
}

