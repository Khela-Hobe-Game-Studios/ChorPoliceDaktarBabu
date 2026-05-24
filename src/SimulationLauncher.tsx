import './styles/simulation.scss'
import { useEffect, useRef, useState } from 'react'
import { ref, update, get, child } from 'firebase/database'
import { db } from './firebase'
import {
  createGame, updateRoleConfig, startGame,
  setNightAction, setVote, resolveNight, finalizeVote, nextPhase
} from './api/game'

const HOST_ID = 'sim_host_driver'

const SIM_PLAYERS = [
  { id: 'sim_alice',   name: 'Alice',   role: 'police', emoji: '👮' },
  { id: 'sim_bob',     name: 'Bob',     role: 'chor',   emoji: '🔪' },
  { id: 'sim_charlie', name: 'Charlie', role: 'daktar', emoji: '💊' },
  { id: 'sim_diana',   name: 'Diana',   role: 'babu',   emoji: '👤' },
  { id: 'sim_eve',     name: 'Eve',     role: 'babu',   emoji: '👤' },
]

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

type LogEntry = { text: string; type: string }

export default function SimulationLauncher() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle')
  const [log, setLog] = useState<LogEntry[]>([])
  const [gameCode, setGameCode] = useState<string | null>(null)
  const started = useRef(false)
  const logRef = useRef<HTMLDivElement>(null)

  const addLog = (text: string, type = 'info') =>
    setLog(prev => [...prev, { text, type }])

  useEffect(() => {
    if (logRef.current)
      logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  const handleLaunch = async () => {
    if (started.current) return
    started.current = true
    setStatus('running')

    try {
      // ── Setup ──────────────────────────────
      addLog('Creating game...', 'setup')
      const code = await createGame(HOST_ID)
      setGameCode(code)
      addLog(`Game created: ${code}`, 'setup')
      await updateRoleConfig(code, { chor: 1, daktar: 1, police: 1, babu: 2 })

      // Open one window per player, tiled across the screen
      addLog('Opening 5 player windows...', 'setup')
      const sw = window.screen.availWidth
      const sh = window.screen.availHeight
      const winW = Math.floor(sw / 3)
      const winH = Math.floor(sh / 2)
      const positions = [
        { top: 0,    left: 0 },
        { top: 0,    left: winW },
        { top: 0,    left: winW * 2 },
        { top: winH, left: 0 },
        { top: winH, left: winW },
      ]
      const base = window.location.origin
      SIM_PLAYERS.forEach((p, i) => {
        const { top, left } = positions[i]
        const url = `${base}/?pid=${p.id}&join=${code}&name=${encodeURIComponent(p.name)}`
        window.open(url, `player_${p.id}`, `width=${winW},height=${winH},top=${top},left=${left},menubar=no,toolbar=no,location=no`)
      })
      addLog('Windows opened — waiting for players to join...', 'setup')

      // Poll until all 5 players have joined
      for (let i = 0; i < 20; i++) {
        await delay(800)
        const snap = await get(child(ref(db), `games/${code}/players`))
        const count = Object.keys(snap.val() || {}).length
        if (count >= 5) {
          addLog(`All 5 players joined!`, 'setup')
          break
        }
        if (i === 19) addLog('Timeout — proceeding with whoever joined.', 'warn')
      }

      await delay(600)
      addLog('Starting game...', 'setup')
      await startGame(code)

      // Override random role assignment with predetermined roles
      const roleWrites: Record<string, string> = {}
      for (const p of SIM_PLAYERS)
        roleWrites[`games/${code}/players/${p.id}/role`] = p.role
      await update(ref(db), roleWrites)
      addLog('Roles assigned. Players can tap "Show Role" to peek.', 'setup')
      await delay(2500)

      // ── ROUND 1 ────────────────────────────
      addLog('── ROUND 1 ────────────────', 'divider')
      addLog('🌙 Night begins...', 'phase')
      await delay(1200)

      addLog('Bob (Chor) chooses a target...', 'action')
      await setNightAction(code, 'sim_bob', { type: 'chor', target: 'sim_charlie' })
      await delay(900)

      addLog('Charlie (Daktar) decides to protect Alice...', 'action')
      await setNightAction(code, 'sim_charlie', { type: 'daktar', target: 'sim_alice' })
      await delay(900)

      addLog('Alice (Police) secretly investigates Bob...', 'action')
      await setNightAction(code, 'sim_alice', { type: 'police', target: 'sim_bob' })
      await delay(1000)

      addLog('⚡ Resolving night actions...', 'resolve')
      await resolveNight(code) // Charlie dies; phase → day
      await delay(600)

      addLog('☀️ Morning — Charlie was killed!', 'death')
      addLog('   (Alice sees: Bob IS the Chor 🚨)', 'intel')
      await delay(3000)

      addLog('🗳️ Voting...', 'phase')
      await nextPhase(code) // day → voting
      await delay(1200)

      await setVote(code, 'sim_alice', 'sim_bob');    addLog('   Alice  →  Bob',   'vote'); await delay(600)
      await setVote(code, 'sim_bob',   'sim_alice');  addLog('   Bob    →  Alice', 'vote'); await delay(600)
      await setVote(code, 'sim_diana', 'sim_alice');  addLog('   Diana  →  Alice', 'vote'); await delay(600)
      await setVote(code, 'sim_eve',   'sim_bob');    addLog('   Eve    →  Bob',   'vote'); await delay(800)

      await finalizeVote(code) // 2–2 tie → no elim; round 2
      addLog('   TIE! No one eliminated.', 'result')
      await delay(2500)

      // ── ROUND 2 ────────────────────────────
      addLog('── ROUND 2 ────────────────', 'divider')
      addLog('🌙 Night begins...', 'phase')
      await delay(1200)

      addLog('Bob now targets Alice...', 'action')
      await setNightAction(code, 'sim_bob', { type: 'chor', target: 'sim_alice' })
      await delay(900)

      addLog('Alice runs one last investigation (Eve)...', 'action')
      await setNightAction(code, 'sim_alice', { type: 'police', target: 'sim_eve' })
      await delay(1000)

      addLog('⚡ Resolving night actions...', 'resolve')
      await resolveNight(code) // Alice dies; phase → day
      await delay(600)

      addLog('☀️ Morning — Alice was killed!', 'death')
      await delay(3000)

      addLog('🗳️ Final vote...', 'phase')
      await nextPhase(code)
      await delay(1200)

      await setVote(code, 'sim_diana', 'sim_bob');   addLog('   Diana  →  Bob',   'vote'); await delay(600)
      await setVote(code, 'sim_eve',   'sim_bob');   addLog('   Eve    →  Bob',   'vote'); await delay(600)
      await setVote(code, 'sim_bob',   'sim_diana'); addLog('   Bob    →  Diana', 'vote'); await delay(800)

      await finalizeVote(code) // Bob out 2/3 → village wins
      addLog('   BOB ELIMINATED — Bob was the Chor! 🎉', 'elim')
      await delay(600)

      addLog('──────────────────────────', 'divider')
      addLog('🏆 VILLAGE WINS!', 'win')
      setStatus('done')

    } catch (err: any) {
      addLog(`Error: ${err.message}`, 'error')
      setStatus('idle')
      started.current = false
    }
  }

  return (
    <div className="app-container">
      <h2>Simulation Launcher</h2>
      <p className="launcher-sub">
        Opens 5 real player windows — each sees only their own perspective.
      </p>

      <div className="launcher-players">
        {SIM_PLAYERS.map(p => (
          <div key={p.id} className={`launcher-player launcher-player--${p.role}`}>
            <span className="launcher-player-emoji">{p.emoji}</span>
            <span className="launcher-player-name">{p.name}</span>
            <span className="launcher-player-role">{p.role}</span>
          </div>
        ))}
      </div>

      {gameCode && (
        <div className="launcher-code">
          Game Code: <strong>{gameCode}</strong>
        </div>
      )}

      {status === 'idle' && (
        <button className="btn start-game-btn launcher-launch-btn" onClick={handleLaunch}>
          ▶ Launch Simulation
        </button>
      )}

      {status === 'running' && (
        <div className="launcher-running">
          <span className="launcher-spinner" /> Simulation running...
        </div>
      )}

      {status === 'done' && (
        <div className="launcher-done">🏆 Simulation complete!</div>
      )}

      <div className="sim-log" ref={logRef} style={{ marginTop: '18px' }}>
        <div className="sim-log-header">Simulation Log</div>
        {log.map((e, i) => (
          <div key={i} className={`sim-log-line sim-log-line--${e.type}`}>{e.text}</div>
        ))}
        {log.length === 0 && (
          <div className="sim-log-line sim-log-line--setup">Press launch to begin...</div>
        )}
      </div>
    </div>
  )
}
