export const CONFIG = {
  saveKey: 'masterplinko.save',
  lockName: 'masterplinko.writer',
  initialWallet: 1900,
  minBet: 100,
  maxBet: 1000,
  maxBalls: 50,
  manualInterval: 500,
  autoInterval: 2000,
  flightDuration: 3600,
  repairThreshold: 5000,
  factoryDuration: 15000,
  factorySalary: 1500,
  chargeCount: 100,
  bonusDuration: 10000,
  historyLimit: 100,
  cameraTransition: 500,
} as const;

export const VIEWS = {
  plinko: { x: 0, y: -0.35, width: 12.8, height: 14.4 },
  azur: { x: 10, y: -2.2, width: 10.5, height: 10.5 },
} as const;

export const OUTCOMES = [
  { multiplier: 30, weight: 400, exits: [7] },
  { multiplier: 50, weight: 250, exits: [6, 8] },
  { multiplier: 100, weight: 170, exits: [5, 9] },
  { multiplier: 150, weight: 90, exits: [4, 10] },
  { multiplier: 300, weight: 50, exits: [3, 11] },
  { multiplier: 500, weight: 20, exits: [2, 12] },
  { multiplier: 1000, weight: 18, exits: [1, 13] },
  { multiplier: 4000, weight: 2, exits: [0, 14] },
] as const;

export const EXITS = [4000, 1000, 500, 300, 150, 100, 50, 30, 50, 100, 150, 300, 500, 1000, 4000];

export const UPGRADES = {
  'azur.initial_repair': { name: 'Réparation initiale', price: 2500, description: 'Une machine remise sur pieds. Garantie verbale incluse.' },
  'azur.auto_launcher': { name: 'Doigt mécanique', price: 4000, description: 'Une bille gratuite toutes les 2 s. Il ne demande jamais de pause.' },
  'azur.accounting_tray': { name: 'Bac comptable', price: 1500, description: 'Les 100 derniers résultats. Pour mettre des chiffres sur le bruit.' },
} as const;
export type UpgradeId = keyof typeof UPGRADES;
