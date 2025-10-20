import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { getOrCreatePlayerId, getDefaultRolesByCount } from './utils'
import { createGame, joinGame, updateRoleConfig, startGame, nextPhase, setTimerStart, setTimerPause, setTimerReset } from './api/game'
import { db } from './firebase'
import { onValue, ref } from 'firebase/database'

function App() {
  const [name, setName] = useState("")
  const [gameCode, setGameCode] = useState("")
  const [players, setPlayers] = useState<Record<string, { name: string; alive?: boolean }>>({})
  const [myRole, setMyRole] = useState<string>("")
  const [myAlive, setMyAlive] = useState<boolean>(true)
  const [hostId, setHostId] = useState<string | null>(null)
  const [roles, setRoles] = useState({ chor: 1, daktar: 1, police: 0, babu: 2 })
  const [phase, setPhase] = useState<string | null>(null)
  const [round, setRound] = useState<number>(0)
  const [timer, setTimerState] = useState<{ running: boolean; seconds: number; endAt?: number | null }>({ running: false, seconds: 120, endAt: null })
  const [showRole, setShowRole] = useState<boolean>(false)
  const playerId = useMemo(() => getOrCreatePlayerId(), [])

  useEffect(() => {
    if (!gameCode) return
    const unsubs: Array<() => void> = []
    unsubs.push(onValue(ref(db, `games/${gameCode}/players`), (snap) => {
      type PlayerLeaf = { name: string; role?: string; alive?: boolean }
      const all = (snap.val() as Record<string, PlayerLeaf> | null) ?? {}
      setPlayers(Object.fromEntries(Object.entries(all).map(([id, p]) => [id, { name: p.name, alive: p.alive !== false }])))
      const mine = all[playerId]
      setMyRole(mine?.role ?? "")
      setMyAlive(mine?.alive !== false)
    }))
    unsubs.push(onValue(ref(db, `games/${gameCode}/hostId`), (snap) => {
      setHostId((snap.val() as string) ?? null)
    }))
    unsubs.push(onValue(ref(db, `games/${gameCode}/settings/roleConfig`), (snap) => {
      const v = snap.val() as typeof roles | null
      if (v) setRoles(v)
    }))
    unsubs.push(onValue(ref(db, `games/${gameCode}/phase`), (snap) => setPhase((snap.val() as string) ?? null)))
    unsubs.push(onValue(ref(db, `games/${gameCode}/round`), (snap) => setRound((snap.val() as number) ?? 0)))
    unsubs.push(onValue(ref(db, `games/${gameCode}/timer`), (snap) => {
      const v = snap.val() as { running?: boolean; seconds?: number; endAt?: number | null } | null
      if (v) setTimerState({ running: !!v.running, seconds: typeof v.seconds === 'number' ? v.seconds : 120, endAt: v.endAt ?? null })
    }))
    unsubs.push(onValue(ref(db, `games/${gameCode}/results`), (snap) => {
      type ResultsLeaf = { lastDeath?: string | null; lastElimination?: string | null; lastInvestigation?: { policeId: string; targetId: string; isChor: boolean } | null }
      const v = (snap.val() as ResultsLeaf | null) ?? {}
      setLastDeath(v.lastDeath ?? null)
      setLastElimination(v.lastElimination ?? null)
      setLastInvestigation(v.lastInvestigation ?? null)
    }))
    return () => { unsubs.forEach(u => u()) }
  }, [gameCode, playerId])

  useEffect(() => {
    const key = 'cp_show_role'
    const val = localStorage.getItem(key)
    setShowRole(val === '1')
  }, [])

  useEffect(() => {
    const key = 'cp_show_role'
    localStorage.setItem(key, showRole ? '1' : '0')
  }, [showRole])

  const handleCreate = async () => {
    const code = await createGame(playerId)
    setGameCode(code)
    if (name) await joinGame(code, playerId, name)
  }

  const handleJoin = async () => {
    if (!name || !gameCode) return
    await joinGame(gameCode, playerId, name)
  }

  const totalPlayers = Object.keys(players).length
  const autoBabu = Math.max(0, totalPlayers - (roles.chor + roles.daktar + roles.police))
  const isHost = hostId === playerId

  const setRole = (key: 'chor' | 'daktar' | 'police', delta: number) => {
    const currentValue = key === 'chor' ? roles.chor : key === 'daktar' ? roles.daktar : roles.police
    const nextValue = Math.max(0, currentValue + delta)
    const next = { ...roles, [key]: nextValue }
    next.babu = Math.max(0, totalPlayers - (next.chor + next.daktar + next.police))
    setRoles(next)
  }

  const saveRoles = async () => {
    await updateRoleConfig(gameCode, { ...roles, babu: autoBabu })
  }

  const isConfigValid = () => {
    if (!totalPlayers) return false
    if (roles.chor < 1) return false
    if ((roles.chor + roles.daktar + roles.police + autoBabu) !== totalPlayers) return false
    return true
  }

  const handleStartGame = async () => {
    if (!isConfigValid()) return
    await saveRoles()
    await startGame(gameCode)
  }

  const [lastDeath, setLastDeath] = useState<string | null>(null)
  const [lastElimination, setLastElimination] = useState<string | null>(null)
  const [lastInvestigation, setLastInvestigation] = useState<{ policeId: string; targetId: string; isChor: boolean } | null>(null)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 16 }}>
      <h2>Chor Police - Lobby</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleCreate}>Create Game</button>
          <input placeholder="Game code" value={gameCode} onChange={(e) => setGameCode(e.target.value)} style={{ width: 120 }} />
          <button onClick={handleJoin}>Join</button>
        </div>
      </div>
      {gameCode && (
        <>
          <div style={{ position: 'sticky', top: 0, background: '#fff', paddingBottom: 8, zIndex: 10, borderBottom: '1px solid #eee' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0 }}>Game Code: {gameCode}</h3>
              {phase && <div>Phase: <strong>{phase}</strong> · Round: <strong>{round}</strong></div>}
              {isHost && phase && (
                <>
                  <button onClick={() => nextPhase(gameCode)}>Next Phase</button>
                  {phase === 'night' && (
                    <button style={{ marginLeft: 8 }} onClick={async () => {
                      const { resolveNight } = await import('./api/game')
                      await resolveNight(gameCode)
                    }}>Resolve Night</button>
                  )}
                </>
              )}
            </div>
            <div style={{ marginTop: 8 }}>
              <HeaderTimer
                isHost={isHost}
                seconds={timer.seconds}
                running={timer.running}
                endAt={timer.endAt ?? null}
                onStart={() => setTimerStart(gameCode)}
                onPause={() => setTimerPause(gameCode)}
                onReset={() => setTimerReset(gameCode, 120)}
              />
              {!!myRole && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button onClick={() => setShowRole((v) => !v)}>
                    {showRole ? 'Hide My Role' : 'Show My Role'}
                  </button>
                  {showRole && <RoleBadge role={myRole} />}
                </div>
              )}
            </div>
          </div>
          <ul>
            {Object.entries(players).map(([id, p]) => (
              <li key={id}>
                {p.name} {p.alive === false ? '— 💀' : ''}
              </li>
            ))}
          </ul>
          {(lastDeath || lastElimination || lastInvestigation) && (
            <div style={{ border: '1px solid #eee', padding: 10, borderRadius: 8 }}>
              <h4>Announcements</h4>
              {lastDeath && <div>Night: {players[lastDeath]?.name ?? lastDeath} was attacked { /* saved -> victim null handled in API */}</div>}
              {lastElimination && <div>Voting: {players[lastElimination]?.name ?? lastElimination} was eliminated.</div>}
              {lastInvestigation && lastInvestigation.policeId === playerId && (
                <div>Police Result: {players[lastInvestigation.targetId]?.name ?? lastInvestigation.targetId} is {lastInvestigation.isChor ? 'Chor' : 'not Chor'}.</div>
              )}
            </div>
          )}
          {phase === 'voting' && (
            <Voting
              gameCode={gameCode}
              playerId={playerId}
              livingPlayers={players}
              isHost={isHost}
              canVote={myAlive}
            />
          )}
          {phase === 'night' && myRole && (
            <NightActions
              myRole={myRole}
              gameCode={gameCode}
              playerId={playerId}
              livingPlayers={players}
              canAct={myAlive}
            />
          )}
          {isHost && (
            <div style={{ border: '1px solid #ccc', padding: 12, borderRadius: 8, marginTop: 12 }}>
              <h4>Configure Roles</h4>
              <RoleRow label="Chor 🦹‍♂️" value={roles.chor} onDec={() => setRole('chor', -1)} onInc={() => setRole('chor', +1)} />
              <RoleRow label="Daktar 💉" value={roles.daktar} onDec={() => setRole('daktar', -1)} onInc={() => setRole('daktar', +1)} />
              <RoleRow label="Police 👮" value={roles.police} onDec={() => setRole('police', -1)} onInc={() => setRole('police', +1)} />
              <div style={{ marginTop: 8 }}>Babu 👤: {autoBabu} (auto)</div>

              <div style={{ marginTop: 8, color: '#a00' }}>
                {roles.chor < 1 && <div>At least 1 Chor required.</div>}
                {roles.chor > Math.floor(totalPlayers * 0.4) && totalPlayers > 0 && (
                  <div>Warning: Chor exceed 40% of players.</div>
                )}
                {autoBabu < 2 && totalPlayers >= 4 && (
                  <div>Warning: At least 2 Babu recommended.</div>
                )}
                {(roles.chor + roles.daktar + roles.police + autoBabu) !== totalPlayers && (
                  <div>Total roles must equal total players.</div>
                )}
              </div>
              <button style={{ marginTop: 8 }} onClick={saveRoles}>Save Role Config</button>
              <div style={{ marginTop: 8 }}>
                <button disabled={!isConfigValid()} onClick={handleStartGame}>
                  Start Game
                </button>
                <button style={{ marginLeft: 8 }} onClick={() => setRoles(getDefaultRolesByCount(totalPlayers))}>
                  Reset to Default
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function RoleRow(props: { label: string; value: number; onDec: () => void; onInc: () => void }) {
  const { label, value, onDec, onInc } = props
  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
    flexWrap: 'wrap',
  }
  const controlsStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }
  const btnStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 6,
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  }
  const countStyle: React.CSSProperties = {
    minWidth: 28,
    textAlign: 'center',
    fontWeight: 600,
  }
  return (
    <div style={rowStyle}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <div style={controlsStyle}>
        <button style={btnStyle} onClick={onDec} aria-label={`Decrease ${label}`}>-</button>
        <span style={countStyle}>{value}</span>
        <button style={btnStyle} onClick={onInc} aria-label={`Increase ${label}`}>+</button>
      </div>
    </div>
  )
}

