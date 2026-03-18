import { NextResponse } from "next/server";
import { store, getDefaultDraftState, getDefaultSettings } from "@/lib/store";
import { validateAdminPin } from "@/lib/auth";
import { triggerDraftEvent } from "@/lib/pusher";
import { generateDraftOrder } from "@/lib/draft-order";

export async function GET() {
  let state = await store.getDraftState();
  if (!state) {
    state = getDefaultDraftState();
    await store.setDraftState(state);
  }
  // Backfill version for old states
  if (state.version === undefined) state.version = 0;
  if (state.pickTimerSeconds === undefined) state.pickTimerSeconds = 90;
  if (state.pickDeadline === undefined) state.pickDeadline = null;
  if (state.readyParticipants === undefined) state.readyParticipants = [];
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (body.action === "reset") {
    const state = getDefaultDraftState();
    await store.setDraftState(state);
    await triggerDraftEvent("draft-reset", state);
    return NextResponse.json(state);
  }

  if (body.action === "start") {
    // Validate admin or allow if all ready
    let state = await store.getDraftState();
    if (!state) state = getDefaultDraftState();

    if (state.status !== "waiting") {
      return NextResponse.json(
        { error: "Draft is not in waiting state" },
        { status: 400 }
      );
    }

    const settings = (await store.getSettings()) || getDefaultSettings();
    const allReady = settings.participants.every((p) =>
      state!.readyParticipants.includes(p)
    );

    if (!allReady) {
      return NextResponse.json(
        { error: "Not all participants are ready" },
        { status: 400 }
      );
    }

    state.status = "drafting";
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

  if (body.action === "configure-timer") {
    const { pickTimerSeconds, adminPin } = body;
    const validAdmin = await validateAdminPin(adminPin);
    if (!validAdmin) {
      return NextResponse.json({ error: "Invalid admin PIN" }, { status: 403 });
    }

    let state = await store.getDraftState();
    if (!state) state = getDefaultDraftState();

    state.pickTimerSeconds = Math.max(0, Math.min(600, pickTimerSeconds || 0));
    state.version++;
    state.updatedAt = new Date().toISOString();
    await store.setDraftState(state);
    await triggerDraftEvent("draft-updated", state);

    return NextResponse.json(state);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
