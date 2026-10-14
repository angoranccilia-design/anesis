import { NextResponse } from "next/server";
import { DEMO_COOKIE } from "@/lib/demo";
export async function POST(req: Request) { const res = NextResponse.redirect(new URL("/console/login", req.url), { status: 303 }); res.cookies.delete(DEMO_COOKIE); return res; }
