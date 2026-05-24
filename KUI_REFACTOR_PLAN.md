# KUI Refactor Plan — ChorPoliceDaktarBabu

Migrate the game to `@khelahobe/kui` in three ordered tiers. Complete each tier fully before starting the next. Work on a branch: `feat/kui-refactor`.

---

## Prerequisites

```bash
# In ChorPoliceDaktarBabu/
pnpm add @khelahobe/kui
# Then import styles once in src/main.tsx:
import '@khelahobe/kui/styles'
```

The kui lib lives at `C:/Users/Imtiaz Khaled/Git/kui/packages/lib`.
Install as a local path dep OR publish to npm first. If local:
```json
// package.json
"@khelahobe/kui": "file:../../kui/packages/lib"
```

---

## Tier 1 — Drop-in component replacements

No structural changes. Swap each game component for its kui equivalent in-place, one at a time. The component's external API (props from App.tsx / SimulationView.tsx) stays the same — only the internals change.

### 1.1 — RoleDisplay → RoleCard

**File:** `src/components/RoleDisplay.tsx`

Current: image with onError fallback, a button to toggle show/hide.
New: `RoleCard` from `@khelahobe/kui/cpdb`.

```tsx
import { RoleCard } from '@khelahobe/kui/cpdb'
import type { CpdbRole } from '@khelahobe/kui/cpdb'

export function RoleDisplay({ myRole, showRole, onToggleShowRole }: RoleDisplayProps) {
  if (!myRole) return null
  const role = myRole as CpdbRole  // myRole is already 'chor'|'police'|'daktar'|'babu'
  return (
    <RoleCard
      role={role}
      playerName=""          // not shown until revealed — leave blank or pass name from parent
      revealed={showRole}
      onClick={onToggleShowRole}
      style={{ cursor: 'pointer' }}
    />
  )
}
```

**Note:** Consider threading `playerName` down from App.tsx (`name` state) as an additional prop.

---

### 1.2 — RoleBadge → Badge

**File:** `src/components/RoleBadge.tsx`

Current: `<span>` with role-specific class + image fallback.
New: `Badge` from `@khelahobe/kui`.

```tsx
import { Badge } from '@khelahobe/kui'

const ROLE_VARIANT = {
  chor: 'danger',    // red
  police: 'night',   // blue
  daktar: 'success', // green  (Badge doesn't have success; use custom or 'day')
  babu: 'default',
} as const

export function RoleBadge({ role }: RoleBadgeProps) {
  const label = { chor: 'Chor 🦹‍♂️', daktar: 'Daktar 💉', police: 'Police 👮', babu: 'Babu 👤' }[role] ?? role
  return <Badge variant={ROLE_VARIANT[role as keyof typeof ROLE_VARIANT] ?? 'default'}>{label}</Badge>
}
```

---

### 1.3 — Announcements → InvestigationResult + EliminationAnnouncement

**File:** `src/components/Announcements.tsx`

Current: plain `<div>` text for death, elimination, investigation.
New: kui CPDB components for the two dramatic moments; keep plain text only for lastDeath.

```tsx
import { InvestigationResult, EliminationAnnouncement } from '@khelahobe/kui/cpdb'
import type { CpdbRole } from '@khelahobe/kui/cpdb'

export function Announcements({ lastDeath, lastElimination, lastInvestigation, players, playerId }: AnnouncementsProps) {
  const isMyInvestigation = lastInvestigation?.policeId === playerId

  return (
    <div className="announcements">
      {lastDeath && (
        <p>Night: {players[lastDeath]?.name ?? lastDeath} was attacked</p>
      )}
      {lastElimination && (
        <EliminationAnnouncement
          playerName={players[lastElimination]?.name ?? lastElimination}
          playerInitial={(players[lastElimination]?.name?.[0] ?? '?').toUpperCase()}
          role={(players[lastElimination] as any)?.role as CpdbRole ?? 'babu'}
          animated
        />
      )}
      {isMyInvestigation && lastInvestigation && (
        <InvestigationResult
          targetName={players[lastInvestigation.targetId]?.name ?? lastInvestigation.targetId}
          targetInitial={(players[lastInvestigation.targetId]?.name?.[0] ?? '?').toUpperCase()}
          isChor={lastInvestigation.isChor}
          animated
        />
      )}
      {!lastDeath && !lastElimination && !lastInvestigation && (
        <p>No new announcements</p>
      )}
    </div>
  )
}
```

