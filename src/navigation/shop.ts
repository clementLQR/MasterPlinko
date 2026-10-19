import type { CameraPose, Vector } from './camera';

export type AzurView = 'entrance' | 'counter' | 'devis' | 'backroom' | 'discovery' | 'workshop' | 'machine' | 'prototypes' | 'duplicator' | 'plans';
export const AZUR = {
  door: { x: 1.55, z: -4.27, width: 1.23, height: 2.47 },
  secret: { x: 1.55, z: -10.2, width: 1.8, depth: 0.52, travel: 2.25, openingZ: -10.7 },
  passage: { left: 0.55, right: 2.55, start: -10.7, end: -13.7 },
  eyeHeight: 1.68,
};
const pose = (x: number, z: number, lx: number, ly: number, lz: number): CameraPose => ({ position: { x, y: AZUR.eyeHeight, z }, lookAt: { x: lx, y: ly, z: lz } });
export const AZUR_POSES: Record<AzurView, CameraPose> = {
  entrance: pose(-0.6, 5.6, -0.3, 1.43, -2.4), counter: pose(-0.4, 2.1, -0.5, 1.35, -1.3),
  devis: pose(-1.1, 1.05, -1.1, 1.3, 0.16),
  backroom: pose(1.55, -6, 1.55, 1.45, -10.2), discovery: pose(1.55, -8.35, 1.55, 1.5, -13.7),
  workshop: pose(0.5, -14.4, 0, 1.45, -19.3), machine: pose(-0.05, -15.65, -0.75, 1.5, -18.85),
  prototypes: pose(2.3, -19, 4.4, 1.5, -20.05), duplicator: pose(-2.3, -17, -3.8, 1.5, -19.3),
  plans: pose(2.35, -17.05, 2.35, 1.04, -17.8),
};
const smooth = (v: number) => { const t = Math.min(1, Math.max(0, v)); return t * t * (3 - 2 * t); };
const mix = (a: Vector, b: Vector, t: number): Vector => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
const distance = (a: Vector, b: Vector) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
// L'allée à gauche du bureau dégage le trajet du poste de prototypes, à l'aller et au retour.
const prototypeAisle: Vector[] = [{ x: 1.1, y: AZUR.eyeHeight, z: -18.75 }];
function orient(a: CameraPose, b: CameraPose, position: Vector, t: number): CameraPose {
  const angles = (p: CameraPose) => ({ yaw: Math.atan2(p.lookAt.x - p.position.x, p.lookAt.z - p.position.z), pitch: Math.atan2(p.lookAt.y - p.position.y, Math.hypot(p.lookAt.x - p.position.x, p.lookAt.z - p.position.z)) });
  const from = angles(a), to = angles(b), yaw = from.yaw + Math.atan2(Math.sin(to.yaw - from.yaw), Math.cos(to.yaw - from.yaw)) * t, pitch = from.pitch + (to.pitch - from.pitch) * t;
  return { position, lookAt: { x: position.x + Math.sin(yaw) * Math.cos(pitch), y: position.y + Math.sin(pitch), z: position.z + Math.cos(yaw) * Math.cos(pitch) } };
}
/** Virages arrondis de 25 cm et table d'arc : aucun raccourci à travers le comptoir. */
function route(points: Vector[]) {
  points = points.filter((point, i) => i === 0 || distance(point, points[i - 1]) > 0.0001);
  if (points.length === 1) return () => ({ ...points[0] });
  const samples = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i - 1], b = points[i], c = points[i + 1], radius = Math.min(0.25, distance(a, b) / 3, distance(b, c) / 3);
    const entry = mix(b, a, radius / distance(a, b)), end = mix(b, c, radius / distance(b, c));
    samples.push(entry);
    for (let step = 1; step <= 12; step++) { const t = step / 12; samples.push(mix(mix(entry, b, t), mix(b, end, t), t)); }
  }
  samples.push(points.at(-1)!);
  const lengths = [0]; for (let i = 1; i < samples.length; i++) lengths.push(lengths[i - 1] + distance(samples[i - 1], samples[i]));
  return (t: number) => {
    const at = Math.max(0, Math.min(1, t)) * lengths.at(-1)!; let i = 1;
    while (i < samples.length - 1 && lengths[i] < at) i++;
    return mix(samples[i - 1], samples[i], (at - lengths[i - 1]) / Math.max(0.00001, lengths[i] - lengths[i - 1]));
  };
}
type Step = { duration: number; from: CameraPose; to: CameraPose; path: ReturnType<typeof route>; door?: number; shelf?: number; latch?: number };

