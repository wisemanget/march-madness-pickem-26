import { NextResponse } from "next/server";
import { store, getDefaultDraftState } from "@/lib/store";
import { validateParticipantPin, validateAdminPin } from "@/lib/auth";
import { triggerDraftEvent } from "@/lib/pusher";

export async function POST(request: Request) {
  const body = await request.json();
  const { participantName, pin, adminPin } = body;

  let state = await store.getDraftState();
  if (!state) {
    state = getDefaultDraftState();
  }

  if (state.picks.length === 0) {
    return NextResponse.json(
      { error: "No picks to undo" },
      { status: 400 }
    );
  }

  const lastPick = state.picks[state.picks.length - 1];

  // Must be admin or the person whose pick is being undone
  const isAdmin = adminPin ? await validateAdminPin(adminPin) : false;
  const isOwner =
    participantName === lastPick.participantName &&
    (await validateParticipantPin(participantName, pin));

  if (!isAdmin && !isOwner) {
    return NextResponse.json(
      { error: "Only admin or the pick owner can undo" },
      { status: 403 }
    );
  }

  // Remove last pick
  state.picks.pop();
  state.currentPickIndex = Math.max(0, state.currentPickIndex - 1);
  state.status = "drafting";

  // Reset timer for restored turn
  if (state.pickTimerSeconds > 0) {
    state.pickDeadline = new Date(
      Date.now() + state.pickTimerSeconds * 1000
    ).toISOString();
  }

  state.version++;
  state.updatedAt = new Date().toISOString();
  await store.setDraftState(state);

  await triggerDraftEvent("draft-updated", state);

  return NextResponse.json(state);
}
