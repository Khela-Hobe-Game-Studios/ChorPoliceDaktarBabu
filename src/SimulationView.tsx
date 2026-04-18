import { useEffect, useRef, useState } from 'react'
import { ref, update, onValue } from 'firebase/database'
import { db } from './firebase'
import './styles/components.scss'
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
  police: '👮',
  chor:   '🔪',
  daktar: '💊',
  babu:   '👤',
}

const ROLE_LABEL: Record<string, string> = {
  police: 'Police',
  chor:   'Chor',
  daktar: 'Daktar',
  babu:   'Babu',
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

type LogEntry = { text: string; type: string }

export default function SimulationView() {
  const [gameCode, setGameCode] = useState<string | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [gameSnap, setGameSnap] = useState<any>(null)
  const started = useRef(false)
  const logRef = useRef<HTMLDivElement>(null)

  const addLog = (text: string, type = 'info') =>
    setLog(prev => [...prev, { text, type }])

  useEffect(() => {
    if (logRef.current)
      logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

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
        addLog('Creating game...', 'setup')
        const code = await createGame(HOST_ID)
        setGameCode(code)
        addLog(`Game created: ${code}`, 'setup')
        await updateRoleConfig(code, { chor: 1, daktar: 1, police: 1, babu: 2 })
        await delay(300)

        for (const p of SIM_PLAYERS) {
          await joinGame(code, p.id, p.name)
          addLog(`${p.name} joined`, 'join')
          await delay(200)
        }

        await delay(500)
        addLog('Starting game...', 'setup')
        await startGame(code)

        // Force predetermined roles (override random assignment)
        const roleWrites: Record<string, string> = {}
        for (const p of SIM_PLAYERS)
          roleWrites[`games/${code}/players/${p.id}/role`] = p.role
        await update(ref(db), roleWrites)
        addLog('Roles assigned!', 'setup')
        await delay(1200)

        // ── ROUND 1 ────────────────────────────
        addLog('── ROUND 1 ────────────────', 'divider')
        addLog('🌙 Night begins...', 'phase')
        await delay(600)

        addLog('Bob sneaks out to choose a target...', 'action')
        await setNightAction(code, 'sim_p2', { type: 'chor', target: 'sim_p3' })
        await delay(700)

        addLog('Charlie tries to protect Alice tonight...', 'action')
        await setNightAction(code, 'sim_p3', { type: 'daktar', target: 'sim_p1' })
        await delay(700)

        addLog('Alice secretly investigates Bob...', 'action')
        await setNightAction(code, 'sim_p1', { type: 'police', target: 'sim_p2' })
        await delay(900)

        addLog('⚡ Resolving night actions...', 'resolve')
        await resolveNight(code) // Charlie dies (saved Alice, not himself); phase → day
        await delay(400)

        addLog('☀️ Morning — Charlie was killed!', 'death')
        addLog('   (Alice\'s intel: Bob IS the Chor! 🚨)', 'intel')
        await delay(2000)

        addLog('🗳️ Village votes...', 'phase')
        await nextPhase(code) // day → voting
        await delay(500)

        await setVote(code, 'sim_p1', 'sim_p2'); addLog('   Alice  →  Bob',   'vote')
        await delay(350)
        await setVote(code, 'sim_p2', 'sim_p1'); addLog('   Bob    →  Alice', 'vote')
        await delay(350)
        await setVote(code, 'sim_p4', 'sim_p1'); addLog('   Diana  →  Alice', 'vote')
        await delay(350)
        await setVote(code, 'sim_p5', 'sim_p2'); addLog('   Eve    →  Bob',   'vote')
        await delay(500)

        await finalizeVote(code) // 2–2 tie → no elimination; phase → night, round 2
        addLog('   TIE! No one eliminated.', 'result')
        await delay(1400)

        // ── ROUND 2 ────────────────────────────
        addLog('── ROUND 2 ────────────────', 'divider')
        addLog('🌙 Night begins...', 'phase')
        await delay(600)

        addLog('Bob targets Alice this time...', 'action')
        await setNightAction(code, 'sim_p2', { type: 'chor', target: 'sim_p1' })
        await delay(700)

        addLog('Alice runs one last investigation...', 'action')
        await setNightAction(code, 'sim_p1', { type: 'police', target: 'sim_p5' })
        await delay(900)

        addLog('⚡ Resolving night actions...', 'resolve')
        await resolveNight(code) // Alice dies; phase → day
        await delay(400)

        addLog('☀️ Morning — Alice was killed!', 'death')
        await delay(2000)

        addLog('🗳️ Final vote — Diana and Eve have had enough...', 'phase')
        await nextPhase(code) // day → voting
        await delay(500)

        await setVote(code, 'sim_p4', 'sim_p2'); addLog('   Diana  →  Bob',   'vote')
        await delay(350)
        await setVote(code, 'sim_p5', 'sim_p2'); addLog('   Eve    →  Bob',   'vote')
        await delay(350)
        await setVote(code, 'sim_p2', 'sim_p4'); addLog('   Bob    →  Diana', 'vote')
        await delay(500)

        await finalizeVote(code) // Bob out 2/3 → win condition triggers
        addLog('   BOB ELIMINATED — Bob was the Chor! 🎉', 'elim')
        await delay(600)

        addLog('──────────────────────────', 'divider')
        addLog('🏆 VILLAGE WINS!', 'win')

      } catch (err: any) {
        addLog(`Error: ${err.message}`, 'error')
      }
    }

    run()
  }, [])

  const players = (gameSnap?.players ?? {}) as Record<string, PlayerState & { role: string }>
  const phase    = gameSnap?.phase as string | null
  const round    = gameSnap?.round as number | null
  const results  = gameSnap?.results as any
  const winner   = gameSnap ? checkWinCondition(players) : null

  const cards = SIM_PLAYERS.map(sp => ({
    ...sp,
    alive: players[sp.id]?.alive !== false,
    role:  players[sp.id]?.role || sp.role,
  }))

  const phaseLabel: Record<string, string> = {
    night:  '🌙 Night',
    day:    '☀️ Day',
    voting: '🗳️ Voting',
  }

  return (
    <div className="sim-root">
      <div className="sim-header">
        <h1 className="sim-title">Chor Police Daktar Babu</h1>
        <p className="sim-subtitle">5-Player Simulation — Spectator View</p>
        {gameCode && (
          <div className="sim-meta">
            <span className="sim-meta-item">Code: <strong>{gameCode}</strong></span>
            {round != null && round > 0 && (
              <span className="sim-meta-item">Round <strong>{round}</strong></span>
            )}
            {phase && (
              <span className={`sim-phase-badge sim-phase-badge--${phase}`}>
                {phaseLabel[phase] ?? phase}
              </span>
            )}
          </div>
        )}
      </div>

      {winner && (
        <div className={`sim-winner-banner sim-winner-banner--${winner}`}>
          {winner === 'village'
            ? '🏆 Village Wins! The Chor has been caught.'
            : '🦹 Chor Wins! The village is lost.'}
        </div>
      )}

      <div className="sim-body">
        <div className="sim-players">
          {cards.map(card => (
            <div
              key={card.id}
              className={`sim-card sim-card--${card.role}${card.alive ? '' : ' sim-card--dead'}`}
            >
              <div className="sim-card-avatar">
                {card.alive ? ROLE_EMOJI[card.role] : '💀'}
              </div>
              <div className="sim-card-name">{card.name}</div>
              <div className="sim-card-role">{ROLE_LABEL[card.role] ?? card.role}</div>
              {!card.alive && <div className="sim-card-dead-label">Eliminated</div>}
            </div>
          ))}
        </div>

        <div className="sim-log" ref={logRef}>
          <div className="sim-log-header">Simulation Log</div>
          {log.map((entry, i) => (
            <div key={i} className={`sim-log-line sim-log-line--${entry.type}`}>
              {entry.text}
            </div>
          ))}
          {log.length === 0 && (
            <div className="sim-log-line sim-log-line--setup">Initialising...</div>
          )}
        </div>
      </div>

      {(results?.lastDeath || results?.lastElimination) && (
        <div className="sim-announcements">
          {results.lastDeath && (
            <div className="sim-announcement sim-announcement--death">
              ☠️ Killed last night:{' '}
              <strong>{players[results.lastDeath]?.name ?? results.lastDeath}</strong>
            </div>
          )}
          {results.lastElimination && (
            <div className="sim-announcement sim-announcement--elim">
              🗳️ Voted out:{' '}
              <strong>{players[results.lastElimination]?.name ?? results.lastElimination}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
