import { NextResponse } from "next/server";
import { store, getDefaultDraftState } from "@/lib/store";
import { validateParticipantPin } from "@/lib/auth";
import { triggerDraftEvent } from "@/lib/pusher";

export async function POST(request: Request) {
  const body = await request.json();
  const { participantName, pin } = body;

  if (!participantName) {
    return NextResponse.json(
      { error: "participantName is required" },
      { status: 400 }
    );
  }

  // Validate PIN
  const valid = await validateParticipantPin(participantName, pin);
  if (!valid) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 403 });
  }

  let state = await store.getDraftState();
  if (!state) {
    state = getDefaultDraftState();
  }

  if (state.status !== "waiting") {
    return NextResponse.json(
      { error: "Draft is not in waiting state" },
      { status: 400 }
    );
  }

  if (!state.readyParticipants.includes(participantName)) {
    state.readyParticipants.push(participantName);
  }

  state.version++;
  state.updatedAt = new Date().toISOString();
  await store.setDraftState(state);

  await triggerDraftEvent("draft-updated", state);

  return NextResponse.json(state);
}
