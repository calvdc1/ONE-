import { NextRequest, NextResponse } from "next/server";
import { verify } from "@/lib/server/jwt";
import { store } from "@/lib/server/store";

function authPayload(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const secret = process.env.JWT_SECRET || "";
  if (!token || !secret) return null;
  return verify(token, secret);
}

export async function GET(req: NextRequest) {
  const p = authPayload(req);
  if (!p || !p.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = await store.loadDB();
  const u = db.users.find(x => x.id === p.sub);
  if (!u) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ user: store.publicUser(u) });
}

export async function PUT(req: NextRequest) {
  const p = authPayload(req);
  if (!p || !p.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const allowed = ["displayName", "username", "bio", "location", "website", "campus", "avatarUrl", "coverUrl"] as const;
  const patch: Partial<{
    displayName: string;
    username: string;
    bio: string;
    location: string;
    website: string;
    campus?: string | null;
    avatarUrl?: string | null;
    coverUrl?: string | null;
  }> = {};
  for (const k of allowed) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  const next = await store.updateUser(p.sub, patch);
  if (!next) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ user: store.publicUser(next) });
}
