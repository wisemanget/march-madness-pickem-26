import { NextResponse } from "next/server";
import { store, getDefaultDraftState } from "@/lib/store";
import { TEAMS } from "@/lib/teams";
import { DRAFT_ORDER } from "@/lib/draft-order";

export async function POST(request: Request) {
  const body = await request.json();
  const { participantName, teamName } = body;

  if (!participantName || !teamName) {
    return NextResponse.json(
      { error: "participantName and teamName are required" },
      { status: 400 }
    );
  }

  let state = await store.getDraftState();
  if (!state) {
    state = getDefaultDraftState();
  }

  if (state.status === "complete") {
    return NextResponse.json(
      { error: "Draft is already complete" },
      { status: 400 }
    );
  }

  // Verify it's this participant's turn
  const expectedDrafter = DRAFT_ORDER[state.currentPickIndex];
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
  state.updatedAt = new Date().toISOString();

  if (state.currentPickIndex >= 64) {
    state.status = "complete";
  }

  await store.setDraftState(state);

  return NextResponse.json(state);
}
