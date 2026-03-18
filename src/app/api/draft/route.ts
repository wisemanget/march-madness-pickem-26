import { NextResponse } from "next/server";
import { store, getDefaultDraftState } from "@/lib/store";

export async function GET() {
  let state = await store.getDraftState();
  if (!state) {
    state = getDefaultDraftState();
    await store.setDraftState(state);
  }
  return NextResponse.json(state);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (body.action === "reset") {
    const state = getDefaultDraftState();
    await store.setDraftState(state);
    return NextResponse.json(state);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
