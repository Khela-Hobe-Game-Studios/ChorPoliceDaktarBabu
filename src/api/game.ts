import { db } from "../firebase";
import { ref, get, set, child, update } from "firebase/database";
import type { GameState, RoleConfig, PlayerState } from "../types";

export function generateGameCode(): string {
  // 4-digit numeric code (1000-9999)
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  return code;
}

export async function createGame(hostId: string): Promise<string> {
  // Try a few times to avoid collisions
  for (let i = 0; i < 5; i++) {
    const code = generateGameCode();
    const gameRef = ref(db, `games/${code}`);
    const exists = await get(gameRef).then(s => s.exists());
    if (exists) continue;

    const initial: GameState = {
      hostId,
      status: "lobby",
      phase: null,
      round: 0,
      settings: {
        maxPlayers: 14,
        roleConfig: { chor: 1, daktar: 1, police: 1, babu: 1 },
        timerDurations: {},
      },
      players: {},
      results: { lastDeath: null, lastElimination: null },
    };

    await set(gameRef, initial);
    return code;
  }
  throw new Error("Failed to create unique game code");
}

export async function joinGame(gameCode: string, playerId: string, name: string): Promise<void> {
  const gameSnap = await get(child(ref(db), `games/${gameCode}`));
  if (!gameSnap.exists()) throw new Error("Game not found");

  // Get current players to verify we're not overwriting
  const playersSnap = await get(child(ref(db), `games/${gameCode}/players`));
  const currentPlayers = playersSnap.val() as Record<string, any> || {};
  console.log('Current players before join:', Object.keys(currentPlayers));

  // Use update to ensure we're adding to existing players, not replacing
  const updates: Record<string, unknown> = {};
  updates[`games/${gameCode}/players/${playerId}`] = {
    name,
    role: "",
    alive: true,
    action: null,
    vote: null,
  };
  await update(ref(db), updates);
  
  // Verify the update worked
  const updatedPlayersSnap = await get(child(ref(db), `games/${gameCode}/players`));
  const updatedPlayers = updatedPlayersSnap.val() as Record<string, any> || {};
  console.log('Players after join:', Object.keys(updatedPlayers));
}

export async function updateRoleConfig(gameCode: string, roleConfig: RoleConfig): Promise<void> {
  await update(ref(db, `games/${gameCode}/settings`), { roleConfig });
}

export async function startGame(gameCode: string): Promise<void> {
  await update(ref(db, `games/${gameCode}`), {
    status: "playing",
    phase: "night",
    round: 1,
    timer: { running: false, seconds: 120, endAt: null, updatedAt: Date.now() }
  });
  await assignRoles(gameCode)
}

export async function nextPhase(gameCode: string): Promise<void> {
  const gameRef = ref(db, `games/${gameCode}`)
  const snap = await get(gameRef)
  if (!snap.exists()) return
  const { phase, round } = snap.val() as { phase: string; round: number }
  let next = "day"
  let nextRound = round
  if (phase === "night") next = "day"
  else if (phase === "day") next = "voting"
  else if (phase === "voting") { next = "night"; nextRound = round + 1 }
  await update(gameRef, { phase: next, round: nextRound })
}

export async function setTimerStart(gameCode: string): Promise<void> {
  const timerRef = ref(db, `games/${gameCode}/timer`)
  const snap = await get(timerRef)
  const cur = (snap.val() as { seconds?: number } | null) ?? { seconds: 120 }
  const seconds = typeof cur.seconds === 'number' ? cur.seconds : 120
  await update(timerRef, { running: true, endAt: Date.now() + seconds * 1000, updatedAt: Date.now() })
}

export async function setTimerPause(gameCode: string): Promise<void> {
  const timerRef = ref(db, `games/${gameCode}/timer`)
  const snap = await get(timerRef)
  const cur = (snap.val() as { endAt?: number; running?: boolean; seconds?: number } | null) ?? {}
  const now = Date.now()
  const remaining = cur.endAt ? Math.max(0, Math.ceil((cur.endAt - now) / 1000)) : (cur.seconds ?? 120)
  await update(timerRef, { running: false, endAt: null, seconds: remaining, updatedAt: now })
}