**Note:** `players` record doesn't include `role` in the current type. The elimination role reveal requires either (a) passing the role separately, or (b) reading it from `gameState.players` which does include `role?` in `useGameState`. Update `AnnouncementsProps` to accept `eliminatedRole?: CpdbRole`.

---

### 1.4 — Host vote tally (inline in App.tsx) → VoteTally

**Location:** App.tsx, the inline tally block inside the host voting section (~lines 140–175 of App.tsx).

Current: hand-rolled bar chart with custom CSS.
New: `VoteTally` from `@khelahobe/kui/cpdb`.

Transform the existing tally data structure:
```tsx
import { VoteTally } from '@khelahobe/kui/cpdb'
import type { VoteTallyEntry } from '@khelahobe/kui/cpdb'

// Build nominations array from existing tally object
const nominations: VoteTallyEntry[] = Object.entries(tally)
  .map(([playerId, { name, count }]) => ({
    playerId,
    name,
    initial: name[0]?.toUpperCase() ?? '?',
    votes: count,
  }))
  .sort((a, b) => b.votes - a.votes)
  .map((entry, i, arr) => ({
    ...entry,
    isLeading: i === 0 && entry.votes > 0 && (arr[1]?.votes ?? 0) < entry.votes,
  }))

// Replace the entire host-vote-tally block with:
<VoteTally nominations={nominations} totalVoters={living.length} />
```

---

### 1.5 — NightActions → ActionPrompt + Select + Button

**File:** `src/components/NightActions.tsx`

Current: plain `<select>` + `<button>`.
New: `ActionPrompt` for the instruction header; kui `Select` and `Button` for the controls.

```tsx
import { ActionPrompt } from '@khelahobe/kui/cpdb'
import { Select, Button } from '@khelahobe/kui'
import type { CpdbRole, CpdbPhase } from '@khelahobe/kui/cpdb'

// Map role → message (already exists as actionLabels in the component)
const ACTION_MESSAGE: Record<string, string> = {
  chor:   'Choose your victim for tonight.',
  daktar: 'Choose a player to save.',
  police: 'Investigate a player.',
}

export function NightActions({ myRole, gameCode, playerId, livingPlayers, canAct }: NightActionsProps) {
  const [target, setTarget] = useState('')
  const [actionSubmitted, setActionSubmitted] = useState(false)
  const actionable = ['chor', 'daktar', 'police'].includes(myRole)

  if (!actionable) {
    return (
      <ActionPrompt
        phase="night"
        role="babu"
        message="Night phase: no action for your role."
        subtext="Lay low and wait for dawn."
      />
    )
  }

  const options = Object.entries(livingPlayers)
    .filter(([id, p]) => p.alive !== false && !(myRole === 'chor' && id === playerId))
    .map(([id, p]) => ({ value: id, label: p.name }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <ActionPrompt
        phase="night"
        role={myRole as CpdbRole}
        message={ACTION_MESSAGE[myRole]}
        subtext="This action is only visible to you."
      />
      <Select
        options={[{ value: '', label: '-- Select Player --' }, ...options]}
        value={target}
        onChange={e => setTarget(e.target.value)}
        disabled={!canAct}
      />
      <Button
        variant="primary"
        disabled={!target || !canAct || actionSubmitted}
        onClick={async () => {
          const { setNightAction } = await import('../api/game')
          await setNightAction(gameCode, playerId, { type: myRole as 'chor' | 'daktar' | 'police', target })
          setActionSubmitted(true)
        }}
      >
        {actionSubmitted ? '✅ Action Submitted' : 'Confirm'}
      </Button>
    </div>
  )
}
```

---

### 1.6 — PlayerList → PlayerCard list

**File:** `src/components/PlayerList.tsx`

Current: `<ul>` / `<li>` with dead-player class.
New: `PlayerCard` (variant="list") for each player.

```tsx
import { PlayerCard } from '@khelahobe/kui'

export function PlayerList({ players, lastInvestigation, playerId, myRole }: PlayerListProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {Object.entries(players).map(([id, p]) => {
        const isPolice = myRole === 'police'
        const isIdentifiedChor = isPolice &&
          lastInvestigation?.policeId === playerId &&
          lastInvestigation?.targetId === id &&
          lastInvestigation?.isChor

        const status = p.alive === false
          ? 'eliminated'
          : isIdentifiedChor
          ? 'answered'   // repurpose "answered" as "identified chor" — highlighted state
          : 'waiting'

        return (
          <PlayerCard
            key={id}
            name={isIdentifiedChor ? `🦹‍♂️ ${p.name}` : p.name}
            initial={p.name[0]?.toUpperCase() ?? '?'}
            status={status}
            isMe={id === playerId}
            variant="list"
          />
        )
      })}
    </div>
  )
}
```

