import { ref, update, get } from 'firebase/database';
import { db } from '../firebase';

export async function updateGameField(gameCode: string, field: string, value: any) {
  const gameRef = ref(db, `games/${gameCode}`);
  await update(gameRef, { [field]: value });
}

export async function getGameData(gameCode: string) {
  const gameRef = ref(db, `games/${gameCode}`);
  const snapshot = await get(gameRef);
  return snapshot.exists() ? snapshot.val() : null;
}

export async function updatePlayerField(gameCode: string, playerId: string, field: string, value: any) {
  const playerRef = ref(db, `games/${gameCode}/players/${playerId}`);
  await update(playerRef, { [field]: value });
}
