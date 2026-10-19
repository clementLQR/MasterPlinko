import { CAVE, CONFIG, STAIR_LANDING, STAIRS, VIEWS } from '../config';
export type View = keyof typeof VIEWS;
export type Vector = { x: number; y: number; z: number };
export type CameraPose = { position: Vector; lookAt: Vector };
type Pose = { -readonly [K in keyof typeof VIEWS.plinko]: number };
/** Les cadrages sont visuels : ils ne modifient ni les billes ni leurs résultats. */
export class Navigation {
  target: View = 'plinko';
  value = 0;
  pose: Pose = { ...VIEWS.plinko };
  private from: Pose = { ...this.pose };
  private fromValue = 0;
  private elapsed = CONFIG.cameraTransition as number;
  get moving() { return this.elapsed < CONFIG.cameraTransition; }
  get atMachine() { return (this.target === 'plinko' || this.target === 'commandes') && !this.moving; }
  go(view: View, reduced = false) {
    this.from = { ...this.pose }; this.fromValue = this.value;
    this.elapsed = reduced || (view === this.target && !this.moving) ? CONFIG.cameraTransition : 0;
    this.target = view; this.advance(0, reduced);
  }
  advance(ms: number, reduced = false) {
    this.elapsed = reduced ? CONFIG.cameraTransition : Math.min(CONFIG.cameraTransition, this.elapsed + ms);
    const t = this.elapsed / CONFIG.cameraTransition, smooth = t * t * (3 - 2 * t);
    const destination = VIEWS[this.target];
    for (const key of Object.keys(destination) as (keyof Pose)[]) this.pose[key] = this.from[key] + (destination[key] - this.from[key]) * smooth;
    this.value = this.fromValue + ((this.target === 'plinko' ? 0 : 1) - this.fromValue) * smooth;
  }
}

