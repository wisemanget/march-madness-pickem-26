import { NextResponse } from "next/server";
import { store, getDefaultDraftState } from "@/lib/store";
import { triggerDraftEvent } from "@/lib/pusher";
import { FIRST_FOUR_REPLACEMENTS } from "@/lib/teams";
import { DraftState } from "@/lib/types";

/**
 * Remap pick team names through FIRST_FOUR_REPLACEMENTS so callers see the
 * team that actually advanced (e.g. Texas) instead of the play-in team that
 * was originally drafted (e.g. NC State). The stored draft state keeps the
 * original names so version/history data stays intact.
 */
function normalizePicks(state: DraftState): DraftState {
  const picks = state.picks.map((pick) => {
    const replacement = FIRST_FOUR_REPLACEMENTS[pick.team.name];
    if (!replacement) return pick;
    return { ...pick, team: { ...pick.team, name: replacement } };
  });
  return { ...state, picks };
}

export async function GET() {
  let state = await store.getDraftState();
  if (!state) {
    state = getDefaultDraftState();
    await store.setDraftState(state);
  }
  // Backfill version for old states
  if (state.version === undefined) state.version = 0;
  // Migrate old "waiting" status to "drafting"
  if ((state.status as string) === "waiting") state.status = "drafting";
  return NextResponse.json(normalizePicks(state));
}

export async function POST(request: Request) {
  const body = await request.json();

  if (body.action === "reset") {
    const state = getDefaultDraftState();
    await store.setDraftState(state);
    await triggerDraftEvent("draft-reset", state);
    return NextResponse.json(state);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
