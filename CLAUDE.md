# CLAUDE.md — ChorPoliceDaktarBabu

Single source of truth for AI agents working on this repo. Read this before touching any source file.

---

## 1. What This Project Is

**Chor Police Daktar Babu** is a real-time multiplayer social deduction game (think Mafia/Werewolf) for 4–14 players. One player hosts on a desktop dashboard; everyone else plays on mobile via a 4-digit room code.

**Tech stack:**
- React 19 + TypeScript (strict)
- Vite 7 (bundler)
- Firebase Realtime Database (RTDB) — the only backend
- `@khelahobe/kui` — design system from npm (`^0.3.0`)
- SCSS (`sass-embedded`) — legacy styles, being phased out
- pnpm (lockfile committed)

**Roles:** Chor (villain), Police (investigator), Daktar (healer), Babu (villager). Village wins by eliminating all Chor; Chor wins when their count equals or exceeds non-Chor living players.

---

## 2. Repo Structure

```
ChorPoliceDaktarBabu/
├── src/
│   ├── main.tsx                  Entry point; routes to App / SimulationView / SimulationLauncher via URL params
│   ├── App.tsx                   Main app — host dashboard + player mobile view (330 lines)
│   ├── SimulationView.tsx        Dev tool: split-pane automated game replay (imports components.scss — see §8)
│   ├── SimulationLauncher.tsx    Dev tool: opens 5 real browser windows as separate players (imports components.scss)
│   ├── firebase.ts               Firebase app + RTDB init; reads VITE_FB_* env vars
│   ├── types.ts                  All shared TypeScript types (GameState, PlayerState, RoleConfig, etc.)
│   ├── utils.ts                  getOrCreatePlayerId(), getDefaultRolesByCount() lookup table
│   ├── api/
│   │   └── game.ts               ALL Firebase writes — never write to RTDB from anywhere else
│   ├── hooks/
│   │   ├── useGameState.ts       Real-time RTDB subscription hook — pure data, no UI
│   │   └── useTheme.ts           DEAD FILE — was CSS-var injector, replaced by KuiProvider (Tier 2 done)
│   ├── config/
│   │   └── themes.ts             DEAD FILE — old theme palette, replaced by KuiProvider (Tier 2 done)
│   ├── components/
│   │   ├── index.ts              Barrel export for all components
│   │   ├── Announcements.tsx     Night death + elimination + investigation feed
│   │   ├── ConfigureRoles.tsx    Host lobby role-count configurator
│   │   ├── CreateGameBar.tsx     Lobby name input + create/join controls
│   │   ├── GameHeader.tsx        Phase badge + host control buttons
│   │   ├── NightActions.tsx      Role-specific night action UI (chor/daktar/police/babu)
│   │   ├── PlayerList.tsx        List of all players with alive/dead/investigated states
│   │   ├── RoleBadge.tsx         Inline role chip (Badge wrapper)
│   │   ├── RoleDisplay.tsx       Full role card revealed on tap (RoleCard wrapper)
│   │   ├── RoleRow.tsx           Single role +/- row used inside ConfigureRoles
│   │   ├── ThemeSelector.tsx     Four theme-picker buttons (chor/police/daktar/babu)
│   │   └── Voting.tsx            Player vote UI + host "Finalize Vote" button
│   ├── styles/
│   │   └── components.scss       1774-line legacy stylesheet — still imported by SimulationView + SimulationLauncher; NOT imported by App.tsx
│   └── utils/
│       └── gameUtils.ts          Utility wrappers (updateGameField, getGameData, updatePlayerField) — currently unused by main app
├── package.json                  deps: firebase ^12, react ^19, @khelahobe/kui (local path)
├── KUI_REFACTOR_PLAN.md          Detailed 3-tier migration plan (Tier 1 done, Tier 2 partial, Tier 3 not started)
└── CLAUDE.md                     This file
```

