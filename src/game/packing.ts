import { CONFIG, FACTORY_EVENTS } from '../config';
import type { Random } from './outcomes';

export type FactoryEventKind = keyof typeof FACTORY_EVENTS;
export interface FactoryEvent { kind: FactoryEventKind; startsAtMs: number }
export interface FactoryBall { id: number; kind: 'grey' | 'red'; lane: number; ageMs: number }
export interface FactoryState {
  status: 'idle' | 'active' | 'success' | 'exploded';
  /** Un ancien service déjà commencé conserve exceptionnellement son contrat. */
  legacy: boolean;
  greyHits: number;
  nextId: number;
  spawnInMs: number;
  balls: FactoryBall[];
  events: FactoryEvent[];
}
export function newFactory(): FactoryState {
  return { status: 'idle', legacy: false, greyHits: 0, nextId: 1, spawnInMs: 0, balls: [], events: [] };
}
export function factoryReward(factory: FactoryState): number {
  return factory.status === 'exploded' || factory.status === 'idle' ? 0 : factory.legacy ? 1500 : factory.greyHits * CONFIG.factoryGreyReward;
}

/** Un exemplaire de chaque événement, ordre et horaires tirés une seule fois au départ. */
export function planFactoryEvents(random: Random): FactoryEvent[] {
  const kinds: FactoryEventKind[] = ['overdrive', 'delivery', 'slowdown'];
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]];
  }
  return kinds.map((kind, index) => ({ kind, startsAtMs: 12000 + index * 16000 + Math.floor(random() * 4001) - 2000 }));
}

export function factoryEventAt(factory: FactoryState, elapsed: number) {
  if (factory.status !== 'active' || factory.legacy) return;
  const event = factory.events.find(event => elapsed >= event.startsAtMs - CONFIG.factoryEventWarning && elapsed < event.startsAtMs + CONFIG.factoryEventDuration);
  if (!event) return;
  const warning = elapsed < event.startsAtMs;
  return { ...event, warning, remainingMs: (warning ? event.startsAtMs : event.startsAtMs + CONFIG.factoryEventDuration) - elapsed };
}

/** Intégrales des deux horloges : les changements de vitesse ne déplacent jamais une bille d’un coup. */
export function factoryClock(events: FactoryEvent[], elapsed: number, clock: 'belt' | 'supply'): number {
  let result = elapsed;
  for (const event of events) {
    const overlap = Math.max(0, Math.min(CONFIG.factoryEventDuration, elapsed - event.startsAtMs));
    result += overlap * (FACTORY_EVENTS[event.kind][clock] - 1);
  }
  return result;
}

/** Retrouver l’instant d’apparition depuis le numéro de bille et l’horloge de production. */
export function factorySpawnTime(events: FactoryEvent[], id: number): number {
  const target = (id - 1) * CONFIG.factorySpawnInterval;
  let elapsed = 0, produced = 0;
  for (const event of events) {
    const normal = event.startsAtMs - elapsed;
    if (target <= produced + normal) return elapsed + target - produced;
    produced += normal; elapsed = event.startsAtMs;
    const speed = FACTORY_EVENTS[event.kind].supply, during = CONFIG.factoryEventDuration * speed;
    if (target <= produced + during) return elapsed + (target - produced) / speed;
    produced += during; elapsed += CONFIG.factoryEventDuration;
  }
  return elapsed + target - produced;
}

/** Horloges et arrivées indépendantes de la fréquence d’image ; hasard injectable. */
export function advanceFactory(factory: FactoryState, ms: number, elapsed: number, random: Random) {
  if (ms <= 0 || factory.legacy || factory.status !== 'active') return;
  const end = elapsed + ms, belt = factoryClock(factory.events, end, 'belt');
  const movement = belt - factoryClock(factory.events, elapsed, 'belt');
  for (const ball of factory.balls) ball.ageMs += movement;
  const produced = factoryClock(factory.events, end, 'supply');
  while ((factory.nextId - 1) * CONFIG.factorySpawnInterval <= produced) {
    const id = factory.nextId++, born = factorySpawnTime(factory.events, id);
    const kind = random() < CONFIG.factoryRedChance ? 'red' : 'grey';
    const preferredLane = Math.min(3, Math.floor(random() * 4));
    const ageMs = belt - factoryClock(factory.events, born, 'belt');
    // En arrivage massif, répartir les nouvelles billes pour qu’elles ne se traversent pas.
    const lane = [0, 1, 2, 3].map(offset => (preferredLane + offset) % 4).find(lane =>
      !factory.balls.some(ball => ball.lane === lane && Math.abs(ball.ageMs - ageMs) < CONFIG.factoryLaneGapMs)) ?? preferredLane;
    factory.balls.push({ id, kind, lane, ageMs });
  }
  factory.spawnInMs = (factory.nextId - 1) * CONFIG.factorySpawnInterval - produced;
  factory.balls = factory.balls.filter(ball => ball.ageMs < CONFIG.factoryTravelDuration);
}
