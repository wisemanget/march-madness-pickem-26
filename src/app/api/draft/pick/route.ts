import { NextResponse } from "next/server";
import { store, getDefaultDraftState, getDefaultSettings } from "@/lib/store";
import { TEAMS } from "@/lib/teams";
import { generateDraftOrder } from "@/lib/draft-order";
import { validateParticipantPin } from "@/lib/auth";
import { triggerDraftEvent } from "@/lib/pusher";

const MAX_RETRIES = 3;

export async function POST(request: Request) {
  const body = await request.json();
  const { participantName, teamName, pin } = body;

  if (!participantName || !teamName) {
    return NextResponse.json(
      { error: "participantName and teamName are required" },
      { status: 400 }
    );
  }

  // Validate PIN
  const validPin = await validateParticipantPin(participantName, pin);
  if (!validPin) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 403 });
  }

  // Optimistic locking retry loop
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let state = await store.getDraftState();
    if (!state) {
      state = getDefaultDraftState();
    }

    const expectedVersion = state.version ?? 0;

    if (state.status !== "drafting") {
      return NextResponse.json(
        { error: "Draft is not active" },
        { status: 400 }
      );
    }

    // Get dynamic participants
    const settings = (await store.getSettings()) || getDefaultSettings();
    const participants = settings.participants;
    const draftOrder = generateDraftOrder(participants);
    const totalPicks = draftOrder.length;

    // Verify it's this participant's turn
    const expectedDrafter = draftOrder[state.currentPickIndex];
    if (participantName !== expectedDrafter) {
      return NextResponse.json(
        { error: `It's ${expectedDrafter}'s turn, not ${participantName}'s` },
        { status: 400 }
      );
    }

    // Verify team exists
    const team = TEAMS.find((t) => t.name === teamName);
    if (!team) {
      return NextResponse.json(
        { error: `Team "${teamName}" not found` },
        { status: 400 }
      );
    }

    // Verify team hasn't been picked
    const alreadyPicked = state.picks.some((p) => p.team.name === teamName);
    if (alreadyPicked) {
      return NextResponse.json(
        { error: `${teamName} has already been drafted` },
        { status: 400 }
      );
    }

    // Make the pick
    state.picks.push({
      pickNumber: state.currentPickIndex + 1,
      participantName,
      team,
      timestamp: new Date().toISOString(),
    });

    state.currentPickIndex++;
    state.version = expectedVersion + 1;
    state.updatedAt = new Date().toISOString();

    if (state.currentPickIndex >= totalPicks) {
      state.status = "complete";
      state.pickDeadline = null;
    } else if (state.pickTimerSeconds > 0) {
      state.pickDeadline = new Date(
        Date.now() + state.pickTimerSeconds * 1000
      ).toISOString();
    }

    // Attempt to write with version check
    const success = await store.setDraftStateIfVersion(state, expectedVersion);
    if (success) {
      await triggerDraftEvent("draft-updated", state);
      return NextResponse.json(state);
    }

    // Version mismatch — retry
  }

  return NextResponse.json(
    { error: "Concurrent modification, please try again" },
    { status: 409 }
  );
}
