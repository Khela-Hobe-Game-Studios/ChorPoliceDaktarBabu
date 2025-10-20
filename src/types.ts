export type GameStatus = "lobby" | "playing" | "ended";
export type GamePhase = "night" | "day" | "voting";

export interface RoleConfig {
  chor: number;
  daktar: number;
  police: number;
  babu: number; // auto-calculated in UI logic
}

export interface GameSettings {
  maxPlayers: number;
  roleConfig: RoleConfig;
  timerDurations?: Record<string, number>;
}

export interface PlayerState {
  name: string;
  role: string; // hidden to players in UI
  alive: boolean;
  action?: Record<string, unknown> | null;
  vote?: string | null;
}

export interface GameState {
  hostId: string;
  status: GameStatus;
  phase: GamePhase | null;
  round: number;
  settings: GameSettings;
  players?: Record<string, PlayerState>;
  results?: {
    lastDeath?: string | null;
    lastElimination?: string | null;
    lastInvestigation?: { policeId: string; targetId: string; isChor: boolean } | null;
  };
}