function HeaderTimer(props: { isHost: boolean; seconds: number; running: boolean; endAt: number | null; onStart: () => void; onPause: () => void; onReset: () => void }) {
  const { isHost, seconds, running, endAt, onStart, onPause, onReset } = props
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return
    intervalRef.current = window.setInterval(() => {
      // local visual tick only; authoritative seconds are driven by DB updates
    }, 1000)
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [running])

  const now = Date.now()
  const remaining = running && endAt ? Math.max(0, Math.ceil((endAt - now) / 1000)) : seconds
  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{mm}:{ss}</span>
      {isHost && (
        <div style={{ display: 'flex', gap: 8 }}>
          {!running ? (
            <button onClick={onStart}>Start</button>
          ) : (
            <button onClick={onPause}>Pause</button>
          )}
          <button onClick={onReset}>Reset</button>
        </div>
      )}
    </div>
  )
}

function Voting(props: { gameCode: string; playerId: string; livingPlayers: Record<string, { name: string; alive?: boolean }>; isHost: boolean; canVote: boolean }) {
  const { gameCode, playerId, livingPlayers, isHost, canVote } = props
  const [target, setTarget] = useState<string>("")
  const others = Object.fromEntries(Object.entries(livingPlayers).filter(([id]) => id !== playerId))
  return (
    <div style={{ border: '1px solid #ccc', padding: 12, borderRadius: 8, marginTop: 12 }}>
      <h4>Voting</h4>
      <select value={target} onChange={(e) => setTarget(e.target.value)} disabled={!canVote}>
        <option value="">-- Vote for --</option>
        {Object.entries(others).filter(([, p]) => p.alive !== false).map(([id, p]) => (
          <option key={id} value={id}>{p.name}</option>
        ))}
      </select>
      <button style={{ marginLeft: 8 }} disabled={!target || !canVote} onClick={async () => {
        const { setVote } = await import('./api/game')
        await setVote(gameCode, playerId, target)
        alert('Vote submitted')
      }}>Submit Vote</button>
      {isHost && (
        <button style={{ marginLeft: 8 }} onClick={async () => {
          const { finalizeVote } = await import('./api/game')
          await finalizeVote(gameCode)
        }}>Finalize</button>
      )}
    </div>
  )
}