**Environment variables** (`.env` file, not committed):
```
VITE_FB_API_KEY
VITE_FB_AUTH_DOMAIN
VITE_FB_DATABASE_URL
VITE_FB_PROJECT_ID
VITE_FB_STORAGE_BUCKET
VITE_FB_MESSAGING_SENDER_ID
VITE_FB_APP_ID
VITE_FB_MEASUREMENT_ID   (optional, Analytics only)
```

---

## 3. Firebase RTDB Schema

All game data lives under `games/{gameCode}/`. The `gameCode` is a 4-digit numeric string (e.g. `"4821"`).

### `games/{gameCode}/` root fields

| Field | Type | Description |
|---|---|---|
| `hostId` | `string` | playerId of the host (never has a player entry in `players/`) |
| `status` | `"lobby" \| "playing" \| "ended"` | overall game lifecycle |
| `phase` | `"night" \| "day" \| "voting" \| null` | current gameplay phase; null = lobby/pre-game |
| `round` | `number` | current round number; 0 = not started |
| `settings.maxPlayers` | `number` | default 14 |
| `settings.roleConfig.chor` | `number` | count of Chor roles |
| `settings.roleConfig.daktar` | `number` | count of Daktar roles |
| `settings.roleConfig.police` | `number` | count of Police roles |
| `settings.roleConfig.babu` | `number` | auto-calculated; not written by `updateRoleConfig` directly |
| `settings.timerDurations` | `Record<string, number>` | optional per-phase timer overrides |
| `timer.running` | `boolean` | whether countdown is active |
| `timer.seconds` | `number` | remaining seconds (when paused) |
| `timer.endAt` | `number \| null` | epoch ms when timer expires (when running) |
| `timer.updatedAt` | `number` | epoch ms of last write |
| `results.lastDeath` | `string \| null` | playerId killed during last night resolution |
| `results.lastElimination` | `string \| null` | playerId voted out during last vote finalization |
| `results.lastInvestigation` | `{ policeId, targetId, isChor } \| null` | police investigation result from last night |

### `games/{gameCode}/players/{playerId}/`

| Field | Type | Description |
|---|---|---|
| `name` | `string` | display name |
| `role` | `string` | `"chor" \| "police" \| "daktar" \| "babu" \| ""` (empty until game starts) |
| `alive` | `boolean` | true = alive; false = eliminated |
| `action` | `{ type: "chor"\|"daktar"\|"police"; target: string } \| null` | night action submission; cleared after resolveNight |
| `vote` | `string \| null` | playerId this player is voting for; cleared after finalizeVote |

**Important:** The host's `playerId` is stored in `hostId` but the host does **not** have a corresponding entry under `players/`. The host is excluded from `gamePlayers` in App.tsx via:
```ts
const gamePlayers = Object.fromEntries(
  Object.entries(gameState.players).filter(([id]) => id !== gameState.hostId)
)
```

---

## 4. Game State Machine

### Phase order
```
[pre-game] lobby → (host clicks Start) → night → (resolveNight) → day → (nextPhase) → voting → (finalizeVote) → night (round+1) → ...
```

### What happens at each transition

| Transition | Trigger | What `api/game.ts` does |
|---|---|---|
| lobby → night (round 1) | `startGame()` | Sets `status="playing"`, `phase="night"`, `round=1`, initializes timer; then calls `assignRoles()` which shuffles roles and writes `players/{id}/role` |
| night → day | `resolveNight()` | Tallies chor votes, applies daktar save, sets `players/{victim}/alive=false`, writes `results.lastDeath` + `results.lastInvestigation`, clears all `action` fields, then calls `nextPhase()` (night→day) |
| day → voting | `nextPhase()` | Writes `phase="voting"` |
| voting → night (next round) | `finalizeVote()` | Counts votes, eliminates majority target (if any), writes `results.lastElimination`, clears all `vote` fields, sets `phase="night"`, increments `round` |

