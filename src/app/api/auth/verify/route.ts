import { NextResponse } from "next/server";
import { validateParticipantPin, validateAdminPin } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const { participantName, pin, adminPin } = body;

  if (adminPin !== undefined) {
    const valid = await validateAdminPin(adminPin);
    return NextResponse.json({ valid });
  }

  if (participantName && pin !== undefined) {
    const valid = await validateParticipantPin(participantName, pin);
    return NextResponse.json({ valid });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
