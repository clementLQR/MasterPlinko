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
  factoryDuration: 60000,
  factoryGreyReward: 50,
  factorySpawnInterval: 700,
  factoryTravelDuration: 6500,
  factoryRedChance: 0.23,
  factoryEventDuration: 7000,
  factoryEventWarning: 2000,
  factoryLaneGapMs: 600,
  chargeCount: 100,
  bonusDuration: 10000,
  bonusFactor: 2,
  historyLimit: 100,
  cameraTransition: 500,
  stairApproach: 2600,
  stairClimb: 3400,
  stairReturnApproach: 5200,
  stairReturnReveal: 2200,
  stairReturnRevealDelay: 600,
  exitFade: 400,
  reducedExitFade: 300,
} as const;

export const FACTORY_EVENTS = {
  overdrive: { name: 'SURCADENCE', belt: 2, supply: 2, detail: 'Tapis ×2 · arrivées ×2', color: '#d79045' },
  delivery: { name: 'ARRIVAGE MASSIF', belt: 1, supply: 2, detail: 'Tapis normal · arrivées ×2', color: '#b5a1ce' },
  slowdown: { name: 'RALENTISSEMENT', belt: 0.5, supply: 0.5, detail: 'Tapis ÷2 · arrivées ÷2', color: '#a8c9b4' },
} as const;

// Même repère pour la maçonnerie, les marches et la hauteur du regard pendant le trajet.
export const CAVE = { floorY: -7.7, rearZ: 48 } as const;
export const STAIRS = {
  x: -19, count: 11, firstY: CAVE.floorY + 0.65, firstZ: 7.2,
  rise: 1.37, run: 0.85, thickness: 0.24, depth: 1.15,
  footZ: 8.15,
} as const;
export const STAIR_LANDING = {
  y: STAIRS.firstY + (STAIRS.count - 1) * STAIRS.rise + STAIRS.thickness / 2,
  z: STAIRS.firstZ - (STAIRS.count - 1) * STAIRS.run,
} as const;

// L'établi, ses pages et leurs cadrages partagent le même repère contre le mur droit.
export const WORKBENCH = { x: 16.7, z: 8, originX: 11.2, originZ: 0.1, yaw: -Math.PI / 2 } as const;
export function atWorkbench(x: number, y: number, z: number) {
  const dx = x - WORKBENCH.originX, dz = z - WORKBENCH.originZ;
  return { x: WORKBENCH.x + dx * Math.cos(WORKBENCH.yaw) + dz * Math.sin(WORKBENCH.yaw), y,
    z: WORKBENCH.z - dx * Math.sin(WORKBENCH.yaw) + dz * Math.cos(WORKBENCH.yaw) };
}

export const VIEWS = {
  plinko: { x: 0.4, y: -0.05, z: 0, width: 44, height: 23.5, offsetX: 0.2, offsetY: 1.05, yaw: 0 },
  commandes: { x: 0, y: -5.1, z: 1, width: 12.8, height: 5.8, offsetX: 0, offsetY: 0.6, yaw: 0 },
  azur: { ...atWorkbench(11.2, -0.2, 0.2), width: 23, height: 17.6, offsetX: 0, offsetY: 1.2, yaw: WORKBENCH.yaw },
  catalogue: { ...atWorkbench(10.9, -0.25, 2.2), width: 6.4, height: 5.8, offsetX: 0, offsetY: 6.5, yaw: WORKBENCH.yaw },
  reglages: { x: -7.15, y: 0, z: 1.5, width: 4, height: 5.4, offsetX: 0, offsetY: 0, yaw: 0 },
  historique: { x: 6.2, y: -5.35, z: 2.1, width: 2.8, height: 3.7, offsetX: 0, offsetY: 0, yaw: 0 },
} as const;

// Emplacements visuels. Les modules futurs n’ajoutent aucun achat ni règle économique.
export const MODULE_SLOTS = [
  { id: 'auto_launcher', unlockId: 'azur.auto_launcher', position: [-6.2, 3.05, 0.1] },
  { id: 'accounting_tray', unlockId: 'azur.accounting_tray', position: [6.05, -3.5, 0.4] },
  { id: 'duplicator', unlockId: 'azur.duplicator', position: [0, -6.7, 1.2] },
  { id: 'instability_counter', unlockId: 'azur.instability_counter', position: [6.1, 4.1, 0.05] },
  { id: 'ventilation', unlockId: 'azur.ventilation', position: [0, 7.05, -0.1] },
] as const;

export const OUTCOMES = [
  // Réglage plus sévère demandé : 84 % de pertes et retour moyen de 59,75 % hors bonus.
  { multiplier: 30, weight: 600, exits: [7] },
  { multiplier: 50, weight: 240, exits: [6, 8] },
  { multiplier: 100, weight: 100, exits: [5, 9] },
  { multiplier: 150, weight: 35, exits: [4, 10] },
  { multiplier: 300, weight: 15, exits: [3, 11] },
  { multiplier: 500, weight: 6, exits: [2, 12] },
  { multiplier: 1000, weight: 3, exits: [1, 13] },
  { multiplier: 4000, weight: 1, exits: [0, 14] },
] as const;

export const EXITS = [4000, 1000, 500, 300, 150, 100, 50, 30, 50, 100, 150, 300, 500, 1000, 4000];

export const UPGRADES = {
  'azur.initial_repair': { name: 'Réparation initiale', price: 2500, description: 'Une machine remise sur pieds. Garantie verbale incluse.' },
  'azur.auto_launcher': { name: 'Doigt mécanique', price: 4000, description: 'Une bille gratuite toutes les 2 s. Il ne demande jamais de pause.' },
  'azur.accounting_tray': { name: 'Bac comptable', price: 1500, description: 'Les 100 derniers résultats. Pour mettre des chiffres sur le bruit.' },
} as const;
export type UpgradeId = keyof typeof UPGRADES;