### Host controls
- **Next Phase** button: calls `nextPhase()` directly (day→voting only; not meant for night→day since that goes through resolveNight)
- **Resolve Night** button (night phase only): calls `resolveNight()`
- **Finalize Vote** button (voting phase, host view in Voting component): calls `finalizeVote()`
- **Restart Game** button (game ended): calls `restartGame()` which resets all player fields, clears results, sets `phase=null`, `round=0`

### Win condition
Checked client-side in `useGameState` on every players snapshot via `checkWinCondition()`:
- `'village'` if no living Chor remain
- `'chor'` if living Chor count >= living non-Chor count
- `null` if game continues

---

## 5. `useGameState` Hook

**Location:** `src/hooks/useGameState.ts`

**Signature:** `useGameState(gameCode: string, playerId: string)`

Sets up multiple `onValue` Firebase listeners (unsubscribed on cleanup). Runs a second players listener to check win condition on every update.

**Returned state:**

| Field | Type | Source path |
|---|---|---|
| `players` | `Record<string, { name: string; alive?: boolean; role?: string }>` | `games/{gameCode}/players` |
| `myRole` | `string` | `players[playerId].role` |
| `myAlive` | `boolean` | `players[playerId].alive !== false` |
| `hostId` | `string \| null` | `games/{gameCode}/hostId` |
| `roles` | `{ chor, daktar, police, babu: number }` | `games/{gameCode}/settings/roleConfig` |
| `phase` | `string \| null` | `games/{gameCode}/phase` |
| `round` | `number` | `games/{gameCode}/round` |
| `lastDeath` | `string \| null` | `games/{gameCode}/results.lastDeath` |
| `lastElimination` | `string \| null` | `games/{gameCode}/results.lastElimination` |
| `lastInvestigation` | `{ policeId, targetId, isChor } \| null` | `games/{gameCode}/results.lastInvestigation` |
| `gameEnded` | `boolean` | derived from win condition check |
| `winner` | `string \| null` | `'chor'` or `'village'` when `gameEnded` is true |

**Rules:** This hook is pure data — no JSX, no side effects beyond Firebase subscriptions, no UI logic.

---

## 6. API Functions (`src/api/game.ts`)

All Firebase writes go through here. Never call `ref(db, ...)` + `update/set` from components or hooks directly.

| Function | Signature | Firebase writes |
|---|---|---|
| `generateGameCode` | `() => string` | none (pure) |
| `createGame` | `(hostId) => Promise<string>` | `games/{code}` — full initial GameState |
| `joinGame` | `(gameCode, playerId, name) => Promise<void>` | `games/{code}/players/{playerId}` |
| `updateRoleConfig` | `(gameCode, roleConfig) => Promise<void>` | `games/{code}/settings/roleConfig` |
| `startGame` | `(gameCode) => Promise<void>` | `games/{code}`: status, phase, round, timer; then calls `assignRoles()` |
| `assignRoles` | `(gameCode) => Promise<void>` | `games/{code}/players/{id}/role` for all players (shuffled) |
| `nextPhase` | `(gameCode) => Promise<void>` | `games/{code}/phase` (night→day, day→voting, voting→night+round++) |
| `setTimerStart` | `(gameCode) => Promise<void>` | `games/{code}/timer`: running=true, endAt=now+seconds*1000 |
| `setTimerPause` | `(gameCode) => Promise<void>` | `games/{code}/timer`: running=false, endAt=null, seconds=remaining |
| `setTimerReset` | `(gameCode, seconds?) => Promise<void>` | `games/{code}/timer`: running=false, seconds, endAt=null |
| `setNightAction` | `(gameCode, playerId, {type, target}) => Promise<void>` | `games/{code}/players/{playerId}/action` |
| `setVote` | `(gameCode, voterId, targetId) => Promise<void>` | `games/{code}/players/{voterId}/vote` |
| `finalizeVote` | `(gameCode) => Promise<void>` | Eliminates top-voted player (if majority), clears votes, sets phase=night, round++ |
| `resolveNight` | `(gameCode) => Promise<void>` | Kills chor victim (unless daktar saved), writes results, clears actions, calls nextPhase |
| `checkWinCondition` | `(players) => 'chor' \| 'village' \| null` | none (pure function) |
| `restartGame` | `(gameCode) => Promise<void>` | Resets all player fields, clears results/phase/round |

