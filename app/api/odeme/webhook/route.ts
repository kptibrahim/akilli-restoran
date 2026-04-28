// TODO: iyzico webhook handler
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Henüz aktif değil" }, { status: 501 });
}