---

### 1.7 — CreateGameBar → Input + Button

**File:** `src/components/CreateGameBar.tsx`

Current: raw `<input>` + `<button>` with className strings.
New: kui `Input` and `Button`.

```tsx
import { Input, Button } from '@khelahobe/kui'

export function CreateGameBar({ name, gameCode, onNameChange, onGameCodeChange, onCreate, onJoin }: CreateGameBarProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Input placeholder="Your name" value={name} onChange={e => onNameChange(e.target.value)} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <Button variant="primary" onClick={onCreate}>Create Game</Button>
        <Input placeholder="Game code" value={gameCode} onChange={e => onGameCodeChange(e.target.value)} />
        <Button variant="secondary" onClick={onJoin}>Join</Button>
      </div>
    </div>
  )
}
```

---

### 1.8 — GameHeader → Badge + Button

**File:** `src/components/GameHeader.tsx`

Current: plain text phase/round display, raw buttons.
New: `Badge` for phase, kui `Button` for host controls. Keep as a simple wrapper.

```tsx
import { Badge, Button } from '@khelahobe/kui'

const PHASE_VARIANT = {
  lobby: 'lobby', night: 'night', day: 'day', voting: 'voting', results: 'default'
} as const

export function GameHeader({ phase, round, isHost, gameEnded, onNextPhase, onResolveNight }: GameHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      {phase && (
        <Badge variant={PHASE_VARIANT[phase as keyof typeof PHASE_VARIANT] ?? 'default'} pulse={phase === 'night' || phase === 'voting'}>
          {phase.charAt(0).toUpperCase() + phase.slice(1)} · Round {round}
        </Badge>
      )}
      {isHost && phase && !gameEnded && (
        <>
          <Button size="sm" variant="primary" onClick={onNextPhase}>Next Phase</Button>
          {phase === 'night' && (
            <Button size="sm" variant="secondary" onClick={onResolveNight}>Resolve Night</Button>
          )}
        </>
      )}
    </div>
  )
}
```

---

### 1.9 — PhaseTransition overlay

**Where:** App.tsx — add a `PhaseTransition` overlay that fires when `gameState.phase` changes.

```tsx
import { PhaseTransition } from '@khelahobe/kui/cpdb'
import type { CpdbPhase } from '@khelahobe/kui/cpdb'

// In App component state:
const [phaseOverlayVisible, setPhaseOverlayVisible] = useState(false)
const prevPhaseRef = useRef<string | null>(null)

useEffect(() => {
  if (gameState.phase && gameState.phase !== prevPhaseRef.current) {
    prevPhaseRef.current = gameState.phase
    setPhaseOverlayVisible(true)
    setTimeout(() => setPhaseOverlayVisible(false), 1800)
  }
}, [gameState.phase])

// In JSX (anywhere in the tree, fixed positioning):
<PhaseTransition
  phase={(gameState.phase ?? 'lobby') as CpdbPhase}
  visible={phaseOverlayVisible}
/>
```

---

### 1.10 — Voting → Select + Button

**File:** `src/components/Voting.tsx`

Current: raw `<select>` + `<button>`.
New: kui `Select` and `Button`. Host "Finalize Vote" stays as a `Button`.

```tsx
import { Select, Button } from '@khelahobe/kui'

// (Player view)
<Select
  options={[{ value: '', label: '-- Vote for --' }, ...playerOptions]}
  value={target}
  onChange={e => setTarget(e.target.value)}
  disabled={!canVote}
/>
<Button variant="primary" disabled={!target || !canVote || voteSubmitted} onClick={handleVote}>
  {voteSubmitted ? '✅ Vote Submitted' : 'Submit Vote'}
</Button>

// (Host view)
<Button variant="secondary" onClick={handleFinalize}>Finalize Vote</Button>
```

---

### 1.11 — Game end → WinnerDisplay

**Where:** App.tsx, the `game-end-container` block.

```tsx
import { WinnerDisplay } from '@khelahobe/kui'

{gameState.gameEnded && (
  <WinnerDisplay
    winners={[{
      name: gameState.winner === 'chor' ? 'Chor Wins! 🦹‍♂️' : 'Village Wins! 🏘️',
      initial: gameState.winner === 'chor' ? 'C' : 'V',
    }]}
    animated
  />
)}
```

