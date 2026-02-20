import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/server/store";
import { sign } from "@/lib/server/jwt";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.email || !body.password) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const u = await store.findUserByEmail(body.email);
  if (!u) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!store.verifyPassword(body.password, u.passwordHash)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const secret = process.env.JWT_SECRET || "";
  if (!secret) return NextResponse.json({ error: "secret" }, { status: 500 });
  const token = sign({ sub: u.id, email: u.email }, secret);
  return NextResponse.json({ token, user: store.publicUser(u) });
}