function RoleBadge(props: { role: string }) {
  const { role } = props
  const color = role === 'chor' ? '#e11d48' : role === 'daktar' ? '#16a34a' : role === 'police' ? '#2563eb' : '#6b7280'
  const label = role === 'chor' ? 'Chor 🦹‍♂️' : role === 'daktar' ? 'Daktar 💉' : role === 'police' ? 'Police 👮' : 'Babu 👤'
  return (
    <span style={{
      display: 'inline-block',
      padding: '6px 10px',
      borderRadius: 8,
      background: color,
      color: '#fff',
      fontWeight: 600,
    }}>{label}</span>
  )
}

export default App

function NightActions(props: { myRole: string; gameCode: string; playerId: string; livingPlayers: Record<string, { name: string; alive?: boolean }>; canAct: boolean }) {
  const { myRole, gameCode, playerId, livingPlayers, canAct } = props
  const [target, setTarget] = useState<string>("")
  const actionable = myRole === 'chor' || myRole === 'daktar' || myRole === 'police'

  if (!actionable) {
    return <div style={{ marginTop: 12, opacity: 0.8 }}>Night phase: no action for your role.</div>
  }

  const label = myRole === 'chor' ? 'Choose a victim' : myRole === 'daktar' ? 'Choose someone to save' : 'Investigate a player'

  return (
    <div style={{ border: '1px solid #ccc', padding: 12, borderRadius: 8, marginTop: 12 }}>
      <h4>Night Action</h4>
      <div style={{ marginBottom: 8 }}>{label}</div>
      <select value={target} onChange={(e) => setTarget(e.target.value)} disabled={!canAct}>
        <option value="">-- Select Player --</option>
        {Object.entries(livingPlayers).filter(([, p]) => p.alive !== false).map(([id, p]) => (
          <option key={id} value={id}>{p.name}</option>
        ))}
      </select>
      <button style={{ marginLeft: 8 }} disabled={!target || !canAct} onClick={async () => {
        const { setNightAction } = await import('./api/game')
        const roleType = (myRole === 'chor' || myRole === 'daktar' || myRole === 'police') ? myRole : 'chor'
        await setNightAction(gameCode, playerId, { type: roleType as 'chor' | 'daktar' | 'police', target })
        alert('Action submitted')
      }}>Confirm</button>
    </div>
  )
}
