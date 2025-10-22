import { useEffect, useMemo, useState } from 'react'
import './App.css'
import './styles/components.scss'
import { getOrCreatePlayerId } from './utils'
import { createGame, joinGame, startGame, nextPhase } from './api/game'
import { db } from './firebase'
import { onValue, ref } from 'firebase/database'
import { 
  CreateGameBar, 
  GameHeader, 
  PlayerList, 
  Announcements, 
  Voting, 
  NightActions, 
  ConfigureRoles 
} from './components'

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
  const [showRole, setShowRole] = useState<boolean>(false)
  const [lastDeath, setLastDeath] = useState<string | null>(null)
  const [lastElimination, setLastElimination] = useState<string | null>(null)
  const [lastInvestigation, setLastInvestigation] = useState<{ policeId: string; targetId: string; isChor: boolean } | null>(null)
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
  const isHost = hostId === playerId
  const hasJoinedGame = gameCode && players[playerId]

  const handleStartGame = async () => {
    await startGame(gameCode)
  }

  const handleResolveNight = async () => {
    const { resolveNight } = await import('./api/game')
    await resolveNight(gameCode)
  }

  return (
    <div className="app-container">
      <h2>Chor Police - Lobby</h2>
      {hasJoinedGame && (
        <div className="game-code-display">
          Game Code: {gameCode}
        </div>
      )}
      {!hasJoinedGame && (
        <CreateGameBar
          name={name}
          gameCode={gameCode}
          onNameChange={setName}
          onGameCodeChange={setGameCode}
          onCreate={handleCreate}
          onJoin={handleJoin}
        />
      )}
      {hasJoinedGame && (
        <>
          <GameHeader
            gameCode={gameCode}
            phase={phase}
            round={round}
            isHost={isHost}
            myRole={myRole}
            showRole={showRole}
            onToggleShowRole={() => setShowRole((v) => !v)}
            onNextPhase={() => nextPhase(gameCode)}
            onResolveNight={handleResolveNight}
          />
          <PlayerList players={players} />
          <Announcements
            lastDeath={lastDeath}
            lastElimination={lastElimination}
            lastInvestigation={lastInvestigation}
            players={players}
            playerId={playerId}
          />
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
          {isHost && !phase && (
            <ConfigureRoles
              roles={roles}
              totalPlayers={totalPlayers}
              gameCode={gameCode}
              onRoleChange={(key, delta) => {
                const currentValue = key === 'chor' ? roles.chor : key === 'daktar' ? roles.daktar : roles.police
                const nextValue = Math.max(0, currentValue + delta)
                const next = { ...roles, [key]: nextValue }
                next.babu = Math.max(0, totalPlayers - (next.chor + next.daktar + next.police))
                setRoles(next)
              }}
              onRolesChange={setRoles}
              onStartGame={handleStartGame}
            />
          )}
        </>
      )}
    </div>
  )
}

export default App