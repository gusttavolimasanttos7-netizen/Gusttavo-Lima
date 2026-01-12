
export type StatusType = 'QUEIMANDO' | 'ENVENENADO' | 'ATORDOADO' | 'FORTALECIDO';

export interface StatusEffect {
  id: string;
  type: StatusType;
  name: string;
  duration: number; // em segundos
  description: string;
}

export interface NotificationSettings {
  levelUp: boolean;
  dungeonAvailable: boolean;
  itemDrop: boolean;
  questProgress: boolean;
  systemLogs: boolean;
}

export interface PlayerStats {
  playerName: string;
  level: number;
  exp: number;
  maxExp: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  fatigue: number;
  maxFatigue: number;
  job: string;
  title: string;
  gold: number;
  points: number;
  profileImage?: string; 
  preferredAuraType?: 'DOMINANTE' | 'SOMBRAS' | 'DIVINA' | 'SANGUE' | 'GELO' | 'RELÂMPAGO';
  activeEffects: StatusEffect[];
  notificationSettings: NotificationSettings;
  attributes: {
    strength: number;
    agility: number;
    vitality: number;
    intelligence: number;
    sense: number;
  };
}

export interface DailyQuest {
  id: string;
  name: string;
  target: number;
  current: number;
  unit: string;
  expReward: number; // XP ganho por unidade de progresso
  fatigueCost: number; // Fadiga ganha por unidade de progresso
}

export interface InventoryItem {
  id: string;
  name: string;
  title: string;
  rarity: 'E' | 'D' | 'C' | 'B' | 'A' | 'S';
  type: 'ARMA' | 'ARMADURA' | 'CONSUMÍVEL' | 'DIVERSOS';
  description: string;
  price?: number;
  imageUrl?: string;
}

export interface DungeonEncounter {
  name: string;
  rank: string;
  boss: string;
  description: string;
  rewards: string[];
  bossHp: number;
  bossMaxHp: number;
  bossEffects: StatusEffect[];
}
