import { NextResponse } from "next/server";
import { store, getDefaultDraftState, getDefaultSettings } from "@/lib/store";
import { TEAMS } from "@/lib/teams";
import { generateDraftOrder } from "@/lib/draft-order";
import { triggerDraftEvent } from "@/lib/pusher";

export async function POST() {
  let state = await store.getDraftState();
  if (!state) {
    state = getDefaultDraftState();
  }

  if (state.status !== "drafting") {
    return NextResponse.json(
      { error: "Draft is not active" },
      { status: 400 }
    );
  }

  // Check if timer has expired
  if (state.pickDeadline) {
    const deadline = new Date(state.pickDeadline).getTime();
    // Allow 2s grace period for network delays
    if (Date.now() < deadline - 2000) {
      return NextResponse.json(
        { error: "Timer has not expired yet" },
        { status: 400 }
      );
    }
  }

  const settings = (await store.getSettings()) || getDefaultSettings();
  const participants = settings.participants;
  const draftOrder = generateDraftOrder(participants);
  const totalPicks = draftOrder.length;
  const currentDrafter = draftOrder[state.currentPickIndex];

  if (!currentDrafter) {
    return NextResponse.json(
      { error: "No current drafter" },
      { status: 400 }
    );
  }

  // Pick the best available team (lowest seed number = best)
  const pickedNames = new Set(state.picks.map((p) => p.team.name));
  const available = TEAMS.filter((t) => !pickedNames.has(t.name)).sort(
    (a, b) => a.seed - b.seed || a.region.localeCompare(b.region)
  );

  if (available.length === 0) {
    return NextResponse.json(
      { error: "No teams available" },
      { status: 400 }
    );
  }

  const team = available[0];

  state.picks.push({
    pickNumber: state.currentPickIndex + 1,
    participantName: currentDrafter,
    team,
    timestamp: new Date().toISOString(),
  });

  state.currentPickIndex++;
  state.version++;
  state.updatedAt = new Date().toISOString();

  if (state.currentPickIndex >= totalPicks) {
    state.status = "complete";
    state.pickDeadline = null;
  } else if (state.pickTimerSeconds > 0) {
    state.pickDeadline = new Date(
      Date.now() + state.pickTimerSeconds * 1000
    ).toISOString();
  }

  await store.setDraftState(state);
  await triggerDraftEvent("draft-updated", state);

  return NextResponse.json(state);
}
