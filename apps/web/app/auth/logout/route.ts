import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  const res = NextResponse.redirect(new URL("/login", new URL(request.url).origin), { status: 303 });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
