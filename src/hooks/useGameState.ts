import { useEffect, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { db } from '../firebase';
import { checkWinCondition } from '../api/game';

export function useGameState(gameCode: string, playerId: string) {
  const [players, setPlayers] = useState<Record<string, { name: string; alive?: boolean; role?: string }>>({});
  const [myRole, setMyRole] = useState<string>("");
  const [myAlive, setMyAlive] = useState<boolean>(true);
  const [hostId, setHostId] = useState<string | null>(null);
  const [roles, setRoles] = useState({ chor: 1, daktar: 1, police: 0, babu: 2 });
  const [phase, setPhase] = useState<string | null>(null);
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
      const all = snap.val() || {};
      setPlayers(all);
      
      if (all[playerId]) {
        setMyRole(all[playerId].role || "");
        setMyAlive(all[playerId].alive !== false);
      }
    }));

    // Game state listeners
    unsubs.push(onValue(ref(db, `games/${gameCode}/hostId`), (snap) => setHostId(snap.val())));
    unsubs.push(onValue(ref(db, `games/${gameCode}/roles`), (snap) => setRoles(snap.val() || { chor: 1, daktar: 1, police: 0, babu: 2 })));
    unsubs.push(onValue(ref(db, `games/${gameCode}/phase`), (snap) => setPhase(snap.val())));
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
          role: p.role || '', 
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
