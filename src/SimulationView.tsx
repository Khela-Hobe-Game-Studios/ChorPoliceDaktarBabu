import './styles/simulation.scss'
import { useEffect, useRef, useState } from 'react'
import { ref, update, onValue } from 'firebase/database'
import { db } from './firebase'
import {
  createGame, joinGame, updateRoleConfig, startGame,
  setNightAction, setVote, resolveNight, finalizeVote, nextPhase, checkWinCondition
} from './api/game'
import type { PlayerState } from './types'

const HOST_ID = 'sim_host_spectator'

const SIM_PLAYERS = [
  { id: 'sim_p1', name: 'Alice',   role: 'police' },
  { id: 'sim_p2', name: 'Bob',     role: 'chor'   },
  { id: 'sim_p3', name: 'Charlie', role: 'daktar' },
  { id: 'sim_p4', name: 'Diana',   role: 'babu'   },
  { id: 'sim_p5', name: 'Eve',     role: 'babu'   },
]

const ROLE_EMOJI: Record<string, string> = {
  police: '👮', chor: '🦹', daktar: '💊', babu: '👤',
}
const ROLE_LABEL: Record<string, string> = {
  police: 'Police', chor: 'Chor', daktar: 'Daktar', babu: 'Babu',
}
const ROLE_ACTION: Record<string, string> = {
  police: 'Investigate a player',
  chor:   'Choose a target to eliminate',
  daktar: 'Choose a player to save',
  babu:   '',
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

// 4 panes: skip Eve (5th player) since 2×2 = 4 slots
const PANE_PLAYERS = SIM_PLAYERS.slice(0, 4)

interface PanePlayer { id: string; name: string; role: string; alive: boolean }

interface PlayerPaneProps {
  pane: PanePlayer
  allPlayers: PanePlayer[]
  gameCode: string | null
  phase: string | null
  round: number | null
  gameSnap: any
  winner: string | null
}

function PlayerPane({ pane, allPlayers, gameCode, phase, round, gameSnap, winner }: PlayerPaneProps) {
  const otherPlayers = allPlayers.filter(p => p.id !== pane.id)
  const playerData   = gameSnap?.players?.[pane.id]
  const nightAction  = playerData?.nightAction
  const vote         = playerData?.vote
  const investigation: { policeId: string; targetId: string; isChor: boolean } | null =
    gameSnap?.results?.lastInvestigation ?? null

  const phaseLabel: Record<string, string> = {
    night: '🌙 Night', day: '☀️ Day', voting: '🗳️ Voting',
  }

  return (
    <div className={`sim-pane sim-pane--${pane.role}${!pane.alive ? ' sim-pane--eliminated' : ''}`}>
      {/* Header */}
      <div className="sim-pane-header">
        <span className="sim-pane-name">
          {pane.name}
          {!pane.alive && <span className="sim-pane-elim-tag"> · Eliminated</span>}
        </span>
        <span className="sim-pane-gamecode">{gameCode ?? '…'}</span>
      </div>

      {/* Phase + round */}
      {phase && (
        <div className="sim-pane-phase-row">
          <span className={`sim-pane-phase-chip sim-pane-phase-chip--${phase}`}>
            {phaseLabel[phase] ?? phase}
          </span>
          {round != null && round > 0 && (
            <span className="sim-pane-round">Round {round}</span>
          )}
        </div>
      )}

      {/* Role block */}
      <div className="sim-pane-role-block">
        <span className="sim-pane-role-emoji">{ROLE_EMOJI[pane.role]}</span>
        <div>
          <div className="sim-pane-role-eyebrow">Your Role</div>
          <div className="sim-pane-role-name">{ROLE_LABEL[pane.role]}</div>
        </div>
      </div>

      {/* Player list */}
      <div className="sim-pane-section-label">Players</div>
      <ul className="sim-pane-players">
        {otherPlayers.map(p => {
          const isIdentifiedChor =
            pane.role === 'police' &&
            investigation?.policeId === pane.id &&
            investigation?.targetId === p.id &&
            investigation?.isChor
          return (
            <li
              key={p.id}
              className={[
                'sim-pane-player',
                !p.alive            ? 'sim-pane-player--dead'       : '',
                isIdentifiedChor    ? 'sim-pane-player--chor-intel'  : '',
              ].filter(Boolean).join(' ')}
            >
              <span className="sim-pane-player-icon">{p.alive ? '👤' : '💀'}</span>
              <span className="sim-pane-player-name">{p.name}</span>
              {isIdentifiedChor && <span className="sim-pane-intel">🚨 Chor</span>}
            </li>
          )
        })}
      </ul>

      {/* Action area — pushed to bottom */}
      <div className="sim-pane-action-area">
        {phase === 'night' && pane.alive && (
          <>
            {ROLE_ACTION[pane.role] && (
              <div className="sim-pane-action-label">{ROLE_ACTION[pane.role]}</div>
            )}
            {pane.role === 'babu' ? (
              <div className="sim-pane-action-waiting">😴 No night action</div>
            ) : nightAction ? (
              <div className="sim-pane-action-done">
                ✓ Action submitted
                {nightAction.target && (
                  <span className="sim-pane-action-target">
                    {' '}→ {allPlayers.find(p => p.id === nightAction.target)?.name ?? nightAction.target}
                  </span>
                )}
              </div>
            ) : (
              <div className="sim-pane-action-waiting">Waiting to act…</div>
            )}
          </>
        )}

        {phase === 'voting' && pane.alive && (
          <>
            <div className="sim-pane-action-label">Vote to eliminate</div>
            {vote ? (
              <div className="sim-pane-action-done">
                ✓ Voted for
                <span className="sim-pane-action-target">
                  {' '}{allPlayers.find(p => p.id === vote)?.name ?? vote}
                </span>
              </div>
            ) : (
              <div className="sim-pane-action-waiting">Waiting to vote…</div>
            )}
          </>
        )}

        {winner && (
          <div className={`sim-pane-winner sim-pane-winner--${winner}`}>
            {winner === 'village' ? '🏆 Village Wins!' : '🦹 Chor Wins!'}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SimulationView() {
  const [gameCode, setGameCode] = useState<string | null>(null)
  const [gameSnap, setGameSnap] = useState<any>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!gameCode) return
    const unsub = onValue(ref(db, `games/${gameCode}`), snap => {
      if (snap.exists()) setGameSnap(snap.val())
    })
    return unsub
  }, [gameCode])

  useEffect(() => {
    if (started.current) return
    started.current = true

    async function run() {
      try {
        const code = await createGame(HOST_ID)
        setGameCode(code)
        await updateRoleConfig(code, { chor: 1, daktar: 1, police: 1, babu: 2 })
        await delay(300)

        for (const p of SIM_PLAYERS) {
          await joinGame(code, p.id, p.name)
          await delay(200)
        }

        await delay(500)
        await startGame(code)
        const roleWrites: Record<string, string> = {}
        for (const p of SIM_PLAYERS)
          roleWrites[`games/${code}/players/${p.id}/role`] = p.role
        await update(ref(db), roleWrites)
        await delay(1200)

        // ── Round 1 ──────────────────────────────────
        await delay(600)
        await setNightAction(code, 'sim_p2', { type: 'chor',   target: 'sim_p3' }); await delay(700)
        await setNightAction(code, 'sim_p3', { type: 'daktar', target: 'sim_p1' }); await delay(700)
        await setNightAction(code, 'sim_p1', { type: 'police', target: 'sim_p2' }); await delay(900)
        await resolveNight(code); await delay(2000)

        await nextPhase(code); await delay(500)
        await setVote(code, 'sim_p1', 'sim_p2'); await delay(350)
        await setVote(code, 'sim_p2', 'sim_p1'); await delay(350)
        await setVote(code, 'sim_p4', 'sim_p1'); await delay(350)
        await setVote(code, 'sim_p5', 'sim_p2'); await delay(500)
        await finalizeVote(code); await delay(1400)

        // ── Round 2 ──────────────────────────────────
        await delay(600)
        await setNightAction(code, 'sim_p2', { type: 'chor',   target: 'sim_p1' }); await delay(700)
        await setNightAction(code, 'sim_p1', { type: 'police', target: 'sim_p5' }); await delay(900)
        await resolveNight(code); await delay(2000)

        await nextPhase(code); await delay(500)
        await setVote(code, 'sim_p4', 'sim_p2'); await delay(350)
        await setVote(code, 'sim_p5', 'sim_p2'); await delay(350)
        await setVote(code, 'sim_p2', 'sim_p4'); await delay(500)
        await finalizeVote(code)

      } catch (err: any) {
        console.error('Sim error:', err)
      }
    }

    run()
  }, [])

  const players = (gameSnap?.players ?? {}) as Record<string, PlayerState & { role: string }>
  const phase   = gameSnap?.phase  as string | null
  const round   = gameSnap?.round  as number | null
  const winner  = gameSnap ? checkWinCondition(players) : null

  const allPlayers: PanePlayer[] = SIM_PLAYERS.map(sp => ({
    ...sp,
    alive: players[sp.id]?.alive !== false,
    role:  players[sp.id]?.role || sp.role,
  }))

  const panes = allPlayers.slice(0, 4)

  const phaseLabel: Record<string, string> = {
    night: '🌙 Night', day: '☀️ Day', voting: '🗳️ Voting',
  }

  return (
    <div className="sim-split-root">
      <div className="sim-split-bar">
        <span className="sim-split-bar-title">Chor Police Daktar Babu</span>
        {gameCode && <span className="sim-split-bar-code">{gameCode}</span>}
        {phase && (
          <span className={`sim-phase-badge sim-phase-badge--${phase}`}>
            {phaseLabel[phase]}
          </span>
        )}
        {round != null && round > 0 && (
          <span className="sim-split-bar-info">Round {round}</span>
        )}
        {winner && (
          <span className={`sim-split-bar-winner sim-split-bar-winner--${winner}`}>
            {winner === 'village' ? '🏆 Village Wins!' : '🦹 Chor Wins!'}
          </span>
        )}
      </div>

      <div className="sim-split-grid">
        {panes.map(pane => (
          <PlayerPane
            key={pane.id}
            pane={pane}
            allPlayers={allPlayers}
            gameCode={gameCode}
            phase={phase}
            round={round}
            gameSnap={gameSnap}
            winner={winner}
          />
        ))}
      </div>
    </div>
  )
}
