import { NextResponse } from "next/server";
import { store, getDefaultSettings } from "@/lib/store";

export async function GET() {
  let settings = await store.getSettings();
  if (!settings) {
    settings = getDefaultSettings();
    await store.setSettings(settings);
  }
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { participants, year, draftOrderSeed } = body;

  if (!participants || !Array.isArray(participants) || participants.length < 2) {
    return NextResponse.json(
      { error: "At least 2 participants are required" },
      { status: 400 }
    );
  }

  const settings = {
    participants,
    year: year || new Date().getFullYear(),
    draftOrderSeed: draftOrderSeed || participants.map((_: string, i: number) => i),
    updatedAt: new Date().toISOString(),
  };

  await store.setSettings(settings);
  return NextResponse.json(settings);
}