---

### 1.12 — ConfigureRoles → Button (increment/decrement)

**File:** `src/components/ConfigureRoles.tsx` and `src/components/RoleRow.tsx`

Keep the logic, swap raw buttons for kui `Button` (size="sm", variant="secondary") and wrap in `Card`.

```tsx
import { Button, Card } from '@khelahobe/kui'

// RoleRow.tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
  <span style={{ width: 100 }}>{label}</span>
  <Button size="sm" variant="secondary" onClick={onDec}>−</Button>
  <span style={{ width: 24, textAlign: 'center' }}>{value}</span>
  <Button size="sm" variant="secondary" onClick={onInc}>+</Button>
</div>
```

---

## Tier 2 — Theme/style system replacement

**Goal:** Delete `config/themes.ts`, `styles/components.scss`, `hooks/useTheme.ts`. Replace with `KuiProvider`.

### Step 1 — Install KuiProvider in App.tsx

```tsx
import { KuiProvider } from '@khelahobe/kui'
import type { KuiTheme } from '@khelahobe/kui'

// currentTheme state type changes:
const [currentTheme, setCurrentTheme] = useState<KuiTheme>('chor')

// Wrap the entire return:
return (
  <KuiProvider theme={currentTheme} colorMode="dark">
    {/* all existing JSX */}
  </KuiProvider>
)
```

