
import React from 'react';
import { InventoryItem } from './types';

export const INITIAL_STATS = {
  playerName: 'Sung Jin-Woo',
  level: 1,
  exp: 0,
  maxExp: 100,
  hp: 100,
  maxHp: 100,
  mp: 50,
  maxMp: 50,
  fatigue: 0,
  maxFatigue: 100,
  job: 'Nenhum',
  title: 'O Caçador Mais Fraco',
  gold: 1500,
  points: 10,
  preferredAuraType: 'DOMINANTE' as const,
  notificationSettings: {
    levelUp: true,
    dungeonAvailable: true,
    itemDrop: true,
    questProgress: true,
    systemLogs: true
  },
  attributes: {
    strength: 10,
    agility: 10,
    vitality: 10,
    intelligence: 10,
    sense: 10,
  }
};

export const INITIAL_QUESTS = [
  { id: '1', name: 'Flexões', target: 100, current: 0, unit: 'reps', expReward: 2, fatigueCost: 1 },
  { id: '2', name: 'Abdominais', target: 100, current: 0, unit: 'reps', expReward: 2, fatigueCost: 1 },
  { id: '3', name: 'Agachamentos', target: 100, current: 0, unit: 'reps', expReward: 2, fatigueCost: 1 },
  { id: '4', name: 'Corrida', target: 10, current: 0, unit: 'km', expReward: 20, fatigueCost: 10 },
];

export const ICONS = {
  STATUS: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  QUEST: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  ),
  INVENTÁRIO: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
  DUNGEON: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  ),
  LOJA: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  )
};

export const SHOP_ITEMS: InventoryItem[] = [
  { 
    id: 'f1', 
    name: 'Soro de Recuperação Rápida', 
    title: 'Energia de Rank E', 
    rarity: 'E', 
    type: 'CONSUMÍVEL', 
    price: 300, 
    description: 'Um soro básico destilado. Reduz a fadiga em 25 pontos instantaneamente.' 
  },
  { 
    id: 'f2', 
    name: 'Essência de Vitalidade Purificada', 
    title: 'Vigor do Caçador', 
    rarity: 'C', 
    type: 'CONSUMÍVEL', 
    price: 1500, 
    description: 'Essência realista de Rank C. Limpa o corpo de toxinas e reduz 60 de fadiga.' 
  },
  { 
    id: 'f3', 
    name: 'Bebida Energética do Sistema', 
    title: 'Essência do Monarca', 
    rarity: 'A', 
    type: 'CONSUMÍVEL', 
    price: 8000, 
    description: 'Item lendário. Restaura a fadiga a 0 e recupera todo PV e PM.' 
  },
  { 
    id: 'p1', 
    name: 'Poção de Vida Menor', 
    title: 'Cura Rápida', 
    rarity: 'E', 
    type: 'CONSUMÍVEL', 
    price: 200, 
    description: 'Recupera 30 PV instantaneamente.' 
  },
  { 
    id: 'p2', 
    name: 'Elixir de Mana Estelar', 
    title: 'Fluxo Arcano', 
    rarity: 'B', 
    type: 'CONSUMÍVEL', 
    price: 3500, 
    description: 'Recupera 80 PM. Ideal para usuários de habilidades mágicas.' 
  },
  { 
    id: 's5', 
    name: 'Presa de Kasaka', 
    title: 'A Lâmina Venenosa', 
    rarity: 'A', 
    type: 'ARMA', 
    price: 25000, 
    description: 'Adaga curva ultra-detalhada com aura violeta. Causa veneno ao atingir.' 
  },
  { 
    id: 's6', 
    name: 'Ira de Kamish', 
    title: 'O Legado do Dragão', 
    rarity: 'S', 
    type: 'ARMA', 
    price: 500000, 
    description: 'Lâmina lendária de Rank S. A arma definitiva de um Monarca.' 
  }
];