**`babu` calculation:** `babu = total_players - (chor + daktar + police)`. `updateRoleConfig` does not write `babu` to Firebase — it's always derived. `assignRoles` computes the live count at assignment time.

**Majority vote rule:** `Math.floor(livingPlayers.length / 2) + 1` votes required for elimination. Ties result in no elimination.

---

## 7. Component Inventory

All in `src/components/`. All are fully refactored onto `@khelahobe/kui` (Tier 1 complete).

| Component | Props | kui components used |
|---|---|---|
| `Announcements` | `lastDeath, lastElimination, lastInvestigation, players, playerId` | `EliminationAnnouncement`, `InvestigationResult` from `@khelahobe/kui/cpdb` |
| `ConfigureRoles` | `roles, totalPlayers, onRolesChange, onStartGame` | `Button`, `Card` (with `Card.Header`, `Card.Body`, `Card.Footer`) from `@khelahobe/kui`; uses `RoleRow` |
| `CreateGameBar` | `name, gameCode, onNameChange, onGameCodeChange, onCreate, onJoin` | `Input`, `Button` from `@khelahobe/kui` |
| `GameHeader` | `phase, round, isHost, gameEnded, onNextPhase, onResolveNight` | `Badge`, `Button` from `@khelahobe/kui` |
| `NightActions` | `myRole, gameCode, playerId, livingPlayers, canAct` | `ActionPrompt` from `@khelahobe/kui/cpdb`; `Select`, `Button` from `@khelahobe/kui` |
| `PlayerList` | `players, lastInvestigation?, playerId, myRole` | `PlayerCard` from `@khelahobe/kui` |
| `RoleBadge` | `role: string` | `Badge` from `@khelahobe/kui` |
| `RoleDisplay` | `myRole, showRole, onToggleShowRole, playerName?` | `RoleCard` from `@khelahobe/kui/cpdb` |
| `RoleRow` | `label, value, onDec, onInc` | `Button` (size="sm") from `@khelahobe/kui` |
| `ThemeSelector` | `currentTheme, onThemeChange` | Raw `<button>` elements (intentional — uses kui CSS vars for styling) |
| `Voting` | `gameCode, playerId, livingPlayers, isHost, canVote` | `Select`, `Button` from `@khelahobe/kui` |

**App.tsx also uses these kui components directly:**
- `KuiProvider`, `WinnerDisplay` from `@khelahobe/kui`
- `PhaseTransition`, `VoteTally` from `@khelahobe/kui/cpdb`
- Types: `KuiTheme` from `@khelahobe/kui`; `CpdbPhase`, `VoteTallyEntry` from `@khelahobe/kui/cpdb`

**Theme mapping** (`currentTheme` string → `KuiTheme` passed to `KuiProvider`):
```ts
const THEME_MAP: Record<string, KuiTheme> = {
  chor: 'chor', police: 'police', daktar: 'daktar', babu: 'default',
}
```
Note: `'babu'` is not a valid `KuiTheme` — it maps to `'default'` (which is purple).

---

## 8. KUI Refactor Status (branch: `feat/kui-refactor`)

### Tier 1 — Component swaps: COMPLETE, TypeScript-clean
All 12 swaps from `KUI_REFACTOR_PLAN.md` are done:
- All game components use kui primitives internally
- `PhaseTransition` overlay added to App.tsx
- `VoteTally` live tally in host dashboard
- `WinnerDisplay` for game end

### Tier 2 — Delete old style system: PARTIALLY DONE