**Theme mapping** (game's old themes → kui themes):
```
'chor'   → 'chor'     (primary: #e53e3e)
'police' → 'police'   (primary: #3182ce)
'daktar' → 'daktar'   (primary: #38a169)
'babu'   → 'default'  (kui has no babu theme — map to default purple)
```

### Step 2 — Update ThemeSelector

Remove the color preview from `ThemeSelector` (it read from `config/themes`). Replace with simple role-badge buttons:

```tsx
import { Badge } from '@khelahobe/kui'
import type { KuiTheme } from '@khelahobe/kui'

const THEMES: { id: KuiTheme | 'babu'; label: string }[] = [
  { id: 'chor',   label: 'Chor 🦹‍♂️' },
  { id: 'police', label: 'Police 👮' },
  { id: 'daktar', label: 'Daktar 💉' },
  { id: 'babu',   label: 'Babu 👤' },     // maps to 'default' in KuiProvider
]
```

### Step 3 — Delete these files

```
src/config/themes.ts      ← deleted (replaced by KuiProvider tokens)
src/hooks/useTheme.ts     ← deleted (replaced by KuiProvider)
src/styles/components.scss ← deleted (all 1,774 lines — replaced by kui component styles)
```

Remove the import `'./styles/components.scss'` from `App.tsx`.

### Step 4 — Add styles import

In `src/main.tsx`:
```tsx
import '@khelahobe/kui/styles'
```

### Step 5 — Add minimal layout styles

Create `src/styles/layout.scss` (replaces only the layout skeleton from components.scss, not the component-level styles — those come from kui now):

```scss
// App-level layout only — no component styles here
.app-container    { max-width: 480px; margin: 0 auto; padding: 16px; }
.host-layout      { display: grid; grid-template-columns: 280px 1fr 280px; gap: 16px; padding: 16px; }
.host-panel       { display: flex; flex-direction: column; gap: 12px; }
```

---

## Tier 3 — App restructure into screens

**Goal:** Break App.tsx (330 lines) into focused screen components. Use kui layout primitives.

### New file structure

```
src/
  screens/
    LobbyScreen.tsx          ← name/code input, create/join buttons
    WaitingRoomScreen.tsx    ← waiting for start; ConfigureRoles (host), PlayerList
    GameScreen.tsx           ← gameplay; splits into HostGameView / PlayerGameView
    ResultsScreen.tsx        ← WinnerDisplay, play-again button
  components/                ← keep, but now only kui-wrapped presentational pieces
  App.tsx                    ← thin router: picks which screen to render based on game state
```

### App.tsx after refactor

```tsx
export default function App() {
  const playerId = useMemo(() => getOrCreatePlayerId(), [])
  const [name, setName] = useState('')
  const [gameCode, setGameCode] = useState('')
  const [currentTheme, setCurrentTheme] = useState<KuiTheme>('chor')
  const gameState = useGameState(gameCode, playerId)

  const screen = deriveScreen(gameCode, gameState)  // 'lobby' | 'waiting' | 'game' | 'results'

  return (
    <KuiProvider theme={currentTheme} colorMode="dark">
      <PageBackground variant="dark" />
      {screen === 'lobby'   && <LobbyScreen ... />}
      {screen === 'waiting' && <WaitingRoomScreen ... />}
      {screen === 'game'    && <GameScreen ... />}
      {screen === 'results' && <ResultsScreen ... />}
      <ThemeSelector currentTheme={currentTheme} onThemeChange={setCurrentTheme} />
    </KuiProvider>
  )
}

function deriveScreen(gameCode: string, gs: ReturnType<typeof useGameState>) {
  if (!gameCode || !gs.hostId) return 'lobby'
  if (gs.gameEnded) return 'results'
  if (!gs.phase) return 'waiting'
  return 'game'
}
```

### LobbyScreen.tsx

Uses: `TitleBlock`, `Card`, `CreateGameBar` (now kui Input+Button).

```tsx
<Card>
  <Card.Body>
    <TitleBlock title="Chor Police Daktar Babu" subtitle="The Game of Deception" />
    <CreateGameBar ... />
  </Card.Body>
</Card>
```

### WaitingRoomScreen.tsx

Uses: `RoomCode`, `PlayerCard` list, `ConfigureRoles` (host only), `Button` for start.

```tsx
<div>
  <RoomCode code={gameCode} label="Game Code" size="lg" />
  <PlayerList players={gameState.players} ... />
  {isHost && <ConfigureRoles ... />}
</div>
```

### GameScreen.tsx

Delegates to `HostGameView` or `PlayerGameView` based on `isHost`. Each is its own component.

**HostGameView:** 3-column grid (ConfigureRoles sidebar | game controls + VoteTally | announcements feed).
**PlayerGameView:** single column (RoleCard, PlayerList, NightActions/Voting, Announcements).

### ResultsScreen.tsx

```tsx
<Card>
  <Card.Body>
    <WinnerDisplay winners={...} animated />
    <Button variant="primary" onClick={resetGame}>Play Again</Button>
  </Card.Body>
</Card>
```

---

## SimulationView.tsx

Also needs the same Tier 1 swaps applied (it renders many of the same components). Do this after App.tsx Tier 1 is complete — the component swaps will carry over automatically since they're imported by both.

---

## Implementation order

1. `pnpm add @khelahobe/kui` + styles import in main.tsx
2. Tier 1 — one component at a time, test in browser after each:
   - 1.1 RoleDisplay → RoleCard
   - 1.2 RoleBadge → Badge
   - 1.3 Announcements → InvestigationResult + EliminationAnnouncement
   - 1.4 Host vote tally → VoteTally
   - 1.5 NightActions → ActionPrompt + Select + Button
   - 1.6 PlayerList → PlayerCard
   - 1.7 CreateGameBar → Input + Button
   - 1.8 GameHeader → Badge + Button
   - 1.9 Add PhaseTransition overlay to App.tsx
   - 1.10 Voting → Select + Button
   - 1.11 Game end → WinnerDisplay
   - 1.12 ConfigureRoles → Button (size sm)
3. Tier 2 — KuiProvider + delete old style system
4. Tier 3 — screen split

---

## Key types to know during implementation

```ts
// All from @khelahobe/kui/cpdb
type CpdbRole  = 'chor' | 'police' | 'daktar' | 'babu'
type CpdbPhase = 'lobby' | 'night' | 'day' | 'voting' | 'results'

interface VoteTallyEntry {
  playerId: string; name: string; initial: string
  votes: number; isLeading?: boolean
}

// From @khelahobe/kui
type KuiTheme = 'default' | 'chor' | 'police' | 'daktar'
// Note: 'babu' is not a valid KuiTheme — map to 'default'
```

## Type cast pattern for game data → kui types

The game stores roles as `string` in Firebase. Cast at the component boundary:
```ts
const role = (myRole as CpdbRole)            // trust Firebase data
const phase = (gameState.phase as CpdbPhase) // fallback: ?? 'lobby'
```

---

## Files to delete after Tier 2

```
src/config/themes.ts
src/hooks/useTheme.ts
src/styles/components.scss
```

## Files that survive (game logic, Firebase, routing)

```
src/hooks/useGameState.ts   ← untouched — pure data layer
src/api/game.ts             ← untouched
src/firebase.ts             ← untouched
src/utils.ts                ← untouched
src/types.ts                ← untouched
src/SimulationLauncher.tsx  ← mostly untouched (minor kui swaps)
```
