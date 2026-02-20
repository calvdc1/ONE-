import { NextRequest, NextResponse } from "next/server";
import { verify } from "@/lib/server/jwt";
import { store } from "@/lib/server/store";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const secret = process.env.JWT_SECRET || "";
  if (!token || !secret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const payload = verify(token, secret);
  if (!payload || !payload.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = await store.loadDB();
  const u = db.users.find(x => x.id === payload.sub);
  if (!u) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ user: store.publicUser(u) });
}
