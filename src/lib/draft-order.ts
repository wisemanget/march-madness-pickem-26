import { PARTICIPANTS } from "./types";

// Snake draft: 1-8, 8-1, 1-8, 8-1, ... for 8 rounds = 64 picks
export function generateDraftOrder(): string[] {
  const order: string[] = [];
  for (let round = 0; round < 8; round++) {
    const names = [...PARTICIPANTS];
    if (round % 2 === 1) names.reverse();
    order.push(...names);
  }
  return order;
}

export const DRAFT_ORDER = generateDraftOrder();

export function getCurrentDrafter(pickIndex: number): string {
  return DRAFT_ORDER[pickIndex];
}

export function getCurrentRound(pickIndex: number): number {
  return Math.floor(pickIndex / 8) + 1;
}

export function getPickInRound(pickIndex: number): number {
  return (pickIndex % 8) + 1;
}
