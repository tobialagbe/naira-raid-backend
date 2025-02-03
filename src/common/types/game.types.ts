export enum GameType {
  NAIRA_RAID = 'naira-raid',
  // Add other games here as needed
}

export interface GameStats {
  totalKills?: number;
  cashCollected?: number;
  // Add other game-specific stats as needed
} 