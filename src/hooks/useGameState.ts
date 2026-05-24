import { useEffect, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { db } from '../firebase';
import { checkWinCondition } from '../api/game';
import type { CpdbRole, CpdbPhase } from '@khelahobe/kui/cpdb'

const VALID_ROLES  = new Set(['chor', 'police', 'daktar', 'babu'])
const VALID_PHASES = new Set(['lobby', 'night', 'day', 'voting', 'results'])

function toRole(r: unknown):  CpdbRole  | '' { return typeof r === 'string' && VALID_ROLES.has(r)  ? r as CpdbRole  : '' }
function toPhase(p: unknown): CpdbPhase | null { return typeof p === 'string' && VALID_PHASES.has(p) ? p as CpdbPhase : null }

export function useGameState(gameCode: string, playerId: string) {
  const [players, setPlayers] = useState<Record<string, { name: string; alive?: boolean; role?: CpdbRole | ''; vote?: string | null }>>({});
  const [myRole, setMyRole] = useState<CpdbRole | ''>("");
  const [myAlive, setMyAlive] = useState<boolean>(true);
  const [hostId, setHostId] = useState<string | null>(null);
  const [roles, setRoles] = useState({ chor: 1, daktar: 1, police: 1, babu: 1 });
  const [phase, setPhase] = useState<CpdbPhase | null>(null);
  const [round, setRound] = useState<number>(0);
  const [lastDeath, setLastDeath] = useState<string | null>(null);
  const [lastElimination, setLastElimination] = useState<string | null>(null);
  const [lastInvestigation, setLastInvestigation] = useState<{ policeId: string; targetId: string; isChor: boolean } | null>(null);
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    if (!gameCode) return;
    
    const unsubs: Array<() => void> = [];
    
    // Players listener
    unsubs.push(onValue(ref(db, `games/${gameCode}/players`), (snap) => {
      const raw = snap.val() || {};
      const typed: Record<string, { name: string; alive?: boolean; role?: CpdbRole | '' }> = {}
      for (const [id, p] of Object.entries(raw) as [string, any][]) {
        typed[id] = { name: p.name, alive: p.alive, role: toRole(p.role), vote: p.vote ?? null }
      }
      setPlayers(typed);

      if (raw[playerId]) {
        setMyRole(toRole(raw[playerId].role));
        setMyAlive(raw[playerId].alive !== false);
      }
    }));

    // Game state listeners
    unsubs.push(onValue(ref(db, `games/${gameCode}/hostId`), (snap) => setHostId(snap.val())));
    unsubs.push(onValue(ref(db, `games/${gameCode}/settings/roleConfig`), (snap) => setRoles(snap.val() || { chor: 1, daktar: 1, police: 1, babu: 1 })));
    unsubs.push(onValue(ref(db, `games/${gameCode}/phase`), (snap) => setPhase(toPhase(snap.val()))));
    unsubs.push(onValue(ref(db, `games/${gameCode}/round`), (snap) => setRound(snap.val() || 0)));
    
    // Results listeners
    unsubs.push(onValue(ref(db, `games/${gameCode}/results`), (snap) => {
      const results = snap.val();
      if (results) {
        setLastDeath(results.lastDeath || null);
        setLastElimination(results.lastElimination || null);
        setLastInvestigation(results.lastInvestigation || null);
      } else {
        setLastDeath(null);
        setLastElimination(null);
        setLastInvestigation(null);
      }
    }));

    // Win condition check
    unsubs.push(onValue(ref(db, `games/${gameCode}/players`), (snap) => {
      const all = snap.val() || {};
      const gamePlayersForWinCheck = Object.fromEntries(
        Object.entries(all).map(([id, p]: [string, any]) => [id, {
          name: p.name,
          role: toRole(p.role),
          alive: p.alive !== false
        }])
      );
      const winCondition = checkWinCondition(gamePlayersForWinCheck);
      if (winCondition) {
        setGameEnded(true);
        setWinner(winCondition);
      } else {
        setGameEnded(false);
        setWinner(null);
      }
    }));

    return () => unsubs.forEach(unsub => unsub());
  }, [gameCode, playerId]);

  return {
    players,
    myRole,
    myAlive,
    hostId,
    roles,
    phase,
    round,
    lastDeath,
    lastElimination,
    lastInvestigation,
    gameEnded,
    winner
  };
}
