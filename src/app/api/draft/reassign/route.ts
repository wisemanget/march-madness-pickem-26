import { NextResponse } from "next/server";
import { store, getDefaultDraftState } from "@/lib/store";
import { triggerDraftEvent } from "@/lib/pusher";

export async function POST(request: Request) {
  const body = await request.json();
  const { teamName, newOwner } = body;

  if (!teamName || !newOwner) {
    return NextResponse.json(
      { error: "teamName and newOwner are required" },
      { status: 400 }
    );
  }

  let state = await store.getDraftState();
  if (!state) {
    state = getDefaultDraftState();
  }

  const pickIndex = state.picks.findIndex((p) => p.team.name === teamName);
  if (pickIndex === -1) {
    return NextResponse.json(
      { error: `Team "${teamName}" has not been drafted` },
      { status: 400 }
    );
  }

  state.picks[pickIndex].participantName = newOwner;
  state.version = (state.version ?? 0) + 1;
  state.updatedAt = new Date().toISOString();

  await store.setDraftState(state);
  await triggerDraftEvent("draft-updated", state);

  return NextResponse.json(state);
}