| Item | Status |
|---|---|
| `useTheme` removed from App.tsx | Done |
| `KuiProvider` wrapping both host + player views | Done |
| `@khelahobe/kui/styles` imported in `main.tsx` | Done |
| `src/hooks/useTheme.ts` deleted | NOT DONE — dead file still exists |
| `src/config/themes.ts` deleted | NOT DONE — dead file still exists |
| `src/styles/components.scss` deleted | NOT DONE — 1774-line file still exists |
| App.tsx no longer imports `components.scss` | Done |
| `SimulationView.tsx` still imports `components.scss` | STILL BROKEN — line 4: `import './styles/components.scss'` |
| `SimulationLauncher.tsx` still imports `components.scss` | STILL BROKEN — line 4: `import './styles/components.scss'` |
| `currentTheme` persisted to localStorage | NOT DONE |
| Minimal layout-only scss created | NOT DONE |

### Tier 3 — Screen split into `src/screens/`: NOT STARTED

---

## 9. Remaining Work (Priority Order)

### 1. Fix dead scss imports (unblocks deleting components.scss)
`SimulationView.tsx` line 4 and `SimulationLauncher.tsx` line 4 both import `'./styles/components.scss'`. These are dev tools that need to either: (a) switch to a minimal layout scss, or (b) be refactored to use kui. Until fixed, `components.scss` cannot be deleted.

### 2. Delete dead files
- `src/hooks/useTheme.ts` — no imports anywhere post-Tier 2; safe to delete
- `src/config/themes.ts` — only imported by `useTheme.ts`; safe to delete after #1

### 3. Strip `components.scss` to layout-only (~60 lines)
After SimulationView/SimulationLauncher are fixed, `components.scss` should be reduced to only the app layout classes that haven't moved to kui yet (`.app-container`, `.host-root`, `.host-layout`, `.host-panel`, `.host-topbar`, `.sim-*` classes).

### 4. Persist `currentTheme` to localStorage
In App.tsx, `currentTheme` state is initialized as `'chor'` and not persisted. Add:
```ts
const [currentTheme, setCurrentTheme] = useState<string>(
  () => localStorage.getItem('cp_theme') ?? 'chor'
)
useEffect(() => { localStorage.setItem('cp_theme', currentTheme) }, [currentTheme])
```

### 5. Narrow types in `useGameState`
- `phase` is typed as `string | null` — should be `CpdbPhase | null` (or `GamePhase | null` from types.ts)
- `myRole` is typed as `string` — should be `CpdbRole | ""` (or `RoleConfig` key)
- `vote?` already exists on `PlayerState` but `useGameState` does not expose it — add if vote display is needed per-player

### 6. Write `deriveScreen()` pure function
For Tier 3, a deterministic screen router:
```ts
function deriveScreen(gameCode: string, gs: ReturnType<typeof useGameState>): 'lobby' | 'waiting' | 'game' | 'results' {
  if (!gameCode || !gs.hostId) return 'lobby'
  if (gs.gameEnded) return 'results'
  if (!gs.phase) return 'waiting'
  return 'game'
}
```

### 7. Tier 3 — Screen split
Create `src/screens/LobbyScreen.tsx`, `WaitingRoomScreen.tsx`, `GameScreen.tsx`, `ResultsScreen.tsx`. Reduce `App.tsx` to a thin router using `deriveScreen()`. See `KUI_REFACTOR_PLAN.md` §Tier 3 for full spec.

---

## 10. Key Invariants — Never Break These

1. **`useGameState` is pure data.** No JSX, no side effects beyond Firebase `onValue` subscriptions. If you need to read game state in a component, use this hook — don't add new `onValue` calls elsewhere.

2. **All Firebase writes go through `src/api/game.ts`.** Never call `set()`, `update()`, `push()` from components, hooks, or screens directly. If you need a new write operation, add it to `game.ts`.

