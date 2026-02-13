import Phaser from 'phaser';

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const TILE_SIZE = 48; // 32x32 or 48x48
export const GRID_WIDTH = 16;
export const GRID_HEIGHT = 12;

export const COLORS = {
  BACKGROUND: 0x1a1a2e,
  DIRT: 0x4a4e69,
  WALL: 0x16213e,
  ROCK: 0x9a8c98,
  GEM: 0x00fff5, // Cyan Neon
  EXIT: 0x39ff14, // Neon Green
  PLAYER: 0xff00ff, // Neon Pink
  ENEMY: 0xff0055, // Neon Red
};

export type GameState = {
  score: number;
  gemsCollected: number;
  timeLeft: number;
  gameOver: boolean;
  won: boolean;
};

export const GameEvents = {
  SCORE_UPDATE: 'score-update',
  GAME_OVER: 'game-over',
  GAME_WON: 'game-won',
};