/** Navigation et mécanismes transitoires, sans économie ni nouveau champ de sauvegarde. */
export class AzurNavigation {
  view: AzurView = 'entrance';
  pose = structuredClone(AZUR_POSES.entrance);
  door = 0;
  shelf = 0;
  latch = 0;
  private elapsed = 0;
  private steps: Step[] = [];
  private initialDoor = 0;
  private initialShelf = 0;
  private initialLatch = 0;
  get moving() { return this.steps.length > 0; }
  get secretOpen() { return this.shelf >= 1; }
  get inPublic() { return ['entrance', 'counter', 'devis'].includes(this.view); }
  private add(to: CameraPose, duration: number, via: Vector[] = [], mechanism: { door?: number; shelf?: number; latch?: number } = {}) {
    const from = structuredClone(this.steps.at(-1)?.to ?? this.pose);
    this.steps.push({ from, to: structuredClone(to), duration, path: route([from.position, ...via, to.position]), ...mechanism });
  }
  private enterBackroom() {
    const door = pose(1.55, -3.45, 1.55, 1.5, -6.5);
    this.add(door, 5200, [{ x: 2.15, y: AZUR.eyeHeight, z: 1.05 }, { x: 2.15, y: AZUR.eyeHeight, z: -1.5 }]);
    this.add(door, 600, [], { door: 1 });
    this.add(AZUR_POSES.backroom, 1500);
  }
  private revealPassage() {
    const hold = this.steps.at(-1)?.to ?? this.pose;
    this.add(hold, 350, [], { latch: 1 });
    this.add(hold, 1600, [], { shelf: 1 });
    this.add(AZUR_POSES.discovery, 1800);
  }
  reset() { this.steps = []; this.elapsed = 0; this.view = 'entrance'; this.pose = structuredClone(AZUR_POSES.entrance); this.door = this.shelf = this.latch = 0; }
  go(view: AzurView, authorized = false) {
    if (this.moving || view === this.view) return false;
    if (['entrance', 'counter', 'devis'].includes(view) && this.inPublic) { this.view = view; this.add(AZUR_POSES[view], 500); return true; }
    if (view === 'backroom' && this.inPublic) {
      if (!authorized) return false;
      this.enterBackroom();
    } else if (view === 'entrance' && !this.inPublic) {
      if (this.view !== 'backroom' && this.view !== 'discovery') {
        if (this.view !== 'workshop') this.add(AZUR_POSES.workshop, Math.max(850, distance(this.pose.position, AZUR_POSES.workshop.position) * 600), this.view === 'prototypes' ? prototypeAisle : []);
        this.add(AZUR_POSES.backroom, 5500, [{ x: 1.55, y: AZUR.eyeHeight, z: -13.9 }, { x: 1.55, y: AZUR.eyeHeight, z: -10.9 }]);
      }
      this.add(pose(1.55, -3.45, 1.55, 1.5, 0), 2100);
      this.add(pose(1.55, -3.45, 1.55, 1.5, 0), 600, [], { door: 0 });
      this.add(AZUR_POSES.entrance, 5200, [{ x: 2.15, y: AZUR.eyeHeight, z: -1.5 }, { x: 2.15, y: AZUR.eyeHeight, z: 1.05 }]);
    } else if (view === 'discovery' && this.view === 'backroom') {
      if (!authorized || this.secretOpen) return false;
      this.revealPassage();
    } else if (view === 'workshop' && (this.inPublic || this.view === 'backroom' || this.view === 'discovery')) {
      if (!authorized) return false;
      if (this.inPublic) this.enterBackroom();
      const discovering = !this.secretOpen;
      if (discovering) this.revealPassage();
      this.add(AZUR_POSES.workshop, !discovering && this.view !== 'discovery' ? 5500 : 3500, [{ x: 1.55, y: AZUR.eyeHeight, z: -10.9 }, { x: 1.55, y: AZUR.eyeHeight, z: -13.9 }]);
    } else if (view === 'backroom' && this.view === 'discovery') {
      this.add(AZUR_POSES.backroom, 1800);
    } else if (view === 'backroom' && !this.inPublic) {
      this.add(AZUR_POSES.workshop, Math.max(850, distance(this.pose.position, AZUR_POSES.workshop.position) * 600), this.view === 'prototypes' ? prototypeAisle : []);
      this.add(AZUR_POSES.backroom, 5500, [{ x: 1.55, y: AZUR.eyeHeight, z: -13.9 }, { x: 1.55, y: AZUR.eyeHeight, z: -10.9 }]);
    } else if (['workshop', 'machine', 'prototypes', 'duplicator', 'plans'].includes(view) && ['workshop', 'machine', 'prototypes', 'duplicator', 'plans'].includes(this.view)) {
      if (this.view !== 'workshop') this.add(AZUR_POSES.workshop, Math.max(850, distance(this.pose.position, AZUR_POSES.workshop.position) * 600), this.view === 'prototypes' ? prototypeAisle : []);
      if (view !== 'workshop') this.add(AZUR_POSES[view], Math.max(850, distance(AZUR_POSES.workshop.position, AZUR_POSES[view].position) * 600), view === 'prototypes' ? prototypeAisle : []);
    } else return false;
    this.view = view; this.initialDoor = this.door; this.initialShelf = this.shelf; this.initialLatch = this.latch; return true;
  }
  advance(ms: number, reduced = false) {
    if (!this.moving) return;
    this.elapsed += Math.max(0, ms);
    while (this.steps.length) {
      const step = this.steps[0], t = reduced ? 1 : Math.min(1, this.elapsed / step.duration), eased = smooth(t);
      this.pose = orient(step.from, step.to, step.path(eased), eased);
      if (step.door !== undefined) this.door = this.initialDoor + (step.door - this.initialDoor) * eased;
      if (step.shelf !== undefined) this.shelf = this.initialShelf + (step.shelf - this.initialShelf) * eased;
      if (step.latch !== undefined) this.latch = this.initialLatch + (step.latch - this.initialLatch) * eased;
      if (t < 1) break;
      this.pose = structuredClone(step.to); this.steps.shift(); this.elapsed = reduced ? 0 : this.elapsed - step.duration; this.initialDoor = this.door; this.initialShelf = this.shelf; this.initialLatch = this.latch;
    }
  }
}