3. **Components are presentational.** Game components in `src/components/` receive all data and callbacks via props. They don't import from `api/game.ts` directly — except for dynamic imports inside event handlers (e.g. `const { setNightAction } = await import('../api/game')`), which is the established pattern for lazy API calls in this codebase.

4. **Host is excluded from `players/` in the RTDB.** The host creates the game and their `playerId` is written to `hostId`, but they never call `joinGame()`. Always filter out `hostId` before rendering the player list.

5. **`babu` count is always derived, never stored directly.** `babu = totalPlayers - (chor + daktar + police)`. `updateRoleConfig` only writes `chor`, `daktar`, `police`.

6. **`@khelahobe/kui` is published on npm** at `^0.3.0`. To pick up a new kui release, bump the version in `package.json` and run `pnpm install`.

7. **Simulation files are dev tools only.** `SimulationView.tsx` and `SimulationLauncher.tsx` are not player-facing. They write deterministic game sequences directly to Firebase using predetermined player IDs (`sim_p1`–`sim_p5`, `sim_alice`–`sim_eve`). Do not use their patterns in production code.

---

## 11. Screen Derivation Logic

The current App.tsx does not use `deriveScreen()` yet (Tier 3 is unstarted), but the logic is embedded in App.tsx conditionals. Here is the authoritative derivation:

```
hasJoinedGame = gameCode && hasExplicitlyJoined && gameState.players[playerId] exists
showGameInterface = hasJoinedGame || (gameCode && isHost)

Screen:
  showGameInterface=false → Lobby (CreateGameBar)
  showGameInterface=true, isHost=true → Host Dashboard (3-column layout)
  showGameInterface=true, isHost=false → Player Mobile View (single column)

Within game views:
  phase=null → pre-game; host shows ConfigureRoles, player waits
  phase='night' → NightActions shown to player (if myRole set)
  phase='voting' → Voting shown; host shows VoteTally + Finalize button
  phase='day' → GameHeader only; no special UI
  gameEnded=true → WinnerDisplay shown; host shows Restart button
```

**`hasExplicitlyJoined`** is a local React state flag set to `true` after `joinGame()` resolves. It prevents the UI from jumping to the game view if the player's `localStorage` has a `cp_player_id` that happens to be in a game but they haven't joined this session.

**Auto-join:** URL params `?pid=X&join=CODE&name=NAME` trigger `joinGame()` automatically (used by `SimulationLauncher`). `?simulate` renders `SimulationView`. `?launch` renders `SimulationLauncher`.

---

## 12. SimulationView — Dev Tool

**File:** `src/SimulationView.tsx`

**Not player-facing.** Accessed via `/?simulate` URL param.

**What it does:** Creates a real Firebase game, joins 5 predetermined players, starts the game with forced role assignments, then plays out a scripted 2-round game with delays to make it watchable. Renders a 2×2 grid of `PlayerPane` components (Alice, Bob, Charlie, Diana — Eve is in the game but off-screen).

**How to trigger it:** `http://localhost:5173/?simulate`

**SimulationLauncher** (`/?launch`) is a more realistic alternative: it opens 5 separate browser windows, each running the real App.tsx with `?pid=X&join=CODE&name=NAME` URL params, so each window sees only its own player perspective. Better for visual testing; requires a browser that allows `window.open()`.

**Known issue:** Both `SimulationView.tsx` and `SimulationLauncher.tsx` still import `'./styles/components.scss'` at line 4. This blocks deleting `components.scss` and must be fixed as part of completing Tier 2.

**Player IDs used by SimulationView:** `sim_p1`–`sim_p5`, host `sim_host_spectator`
**Player IDs used by SimulationLauncher:** `sim_alice`, `sim_bob`, `sim_charlie`, `sim_diana`, `sim_eve`, host `sim_host_driver`

These IDs can collide across runs if you hit the same game code twice — not a concern in practice since game codes are 4-digit random and games are not cleaned up automatically.