export async function setTimerReset(gameCode: string, seconds: number = 120): Promise<void> {
  const timerRef = ref(db, `games/${gameCode}/timer`)
  await update(timerRef, { running: false, endAt: null, seconds, updatedAt: Date.now() })
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function assignRoles(gameCode: string): Promise<void> {
  const root = ref(db)
  const [playersSnap, settingsSnap] = await Promise.all([
    get(child(root, `games/${gameCode}/players`)),
    get(child(root, `games/${gameCode}/settings/roleConfig`)),
  ])
  if (!playersSnap.exists()) return
  const players = playersSnap.val() as Record<string, PlayerState>
  const roleConfig = (settingsSnap.val() as RoleConfig) || { chor: 1, daktar: 1, police: 1, babu: 1 }
  const playerIds = Object.keys(players)
  const total = playerIds.length
  const fixed = roleConfig.chor + roleConfig.daktar + roleConfig.police
  const babu = Math.max(0, total - fixed)
  const counts = {
    chor: roleConfig.chor,
    daktar: roleConfig.daktar,
    police: roleConfig.police,
    babu,
  }
  const pool: string[] = []
  Object.entries(counts).forEach(([role, count]) => {
    for (let i = 0; i < count; i++) pool.push(role)
  })
  const shuffledRoles = shuffle(pool)
  const shuffledPlayers = shuffle(playerIds)
  const updates: Record<string, unknown> = {}
  shuffledPlayers.forEach((pid, idx) => {
    updates[`games/${gameCode}/players/${pid}/role`] = shuffledRoles[idx] || "babu"
  })
  await update(ref(db), updates)
}

export async function setNightAction(gameCode: string, playerId: string, action: { type: "chor" | "daktar" | "police"; target: string }): Promise<void> {
  await set(ref(db, `games/${gameCode}/players/${playerId}/action`), action)
}

export async function setVote(gameCode: string, voterId: string, targetId: string): Promise<void> {
  await set(ref(db, `games/${gameCode}/players/${voterId}/vote`), targetId)
}

export async function finalizeVote(gameCode: string): Promise<void> {
  const root = ref(db)
  const [playersSnap, gameSnap] = await Promise.all([
    get(child(root, `games/${gameCode}/players`)),
    get(child(root, `games/${gameCode}`)),
  ])
  if (!playersSnap.exists() || !gameSnap.exists()) return
  const players = playersSnap.val() as Record<string, PlayerState>
  const game = gameSnap.val() as GameState
  const livingIds = Object.entries(players).filter(([,p]) => p.alive !== false).map(([id]) => id)
  const votes: Record<string, number> = {}
  livingIds.forEach((pid) => {
    const v = players[pid]?.vote
    if (v) votes[v] = (votes[v] ?? 0) + 1
  })
  let topId: string | null = null
  let topCount = 0
  Object.entries(votes).forEach(([tid, cnt]) => {
    if (cnt > topCount) { topCount = cnt; topId = tid }
  })
  const majority = Math.floor(livingIds.length / 2) + 1
  const eliminatedId = (topId && topCount >= majority) ? topId : null

  const updates: Record<string, unknown> = {}
  updates[`games/${gameCode}/results/lastElimination`] = eliminatedId
  if (eliminatedId) updates[`games/${gameCode}/players/${eliminatedId}/alive`] = false
  // Clear votes for next round
  Object.keys(players).forEach((pid) => {
    updates[`games/${gameCode}/players/${pid}/vote`] = null
  })
  // Next phase
  updates[`games/${gameCode}/phase`] = "night"
  updates[`games/${gameCode}/round`] = (game.round ?? 1) + 1
  await update(ref(db), updates)
}

export async function resolveNight(gameCode: string): Promise<void> {
  const root = ref(db)
  const [playersSnap] = await Promise.all([
    get(child(root, `games/${gameCode}/players`)),
  ])
  if (!playersSnap.exists()) return
  const players = playersSnap.val() as Record<string, PlayerState>

  // Gather actions
  const chorVotes: Record<string, number> = {}
  let daktarTarget: string | null = null
  let policeInvestigation: { policeId: string; targetId: string; isChor: boolean } | null = null

  for (const [pid, p] of Object.entries(players)) {
    const act = p.action as { type?: 'chor' | 'daktar' | 'police'; target?: string } | null
    if (!act) continue
    if (act.type === 'chor' && act.target) {
      chorVotes[act.target] = (chorVotes[act.target] ?? 0) + 1
    } else if (act.type === 'daktar' && act.target) {
      daktarTarget = act.target
    } else if (act.type === 'police' && act.target) {
      const isChor = (players[act.target]?.role === 'chor')
      policeInvestigation = { policeId: pid, targetId: act.target, isChor }
    }
  }

  // Determine chor victim
  let victim: string | null = null
  let top = 0
  for (const [tid, cnt] of Object.entries(chorVotes)) {
    if (cnt > top) { top = cnt; victim = tid }
  }
  // Apply daktar save
  if (victim && daktarTarget === victim) {
    victim = null
  }

  const updates: Record<string, unknown> = {}
  if (victim) updates[`games/${gameCode}/players/${victim}/alive`] = false
  updates[`games/${gameCode}/results/lastDeath`] = victim
  updates[`games/${gameCode}/results/lastInvestigation`] = policeInvestigation ?? null
  // Clear actions
  for (const pid of Object.keys(players)) {
    updates[`games/${gameCode}/players/${pid}/action`] = null
  }
  // Clear actions and update results
  await update(ref(db), updates)
  
  // Move to next phase (day -> voting)
  await nextPhase(gameCode)
}

export function checkWinCondition(players: Record<string, PlayerState>): 'chor' | 'village' | null {
  const living = Object.values(players).filter(p => p.alive !== false)
  const livingChor = living.filter(p => p.role === 'chor').length
  const livingNonChor = living.length - livingChor
  if (livingChor <= 0) return 'village'
  if (livingChor >= livingNonChor) return 'chor'
  return null
}

export async function restartGame(gameCode: string): Promise<void> {
  const gameRef = ref(db, `games/${gameCode}`);
  const gameSnap = await get(gameRef);
  if (!gameSnap.exists()) throw new Error("Game not found");

  const gameData = gameSnap.val();
  const players = gameData.players || {};
  
  // Reset all players to alive and clear their roles
  const resetPlayers: Record<string, any> = {};
  Object.keys(players).forEach(playerId => {
    resetPlayers[`players/${playerId}/alive`] = true;
    resetPlayers[`players/${playerId}/role`] = "";
    resetPlayers[`players/${playerId}/action`] = null;
    resetPlayers[`players/${playerId}/vote`] = null;
  });

  // Reset game state
  const updates = {
    ...resetPlayers,
    phase: null,
    round: 0,
    results: null,
    gameEnded: false,
    winner: null,
    announcements: null
  };

  await update(gameRef, updates);
}



