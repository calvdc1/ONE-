import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/server/store";
import { sign } from "@/lib/server/jwt";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.email || !body.password) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const u = await store.createUser(body.email, body.password, body.displayName);
  if (!u) return NextResponse.json({ error: "exists" }, { status: 409 });
  const secret = process.env.JWT_SECRET || "";
  if (!secret) return NextResponse.json({ error: "secret" }, { status: 500 });
  const token = sign({ sub: u.id, email: u.email }, secret);
  return NextResponse.json({ token, user: store.publicUser(u) });
}
