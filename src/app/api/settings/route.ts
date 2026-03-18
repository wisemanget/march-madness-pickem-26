import { NextResponse } from "next/server";
import { store, getDefaultSettings } from "@/lib/store";
import { validateAdminPin } from "@/lib/auth";
import { triggerDraftEvent } from "@/lib/pusher";

export async function GET() {
  let settings = await store.getSettings();
  if (!settings) {
    settings = getDefaultSettings();
    await store.setSettings(settings);
  }
  // Backfill new fields
  if (settings.participantPins === undefined) settings.participantPins = {};
  if (settings.adminPin === undefined) settings.adminPin = "1234";
  return NextResponse.json(settings);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { participants, year, draftOrderSeed, participantPins, adminPin, newAdminPin } = body;

  if (!participants || !Array.isArray(participants) || participants.length < 2) {
    return NextResponse.json(
      { error: "At least 2 participants are required" },
      { status: 400 }
    );
  }

  const current = (await store.getSettings()) || getDefaultSettings();

  const settings = {
    participants,
    year: year || new Date().getFullYear(),
    draftOrderSeed: draftOrderSeed || participants.map((_: string, i: number) => i),
    participantPins: participantPins ?? current.participantPins ?? {},
    adminPin: newAdminPin || current.adminPin || "1234",
    updatedAt: new Date().toISOString(),
  };

  await store.setSettings(settings);
  await triggerDraftEvent("settings-updated", settings);
  return NextResponse.json(settings);
}
