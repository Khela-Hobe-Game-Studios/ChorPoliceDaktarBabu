export function getOrCreatePlayerId(): string {
  const KEY = "cp_player_id";
  const existing = localStorage.getItem(KEY);
  if (existing) return existing;
  const id = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string;
  localStorage.setItem(KEY, id);
  return id;
}

export function getDefaultRolesByCount(playerCount: number) {
  // Based on the spec table for 4-14 players
  const table: Record<number, { chor: number; daktar: number; police: number; babu: number }> = {
    4: { chor: 1, daktar: 1, police: 0, babu: 2 },
    5: { chor: 1, daktar: 1, police: 1, babu: 2 },
    6: { chor: 2, daktar: 1, police: 1, babu: 2 },
    7: { chor: 2, daktar: 1, police: 1, babu: 3 },
    8: { chor: 2, daktar: 1, police: 1, babu: 4 },
    9: { chor: 3, daktar: 1, police: 1, babu: 4 },
    10:{ chor: 3, daktar: 1, police: 1, babu: 5 },
    11:{ chor: 3, daktar: 1, police: 1, babu: 6 },
    12:{ chor: 3, daktar: 2, police: 1, babu: 6 },
    13:{ chor: 4, daktar: 2, police: 1, babu: 6 },
    14:{ chor: 4, daktar: 2, police: 1, babu: 7 },
  };
  if (playerCount in table) return table[playerCount as keyof typeof table];
  // Fallback heuristic
  const chor = Math.max(1, Math.round(playerCount * 0.25));
  const daktar = playerCount >= 12 ? 2 : 1;
  const police = 1;
  const babu = Math.max(0, playerCount - (chor + daktar + police));
  return { chor, daktar, police, babu };
}