export type DeparturePhase = 'cave' | 'ascending' | 'destinations' | 'working' | 'shop' | 'descending';
const smooth = (t: number) => t * t * (3 - 2 * t);
// Accélération et freinage progressifs, avec un palier de vitesse pour les approches longues.
const walkingEase = (t: number): number => {
  if (t > 0.8) return 1 - walkingEase(1 - t);
  if (t >= 0.2) return 1.25 * t - 0.125;
  const u = t / 0.2; return 0.25 * (u * u * u - u * u * u * u / 2);
};
const mix = (a: Vector, b: Vector, t: number): Vector => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
const clamp = (t: number) => Math.max(0, Math.min(1, t));
const turn = (a: number, b: number, t: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
function facing(pose: CameraPose) {
  const dx = pose.lookAt.x - pose.position.x, dy = pose.lookAt.y - pose.position.y, dz = pose.lookAt.z - pose.position.z;
  return { yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}
function looking(position: Vector, yaw: number, pitch: number): CameraPose {
  return { position, lookAt: { x: position.x + Math.sin(yaw) * Math.cos(pitch), y: position.y + Math.sin(pitch), z: position.z + Math.cos(yaw) * Math.cos(pitch) } };
}

/** Ligne de marche au sol, du pied des marches vers Plinko, avec un virage arrondi. */
function approachPath(origin: Vector) {
  const foot = { x: STAIRS.x, y: origin.y, z: STAIRS.footZ };
  const corner = { x: STAIRS.x, y: origin.y, z: 12 };
  const distance = Math.hypot(origin.x - corner.x, origin.z - corner.z);
  const direction = { x: (origin.x - corner.x) / distance, y: 0, z: (origin.z - corner.z) / distance };
  const radius = Math.min(2, distance / 3);
  const entry = { ...corner, z: corner.z - radius }, end = mix(corner, origin, radius / distance);
  const curve = (t: number) => mix(mix(entry, corner, t), mix(corner, end, t), t);
  // Table d'arc : la courbure ne crée ni arrêt ni accélération au raccord des segments.
  const lengths = [0]; let previous: Vector = entry;
  for (let i = 1; i <= 64; i++) {
    const point = curve(i / 64);
    lengths.push(lengths[i - 1] + Math.hypot(point.x - previous.x, point.z - previous.z)); previous = point;
  }
  const first = entry.z - foot.z, rounded = lengths[64], last = distance - radius;
  return (progress: number) => {
    if (progress >= 1) return { position: { ...origin }, yaw: Math.atan2(direction.x, direction.z) };
    const along = clamp(progress) * (first + rounded + last);
    if (along <= first) return { position: mix(foot, entry, along / first), yaw: 0 };
    if (along >= first + rounded) return { position: mix(end, origin, (along - first - rounded) / last), yaw: Math.atan2(direction.x, direction.z) };
    const arc = along - first; let i = 1;
    while (lengths[i] < arc) i++;
    const t = (i - 1 + (arc - lengths[i - 1]) / (lengths[i] - lengths[i - 1])) / 64;
    const tangent = mix({ x: corner.x - entry.x, y: 0, z: corner.z - entry.z }, { x: end.x - corner.x, y: 0, z: end.z - corner.z }, t);
    return { position: curve(t), yaw: Math.atan2(tangent.x, tangent.z) };
  };
}
function walkingY(z: number) {
  const nose = STAIRS.firstZ + STAIRS.depth / 2;
  const firstTop = STAIRS.firstY + STAIRS.thickness / 2;
  const slope = STAIRS.rise / STAIRS.run;
  if (z > nose) {
    const distance = STAIRS.footZ - nose, t = Math.max(0, (STAIRS.footZ - z) / distance);
    // Raccord tangent au sol et à la pente, sans marche verticale au premier nez.
    const rise = firstTop - CAVE.floorY;
    return CAVE.floorY + rise * smooth(t) + distance * slope * (t * t * t - t * t);
  }
  const ramp = firstTop + (nose - z) * slope;
  // Arrondir la jonction avec le palier sur une petite distance, sans secousse.
  const shoulder = 0.2, lift = ramp - (STAIR_LANDING.y - shoulder);
  if (lift <= 0) return ramp;
  if (lift >= 2 * shoulder) return STAIR_LANDING.y;
  return STAIR_LANDING.y - shoulder + lift - lift * lift / (4 * shoulder);
}

/** Trajet unique, réversible et transitoire : aucun état économique ni déplacement libre. */
export class Departure {
  phase: DeparturePhase = 'cave';
  private elapsed = 0;
  private reduced = false;
  private origin?: CameraPose;
  private approach?: ReturnType<typeof approachPath>;
  get inCave() { return this.phase === 'cave'; }
  get travelling() { return this.phase === 'ascending' || this.phase === 'descending'; }
  get opaque() { return this.phase === 'destinations' || this.phase === 'working' || this.phase === 'shop'; }
  get opacity() {
    if (this.inCave) return 0;
    if (this.opaque) return 1;
    const duration = this.reduced ? CONFIG.reducedExitFade : CONFIG.exitFade;
    const fade = this.phase === 'descending' ? 1 - this.elapsed / duration : this.reduced ? this.elapsed / duration : (this.elapsed - CONFIG.stairApproach - CONFIG.stairClimb) / duration;
    return smooth(Math.max(0, Math.min(1, fade)));
  }
  begin(origin: CameraPose, reduced: boolean) {
    if (!this.inCave) return false;
    this.origin = structuredClone(origin); this.approach = approachPath(origin.position);
    this.reduced = reduced; this.elapsed = 0; this.phase = 'ascending'; return true;
  }
  resumeService() { this.phase = 'working'; this.elapsed = 0; this.origin = undefined; this.approach = undefined; }
  work() { if (this.phase === 'destinations') this.phase = 'working'; }
  finishWork() { if (this.phase === 'working') this.phase = 'destinations'; }
  visitAzur(metAzur: boolean) {
    if (this.phase !== 'destinations' || !metAzur) return false;
    this.phase = 'shop'; return true;
  }
  finishVisit() { if (this.phase === 'shop') this.phase = 'destinations'; }
  returnToCave(origin: CameraPose, reduced: boolean) {
    if (this.phase !== 'destinations') return false;
    this.origin = structuredClone(origin); this.approach = approachPath(origin.position);
    this.reduced = reduced; this.elapsed = 0; this.phase = 'descending'; return true;
  }
  reset() { this.phase = 'cave'; this.elapsed = 0; this.origin = undefined; this.approach = undefined; }
  advance(ms: number, visible = true) {
    if (!visible || !this.travelling) return;
    this.elapsed += Math.max(0, ms);
    const duration = this.reduced ? CONFIG.reducedExitFade : CONFIG.exitFade + CONFIG.stairClimb +
      (this.phase === 'descending' ? CONFIG.stairReturnApproach : CONFIG.stairApproach);
    if (this.elapsed >= duration) { this.phase = this.phase === 'ascending' ? 'destinations' : 'cave'; this.elapsed = 0; }
  }
  get camera(): CameraPose | undefined {
    if (this.inCave || this.reduced || !this.origin || !this.approach) return undefined;
    const descending = this.phase === 'descending';
    const total = CONFIG.stairApproach + CONFIG.stairClimb;
    const returning = Math.max(0, this.elapsed - CONFIG.exitFade);
    const time = this.opaque ? total : descending ? total - Math.min(CONFIG.stairClimb, returning) : Math.min(total, this.elapsed);
    const eyeHeight = this.origin.position.y - CAVE.floorY;
    const foot = { x: STAIRS.x, y: this.origin.position.y, z: STAIRS.footZ };
    const top = { x: STAIRS.x, y: STAIR_LANDING.y + eyeHeight, z: STAIR_LANDING.z };
    const initial = facing(this.origin), stairPitch = -Math.atan2(2.3, 5);
    if (descending && returning >= CONFIG.stairClimb) {
      const elapsed = returning - CONFIG.stairClimb;
      const path = this.approach(walkingEase(clamp(elapsed / CONFIG.stairReturnApproach)));
      const rear = facing({ position: path.position, lookAt: { x: -3, y: 0.5, z: CAVE.rearZ - 2 } });
      const machine = facing({ position: path.position, lookAt: this.origin.lookAt });
      const reveal = smooth(clamp((elapsed - CONFIG.stairReturnRevealDelay) / CONFIG.stairReturnReveal));
      return looking(path.position, turn(rear.yaw, machine.yaw, reveal), rear.pitch + (machine.pitch - rear.pitch) * reveal);
    }
    if (time < CONFIG.stairApproach) {
      const t = time / CONFIG.stairApproach, path = this.approach(1 - walkingEase(t));
      return looking(path.position, turn(initial.yaw, path.yaw + Math.PI, smooth(clamp(t / 0.3))), initial.pitch + (stairPitch - initial.pitch) * smooth(t));
    }
    const progress = smooth((time - CONFIG.stairApproach) / CONFIG.stairClimb);
    // Rampe de marche lissée : même hauteur des yeux, sans oscillation à chaque contremarche.
    const position = mix(foot, top, progress);
    position.y = walkingY(position.z) + eyeHeight;
    if (descending) {
      const destination = facing({ position, lookAt: { x: -3, y: 0.5, z: CAVE.rearZ - 2 } });
      const reveal = smooth(clamp((0.65 - progress) / 0.4));
      return looking(position, turn(0, destination.yaw, reveal), -0.96 + (destination.pitch + 0.96) * reveal);
    }
    return looking(position, Math.PI, stairPitch * (1 - smooth(clamp((progress - 0.65) / 0.35))));
  }
}
