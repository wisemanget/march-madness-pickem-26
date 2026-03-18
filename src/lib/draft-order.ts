// Snake draft: 1-N, N-1, 1-N, N-1, ... for enough rounds to cover 64 teams
export function generateDraftOrder(participants: string[]): string[] {
  const n = participants.length;
  if (n === 0) return [];
  const totalPicks = 64;
  const rounds = Math.ceil(totalPicks / n);
  const order: string[] = [];
  for (let round = 0; round < rounds; round++) {
    const names = [...participants];
    if (round % 2 === 1) names.reverse();
    order.push(...names);
  }
  return order.slice(0, totalPicks);
}

export function getCurrentDrafter(pickIndex: number, participants: string[]): string {
  const order = generateDraftOrder(participants);
  return order[pickIndex] || "";
}

export function getCurrentRound(pickIndex: number, participantCount: number): number {
  if (participantCount === 0) return 1;
  return Math.floor(pickIndex / participantCount) + 1;
}

export function getPickInRound(pickIndex: number, participantCount: number): number {
  if (participantCount === 0) return 1;
  return (pickIndex % participantCount) + 1;
}
