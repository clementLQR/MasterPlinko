import * as THREE from 'three';
import { AZUR } from '../navigation/shop';
import type { AzurView } from '../navigation/shop';
import { finishSurface, wovenRug } from './decor';
import { PlanNotebook } from './notebook';

export interface WorkshopTools {
  root: THREE.Group;
  group(x: number, y: number, z: number, parent?: THREE.Object3D): THREE.Group;
  box(g: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material, radius?: number): THREE.Mesh;
  cylinder(g: THREE.Object3D, r: number, h: number, x: number, y: number, z: number, m: THREE.Material, top?: number): THREE.Mesh;
  ring(g: THREE.Object3D, r: number, tube: number, x: number, y: number, z: number, m: THREE.Material): THREE.Mesh;
  rod(g: THREE.Object3D, from: number[], to: number[], r: number, m: THREE.Material): THREE.Mesh;
  material(color: string, roughness?: number, metalness?: number): THREE.MeshStandardMaterial;
  art(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, draw: (c: CanvasRenderingContext2D) => void, lit?: boolean): THREE.Mesh;
  plaque(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, lines: string[], dark?: boolean): THREE.Mesh;
  device(g: THREE.Object3D, kind: 'radio' | 'clock' | 'tape' | 'tv' | 'fan' | 'lamp', x: number, y: number, z: number, s: number, color: THREE.Material, strange?: boolean): THREE.Group;
  storage(g: THREE.Object3D, x: number, y: number, z: number, s: number, color?: THREE.MeshStandardMaterial): void;
  drawers(g: THREE.Object3D, w: number, h: number, cols: number, rows: number, x: number, y: number, z: number, color?: THREE.MeshStandardMaterial): void;
  tool(g: THREE.Object3D, kind: 'driver' | 'pliers' | 'spanner', x: number, y: number, z: number, s?: number, rotation?: number): void;
  armLamp(g: THREE.Object3D, x: number, y: number, z: number, s: number): void;
  stool(g: THREE.Object3D, x: number, y: number, z: number): void;
  mug(g: THREE.Object3D, x: number, y: number, z: number): void;
  paperwork(g: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, angle: number): void;
  register(object: THREE.Object3D, action: string, label: string, hint: number[], views?: AzurView[]): void;
  batch(root?: THREE.Group): void;
}
const allLab: AzurView[] = ['workshop', 'machine', 'prototypes', 'duplicator', 'plans'];
const random = (n: number) => { const v = Math.sin(n * 127.1 + 31.7) * 43758.5; return v - Math.floor(v); };

/** Trois volumes raccordés ; prototypes décoratifs sans aucun lien avec les achats. */
export class AzurWorkshop {
  readonly backroom: THREE.Group;
  readonly workshop: THREE.Group;
  readonly passage: THREE.Group;
  readonly shelf: THREE.Group;
  readonly switch: THREE.Group;
  notebook!: PlanNotebook;
  private mint: THREE.MeshStandardMaterial;
  private cream: THREE.MeshStandardMaterial;
  private sage: THREE.MeshStandardMaterial;
  private peach: THREE.MeshStandardMaterial;
  private lavender: THREE.MeshStandardMaterial;
  private iron: THREE.MeshStandardMaterial;
  private brass: THREE.MeshStandardMaterial;
  private wood: THREE.MeshStandardMaterial;
  private dark: THREE.MeshStandardMaterial;
  private glass = new THREE.MeshStandardMaterial({ color: '#a1d2c5', transparent: true, opacity: 0.15, roughness: 0.16, depthWrite: false });
  private lights: THREE.Light[] = [];
  private rollers: THREE.Mesh[] = [];
  private latch: THREE.Mesh;
  constructor(private b: WorkshopTools) {
    this.cream = b.material('#c7bfaa'); this.sage = b.material('#74968b'); this.peach = b.material('#c48467'); this.lavender = b.material('#91849d');
    this.iron = b.material('#29383a', 0.6, 0.45); this.brass = b.material('#ac8a55', 0.5, 0.5); this.wood = b.material('#887050'); this.dark = b.material('#253433');
    this.wood.map = this.wood.bumpMap = null; this.wood.bumpScale = 0.012; finishSurface('bois', [this.wood]);
    this.mint = new THREE.MeshStandardMaterial({ color: '#92cdbc', emissive: '#45a98c', emissiveIntensity: 0.55, roughness: 0.5 });
    this.backroom = b.group(0, 0, 0); this.backroom.name = 'azur:backroom';
    this.passage = b.group(0, 0, 0); this.passage.name = 'azur:secret-passage';
    this.workshop = b.group(0, 0, 0); this.workshop.name = 'azur:hidden-workshop';
    this.shell(); this.utilityRoom();
    this.shelf = this.storageWall();
    this.switch = this.discreetSwitch();
    this.latch = b.box(this.backroom, 0.13, 0.07, 0.09, 2.39, 1.3, -10.01, this.brass);
    this.latch.userData.dynamic = true;
    this.brokenMachine(); this.benches(); this.instruments(); this.details();
    this.benchDetails(); this.planningDesk();
    for (const root of [this.backroom, this.passage, this.workshop]) b.batch(root);
  }
  private cable(g: THREE.Object3D, points: number[][], color = this.iron, radius = 0.012) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, radius, 6, false), color); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh;
  }
  private lamp(g: THREE.Object3D, x: number, y: number, z: number, intensity: number, lab = false) {
    const b = this.b;
    b.rod(g, [x, y + 0.06, z], [x, 3.35, z], 0.012, this.iron);
    b.cylinder(g, 0.27, 0.15, x, y, z, this.iron, 0.09);
    b.cylinder(g, 0.235, 0.02, x, y - 0.075, z, new THREE.MeshBasicMaterial({ color: '#ffe1a3' }));
    const light = new THREE.PointLight('#ffd1a0', intensity, 6, 2); light.position.set(x, y - 0.15, z); g.add(light);
    if (lab) this.lights.push(light);
  }
  private shell() {
    const b = this.b, wall = b.material('#65716c'), concrete = b.material('#777568');
    b.box(this.backroom, 7.2, 0.16, 6.2, 1.35, -0.08, -7.55, concrete);
    for (const x of [-2.25, 4.95]) b.box(this.backroom, 0.18, 3.45, 6.25, x, 1.725, -7.57, wall);
    b.box(this.backroom, 7.2, 0.15, 6.3, 1.35, 3.47, -7.57, this.wood);
    // Une baie complète réservée au meuble mobile et au couloir, sans mur caché dans l'ouverture.
    b.box(this.backroom, 3.025, 3.45, 0.18, -0.7375, 1.725, -10.7, wall);
    b.box(this.backroom, 2.625, 3.45, 0.18, 3.6375, 1.725, -10.7, wall);
    b.box(this.backroom, 1.55, 0.8, 0.18, 1.55, 3.05, -10.7, wall);
    for (const x of [0.55, 2.55]) b.box(this.passage, 0.18, 3.05, 3.0, x, 1.525, -12.2, this.iron);
    b.box(this.passage, 2, 0.12, 3.15, 1.55, -0.03, -12.2, concrete);
    b.box(this.passage, 2.1, 0.16, 3.2, 1.55, 3, -12.2, this.iron);
    for (const z of [-10.68, -12.2, -13.68]) {
      for (const x of [0.67, 2.43]) b.box(this.passage, 0.07, 2.7, 0.07, x, 1.35, z, this.sage);
      b.box(this.passage, 1.82, 0.09, 0.09, 1.55, 2.7, z, this.sage);
    }
    for (const x of [0.71, 2.39]) b.box(this.passage, 0.018, 0.045, 2.55, x, 0.28, -12.2, this.mint);
    // Atelier dans le même repère, à trois mètres de l'arrière-boutique.
    b.box(this.workshop, 10.2, 0.17, 10, 0.5, -0.08, -18.6, concrete);
    b.box(this.workshop, 5.05, 3.5, 0.18, -1.975, 1.75, -13.7, wall);
    b.box(this.workshop, 2.95, 3.5, 0.18, 4.025, 1.75, -13.7, wall);
    b.box(this.workshop, 2, 0.65, 0.18, 1.55, 3.175, -13.7, wall);
    b.box(this.workshop, 10.2, 3.5, 0.18, 0.5, 1.75, -23.55, wall);
    for (const x of [-4.55, 5.55]) b.box(this.workshop, 0.18, 3.5, 9.9, x, 1.75, -18.65, wall);
    b.box(this.workshop, 10.2, 0.14, 10, 0.5, 3.55, -18.6, this.wood);
    for (const z of [-14.4, -17.25, -20.1, -23.1]) b.box(this.workshop, 10.2, 0.18, 0.2, 0.5, 3.38, z, this.iron);
    for (const x of [-3, 0.5, 4]) b.box(this.workshop, 0.14, 0.18, 9.85, x, 3.39, -18.6, this.wood);
    // Maçonnerie stylisée en relief, visible entre les étagères et les schémas.
    for (let row = 0; row < 8; row++) for (let col = 0; col < 9; col++) {
      const x = -4.2 + col * 1.13 + (row % 2 ? 0.25 : 0), y = 0.23 + row * 0.42;
      b.box(this.workshop, 1.08, 0.39, 0.07, x, y, -23.405, b.material(['#64706d', '#5c6867', '#6e7770'][(row + col) % 3]), 0.018);
    }
    this.lamp(this.backroom, 1.1, 2.97, -7.1, 17);
    this.lamp(this.backroom, -0.8, 2.92, -8.3, 9);
    this.lamp(this.workshop, -1.3, 2.95, -17.1, 20, true); this.lamp(this.workshop, 1.1, 3.05, -21.3, 17, true);
    for (const x of [-3.8, 4.7]) {
      const light = new THREE.PointLight('#80c5b2', 4.5, 5.5, 2); light.position.set(x, 2.65, -20); this.workshop.add(light); this.lights.push(light);
    }
    const key = new THREE.DirectionalLight('#ffddb0', 0.95); key.position.set(-3.2, 3.25, -15.3); key.target.position.set(-0.75, 1, -18.85);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.camera.left = key.shadow.camera.bottom = -6; key.shadow.camera.right = key.shadow.camera.top = 6; key.shadow.camera.far = 20; key.shadow.normalBias = 0.02;
    this.workshop.add(key, key.target); this.lights.push(key);
  }
  private utilityRoom() {
    const b = this.b, room = this.backroom;
    const left = b.group(-1.65, 0, -8, room); left.rotation.y = Math.PI / 2;
    b.box(left, 2.8, 0.1, 0.9, 0, 0.94, 0, this.wood);
    for (const x of [-1.2, 1.2]) for (const z of [-0.32, 0.32]) b.box(left, 0.09, 0.9, 0.09, x, 0.45, z, this.iron);
    b.device(left, 'tv', -0.75, 1, 0, 1.05, this.cream); b.device(left, 'tape', 0.55, 1, 0, 1.05, this.peach);
    b.tool(left, 'driver', 0.2, 1.03, 0.19, 0.7, -Math.PI / 2); b.paperwork(left, -0.15, 1.02, 0.05, 0.4, 0.3, 0.15);
    b.storage(left, 0.8, 0.02, 0, 0.72, this.sage); b.storage(left, -0.45, 0.02, 0, 0.82, this.wood);
    b.plaque(left, 0.73, 0.21, 0, 1.7, -0.32, ['EN ATTENTE · NE PAS JETER'], false);
    const right = b.group(4.45, 0, -7.35, room); right.rotation.y = -Math.PI / 2;
    for (const y of [0.2, 0.88, 1.56, 2.24, 2.92]) b.box(right, 3.8, 0.065, 0.72, 0, y, 0, this.wood);
    for (const x of [-1.88, 1.88]) b.box(right, 0.07, 3.1, 0.72, x, 1.55, 0, this.iron);
    for (let row = 0; row < 4; row++) for (let i = 0; i < 5; i++) b.storage(right, -1.52 + i * 0.75, 0.24 + row * 0.68, 0, 0.58, (row + i) % 3 ? this.wood : this.sage);
    b.device(room, 'fan', 3.45, 0.03, -9.05, 1.1, this.cream); b.storage(room, 3.5, 0.03, -9.9, 1.0, this.wood);
    for (let i = 0; i < 3; i++) this.cable(right, [[-0.7 + i * 0.48, 2.75, 0.08], [-0.4 + i * 0.48, 2.62, 0.12], [-0.7 + i * 0.48, 2.35, 0.1], [-0.9 + i * 0.48, 2.6, 0.1], [-0.7 + i * 0.48, 2.75, 0.08]], this.iron, 0.016);
    b.plaque(room, 0.68, 0.22, 1.55, 2.85, -4.58, ['BOUTIQUE ↑']);
    const back = b.plaque(room, 0.8, 0.22, -0.35, 2.99, -10.51, ['BOUTIQUE ↶']);
    b.register(back, 'return-shop', 'Retourner dans la boutique', [-0.35, 3.18, -10.1], ['backroom', 'discovery']);
    for (let i = 0; i < 3; i++) this.carton(room, -0.85 + i * 0.75, 0.03, -8.9, 0.58, i === 1);
  }
  private storageWall() {
    const b = this.b, g = b.group(AZUR.secret.x, 0, AZUR.secret.z, this.backroom); g.name = 'azur:sliding-shelf'; g.userData.dynamic = true;
    // Fond opaque : aucune lumière ou machine n'est visible avant l'ouverture.
    b.box(g, 1.8, 2.62, 0.08, 0, 1.37, -0.23, this.wood);
    for (const x of [-0.87, 0.87]) b.box(g, 0.075, 2.65, 0.52, x, 1.38, 0, this.iron);
    for (const y of [0.16, 0.76, 1.36, 1.96, 2.67]) b.box(g, 1.8, 0.07, 0.53, 0, y, 0, this.wood);
    for (let row = 0; row < 4; row++) for (let i = 0; i < 3; i++) b.storage(g, -0.58 + i * 0.59, 0.2 + row * 0.6, 0.02, 0.47, (i + row) % 3 ? this.cream : this.sage);
    for (const x of [-0.7, 0.7]) for (const z of [-0.17, 0.17]) {
      const wheel = b.cylinder(g, 0.055, 0.035, x, 0.065, z, this.iron); wheel.rotation.z = Math.PI / 2; wheel.userData.dynamic = true; this.rollers.push(wheel);
    }
    for (const z of [-10.37, -10.02]) b.box(this.backroom, 4.18, 0.028, 0.045, 0.4, 0.015, z, this.iron);
    b.box(this.backroom, 4.2, 0.1, 0.1, 0.4, 2.83, -10.23, this.iron);
    b.box(this.backroom, 0.08, 0.3, 0.15, -1.62, 2.68, -10.23, this.sage);
    b.plaque(g, 1.2, 0.14, 0, 2.57, 0.28, ['PIÈCES DE RÉCUPÉRATION'], false);
    b.batch(g); return g;
  }
  private discreetSwitch() {
    const b = this.b, radio = b.device(this.backroom, 'radio', 3.57, 1.17, -9.76, 1.1, this.sage, true); radio.rotation.y = -0.35;
    b.box(this.backroom, 1.0, 0.1, 0.6, 3.57, 1.1, -9.76, this.wood);
    for (const x of [3.2, 3.95]) b.box(this.backroom, 0.08, 1.05, 0.08, x, 0.53, -9.8, this.iron);
    radio.name = 'azur:secret-radio';
    b.batch(radio); return radio;
  }
  private brokenMachine() {
    const b = this.b, g = b.group(-0.75, 0, -18.85, this.workshop); g.name = 'azur:broken-masterplinko';
    const board = b.material('#c9bda1'), off = b.material('#253e3a');
    b.box(g, 2.15, 0.16, 0.92, 0, 0.1, 0, this.iron);
    for (const x of [-1, 1]) {
      b.box(g, 0.14, 2.55, 0.72, x, 1.42, -0.08, this.cream, 0.04);
      b.box(g, 0.06, 2.3, 0.08, x * 0.92, 1.4, 0.34, this.peach);
      for (let i = 0; i < 7; i++) b.cylinder(g, 0.025, 0.015, x, 0.3 + i * 0.35, 0.294, this.brass).rotation.x = Math.PI / 2;
      b.rod(g, [x, 0.2, -0.4], [x, 2.6, -0.4], 0.025, this.iron);
    }
    b.box(g, 1.82, 1.7, 0.08, 0, 1.43, 0.18, board);
    b.box(g, 1.8, 0.57, 0.08, 0, 0.37, -0.32, this.dark);
    b.box(g, 1.8, 0.34, 0.06, 0, 2.52, -0.3, this.dark);
    for (let row = 0; row < 14; row++) for (let col = 0; col < 14; col++) {
      if (row === 8 && col === 4 || row === 3 && col === 12) continue;
      const x = -0.78 + col * 0.116 + (row % 2 ? 0.04 : 0);
      const pin = b.cylinder(g, 0.013, 0.075, x, 0.72 + row * 0.11, 0.257, this.brass); pin.rotation.x = Math.PI / 2.5;
    }
    for (let i = 0; i < 15; i++) {
      const x = -0.84 + i * 0.12;
      b.box(g, 0.018, 0.16, 0.23, x, 0.59, 0.27, [this.sage, this.lavender, this.peach][i % 3]);
      b.box(g, 0.11, 0.035, 0.23, x + 0.05, 0.51, 0.27, this.cream);
    }
    const hood = b.group(0, 2.66, -0.22, g); hood.rotation.x = -0.35;
    b.box(hood, 2.12, 0.43, 0.14, 0, 0.22, 0, this.lavender, 0.04);
    b.art(hood, 1.92, 0.31, 0, 0.22, 0.079, c => {
      c.fillStyle = '#454a64'; c.fillRect(0, 0, 1024, 165); c.strokeStyle = '#c78c66'; c.lineWidth = 7; c.strokeRect(7, 7, 1010, 151);
      c.fillStyle = '#e5c49b'; c.textAlign = 'center'; c.font = 'bold 87px Georgia'; c.fillText('MASTER PLINKO', 512, 109, 930);
    });
    for (let i = 0; i < 15; i++) {
      const x = -0.86 + i * 0.12, y = 0.18 + random(i) * 0.32;
      this.cable(g, [[x, 2.6, -0.17], [x + 0.08, 2.42, 0.08], [x - 0.12, 2.35, 0.11]], [this.peach, this.sage, this.iron][i % 3], 0.009);
      this.cable(g, [[x, 0.55, -0.23], [x + 0.13, y, 0.07], [x - 0.06, 0.11, 0.35]], [this.peach, this.sage, this.iron][i % 3], 0.012);
      b.box(g, 0.055, 0.035, 0.09, x - 0.06, 0.11, 0.35, this.cream);
    }
    for (let i = 0; i < 5; i++) {
      this.cable(g, [[1.03, 2.5 - i * 0.18, -0.28], [1.17, 1.8 - i * 0.18, 0.05], [1.12, 0.4, 0.17]], i % 2 ? this.peach : this.iron, 0.015);
    }
    // Trappe latérale ouverte, faisceaux débranchés et composants exposés.
    const hatch = b.group(1.06, 1.2, -0.33, g); hatch.rotation.y = -0.1;
    b.box(hatch, 0.61, 1.63, 0.055, 0.3, 0, 0, this.cream);
    for (let i = 0; i < 8; i++) b.box(hatch, 0.3, 0.025, 0.012, 0.29, -0.5 + i * 0.055, 0.035, this.dark);
    for (let i = 0; i < 4; i++) {
      this.cable(g, [[0.83, 1.0 + i * 0.28, -0.22], [1.07, 0.8 + i * 0.23, 0.15], [0.81, 0.52 + i * 0.18, 0.27]], i % 2 ? this.peach : this.sage, 0.013);
      b.box(g, 0.07, 0.055, 0.07, 0.81, 0.52 + i * 0.18, 0.27, this.cream);
    }
    // Cartes et prises à nu : la panne doit se lire dans les volumes, pas seulement sur l'écran.
    for (let i = 0; i < 3; i++) {
      const circuit = b.group(1.03, 0.76 + i * 0.48, -0.16, g); circuit.rotation.y = -0.55;
      b.box(circuit, 0.25, 0.32, 0.025, 0, 0, 0, this.sage);
      b.box(circuit, 0.1, 0.11, 0.04, 0, 0.025, 0.035, this.iron);
      for (let j = 0; j < 4; j++) b.cylinder(circuit, 0.016, 0.07, -0.08 + j * 0.053, -0.1, 0.045, this.brass).rotation.x = Math.PI / 2;
      this.cable(g, [[1.02, 0.78 + i * 0.48, -0.08], [1.23, 0.55 + i * 0.35, 0.14], [1.32, 0.32 + i * 0.28, 0.3], [1.14, 0.25 + i * 0.28, 0.34]], i % 2 ? this.peach : this.iron, 0.014);
      b.box(g, 0.09, 0.055, 0.055, 1.14, 0.25 + i * 0.28, 0.34, this.cream);
    }
    for (let i = 0; i < 4; i++) {
      const x = -0.65 + i * 0.4;
      this.cable(g, [[x, 0.5, -0.15], [x + 0.1, 0.27, 0.25], [x + 0.24, 0.19, 0.42], [x + 0.17, 0.37, 0.38]], i % 2 ? this.peach : this.iron, 0.016);
    }
    for (const x of [-0.91, 0.91]) {
      b.box(g, 0.24, 0.05, 0.8, x, 0.025, 0.06, this.brass);
      for (const z of [-0.23, 0.32]) b.cylinder(g, 0.034, 0.022, x, 0.061, z, this.iron);
    }
    this.cable(g, [[-0.53, 2.48, 0.19], [-0.9, 2.25, 0.32], [-1.12, 1.86, 0.38], [-0.89, 1.66, 0.41]], this.peach, 0.013);
    b.box(g, 0.085, 0.06, 0.08, -0.89, 1.66, 0.41, this.cream);
    b.cylinder(g, 0.014, 0.075, -1.1, 0.03, 0.63, this.brass).rotation.x = Math.PI / 2;
    const panel = b.group(-0.22, 0.27, 0.88, g); panel.rotation.x = -0.65; panel.rotation.z = -0.06;
    b.box(panel, 1.6, 0.57, 0.08, 0, 0, 0, this.sage);
    b.box(panel, 1.46, 0.45, 0.025, 0, 0, 0.055, b.material('#577d61'));
    // Pistes cuivrées et vis dévissées sur la face intérieure du panneau déposé.
    for (let i = 0; i < 6; i++) {
      b.box(panel, 0.12, 0.006, 0.003, -0.5 + i * 0.17, 0.15, 0.07, this.brass, 0.001);
      b.box(panel, 0.006, 0.1, 0.003, -0.5 + i * 0.17, 0.1, 0.07, this.brass, 0.001);
    }
    for (const x of [-0.71, 0.71]) for (const y of [-0.2, 0.2]) b.cylinder(panel, 0.016, 0.015, x, y, 0.074, this.brass).rotation.x = Math.PI / 2;
    for (let i = 0; i < 7; i++) { b.box(panel, 0.11, 0.07, 0.025, -0.55 + i * 0.17, 0.05, 0.084, this.iron); b.cylinder(panel, 0.02, 0.04, -0.55 + i * 0.17, -0.12, 0.084, this.brass).rotation.x = Math.PI / 2; }
    b.box(g, 0.45, 0.23, 0.03, -0.45, 2.48, 0.1, off);
    b.art(g, 0.41, 0.19, -0.45, 2.48, 0.12, c => { c.fillStyle = '#203630'; c.fillRect(0, 0, 1024, 475); c.fillStyle = '#879a86'; c.font = 'bold 180px monospace'; c.textAlign = 'center'; c.fillText('E-07', 512, 230); c.font = '70px monospace'; c.fillText('HORS SERVICE', 512, 370); });
    const note = b.group(0.73, 0.43, 0.64, g); note.rotation.z = -0.07;
    b.plaque(note, 0.68, 0.55, 0, 0, 0, ['Ne pas réparer.', 'Réparer quand même.', '— Azur'], false);
    b.tool(g, 'driver', -1.1, 0.04, 0.95, 1.2, -Math.PI / 2);
    b.register(g, 'machine', 'Examiner le MasterPlinko hors service', [-0.75, 2.35, -18.2], allLab); b.batch(g);
  }
  private bench(x: number, z: number, angle: number) {
    const b = this.b, g = b.group(x, 0, z, this.workshop); g.rotation.y = angle;
    b.box(g, 6.7, 0.12, 1.04, 0, 1.02, 0, this.cream);
    b.box(g, 6.67, 0.04, 1.02, 0, 1.095, 0, this.wood);
    for (const x of [-3.1, -0.95, 1.1, 3.1]) for (const z of [-0.4, 0.4]) b.box(g, 0.08, 1, 0.08, x, 0.5, z, this.sage);
    b.box(g, 6.65, 0.07, 0.85, 0, 0.22, 0, this.wood);
    for (let i = 0; i < 7; i++) b.storage(g, -2.85 + i * 0.93, 0.26, 0, 0.75, i % 2 ? this.iron : this.wood);
    for (const y of [2.25, 2.97]) {
      b.box(g, 6.7, 0.065, 0.5, 0, y, -0.25, this.wood);
      for (let i = 0; i < 11; i++) {
        const x = -3 + i * 0.6;
        if (i % 5 === 1) {
          const caddy = b.group(x, y + 0.04, -0.25, g);
          b.box(caddy, 0.45, 0.12, 0.33, 0, 0.06, 0, this.iron);
          for (let j = 0; j < 4; j++) {
            const pcb = b.box(caddy, 0.05, 0.18 + j % 2 * 0.05, 0.24, -0.15 + j * 0.1, 0.18, 0, j % 2 ? this.sage : this.lavender);
            pcb.rotation.z = -0.06 + j * 0.04;
          }
        } else if (i % 5 === 3) {
          const unit = b.group(x, y + 0.04, -0.23, g);
          b.box(unit, 0.46, 0.27, 0.33, 0, 0.135, 0, this.cream);
          b.box(unit, 0.18, 0.08, 0.015, -0.09, 0.17, 0.174, this.dark);
          for (let j = 0; j < 4; j++) b.box(unit, 0.04, 0.008, 0.015, 0.13, 0.07 + j * 0.035, 0.174, this.iron);
          b.cylinder(unit, 0.024, 0.025, -0.12, 0.07, 0.18, this.peach).rotation.x = Math.PI / 2;
        } else b.storage(g, x, y + 0.04, -0.25, 0.42 + i % 3 * 0.025, i % 3 ? this.sage : this.cream);
      }
    }
    return g;
  }
  private benches() {
    const b = this.b, left = this.bench(-3.9, -19.35, Math.PI / 2), right = this.bench(4.9, -19.35, -Math.PI / 2);
    b.armLamp(left, -1.8, 1.12, -0.2, 1); b.armLamp(right, -1.1, 1.12, -0.15, 1);
    b.drawers(left, 1.25, 0.7, 4, 4, 1.5, 1.12, -0.16, this.iron);
    b.drawers(right, 0.88, 0.73, 3, 5, 2.7, 1.12, -0.14, this.iron);
    b.stool(this.workshop, -2.75, 0, -20.2); b.stool(this.workshop, 3.9, 0, -21.75);
    b.mug(right, 1.1, 1.12, 0.18); b.paperwork(left, 0.8, 1.12, 0.07, 0.5, 0.4, 0.1);
    this.finger(right); this.tray(right); this.duplicator(left);
    for (let i = 0; i < 8; i++) {
      b.tool(i % 2 ? left : right, ['driver', 'pliers', 'spanner'][i % 3] as 'driver' | 'pliers' | 'spanner', -2.9 + (i % 4) * 0.2, 1.14, 0.15, 0.75, -Math.PI / 2);
    }
    const back = b.group(2.9, 2.3, -18, this.workshop);
    b.plaque(back, 0.74, 0.28, 0, 0, 0, ['BOUTIQUE ↶']);
    b.rod(this.workshop, [2.9, 2.49, -18.03], [2.9, 3.38, -18.03], 0.012, this.iron);
    b.register(back, 'return-shop', 'Retourner dans la boutique — trajet automatique', [2.9, 2.65, -17.8], allLab);
  }
  private finger(parent: THREE.Object3D) {
    const b = this.b, g = b.group(-0.6, 1.12, 0.02, parent); g.name = 'azur:prototype:finger';
    b.box(g, 0.84, 0.12, 0.64, 0, 0.06, 0, this.cream);
    b.cylinder(g, 0.25, 0.1, 0, 0.17, 0, this.sage);
    b.rod(g, [0, 0.2, 0], [0.2, 0.68, -0.08], 0.085, this.sage);
    b.rod(g, [0.2, 0.68, -0.08], [-0.22, 0.94, 0.08], 0.065, this.sage);
    for (const p of [[0, 0.25, 0.06], [0.2, 0.68, -0.01], [-0.22, 0.94, 0.12]]) b.cylinder(g, 0.09, 0.07, ...p as [number, number, number], this.brass).rotation.x = Math.PI / 2;
    b.rod(g, [-0.22, 0.94, 0.08], [-0.4, 0.82, 0.08], 0.035, this.cream);
    for (const z of [0.04, 0.14]) b.rod(g, [-0.4, 0.82, z], [-0.44, 0.72, z], 0.012, this.iron);
    b.cylinder(g, 0.12, 0.68, 0.31, 0.51, -0.14, this.glass); b.cylinder(g, 0.13, 0.04, 0.31, 0.87, -0.14, this.cream);
    b.cylinder(g, 0.13, 0.04, 0.31, 0.18, -0.14, this.cream);
    for (const x of [0.18, 0.44]) b.rod(g, [x, 0.2, -0.14], [x, 0.85, -0.14], 0.009, this.brass);
    for (let i = 0; i < 6; i++) { const ball = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 8), this.brass); ball.position.set(0.31 + (i % 2) * 0.035 - 0.02, 0.23 + i * 0.09, -0.14); g.add(ball); }
    b.box(g, 0.23, 0.12, 0.22, -0.22, 0.16, 0.16, this.lavender); b.cylinder(g, 0.04, 0.025, -0.22, 0.23, 0.16, this.peach);
    b.plaque(parent, 0.74, 0.13, -0.6, 0.98, 0.55, ['DOIGT MÉCANIQUE · ÉTUDE'], false);
    b.register(g, 'prototypes', 'Observer le Doigt mécanique expérimental', [4.25, 2.45, -18.75], allLab); b.batch(g);
  }
  private tray(parent: THREE.Object3D) {
    const b = this.b, g = b.group(-1.55, 1.12, 0, parent); g.name = 'azur:prototype:accounting-tray';
    b.box(g, 0.76, 0.27, 0.53, 0, 0.14, 0, this.lavender, 0.04);
    b.box(g, 0.64, 0.14, 0.04, 0, 0.21, 0.28, this.dark);
    for (let i = 0; i < 5; i++) b.box(g, 0.07, 0.03, 0.06, -0.22 + i * 0.11, 0.16, 0.3, i % 2 ? this.sage : this.brass);
    const lid = b.group(0, 0.28, -0.2, g); lid.rotation.x = -0.95;
    b.box(lid, 0.74, 0.055, 0.49, 0, 0.015, 0.24, this.cream);
    b.cylinder(g, 0.09, 0.47, 0, 0.36, -0.02, this.cream).rotation.z = Math.PI / 2;
    b.box(g, 0.45, 0.018, 0.31, 0, 0.31, 0.23, this.cream);
    const paper = b.group(0, 0.28, 0.4, g); paper.rotation.x = 0.2;
    b.art(paper, 0.45, 0.48, 0, -0.22, 0, c => { c.fillStyle = '#d1c5a9'; c.fillRect(0, 0, 1024, 1100); c.fillStyle = '#454e42'; c.font = 'bold 100px monospace'; c.fillText('ESSAI BAC', 90, 130); c.font = '70px monospace'; ['TOTAL  : ?', 'CONTRÔLE : OK', 'TOTAL  : ??', 'À RECOMPTER.'].forEach((line, i) => c.fillText(line, 70, 350 + i * 170)); });
    b.plaque(parent, 0.7, 0.13, -1.55, 0.98, 0.55, ['BAC COMPTABLE · OUVERT'], false);
    b.register(g, 'prototypes', 'Observer le Bac comptable ouvert', [4.22, 2.15, -20.8], allLab); b.batch(g);
  }
  private duplicator(parent: THREE.Object3D) {
    const b = this.b, g = b.group(-0.2, 1.12, 0, parent); g.name = 'azur:prototype:duplicator';
    b.cylinder(g, 0.42, 0.17, 0, 0.09, 0, this.cream); b.cylinder(g, 0.39, 0.04, 0, 0.19, 0, this.brass);
    b.cylinder(g, 0.37, 0.55, 0, 0.5, 0, this.glass);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.37, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), this.glass); dome.position.y = 0.775; g.add(dome);
    for (const x of [-0.19, 0.19]) {
      b.cylinder(g, 0.07, 0.35, x, 0.39, 0, this.brass);
      for (let i = 0; i < 7; i++) b.ring(g, 0.084, 0.012, x, 0.25 + i * 0.045, 0, this.peach).rotation.x = Math.PI / 2;
      b.cylinder(g, 0.1, 0.08, x, 0.62, 0, this.mint);
    }
    b.rod(g, [-0.25, 0.21, 0.2], [0.22, 0.75, -0.18], 0.012, this.sage);
    b.box(g, 0.4, 0.15, 0.12, 0, 0.15, 0.4, this.sage);
    for (const x of [-0.12, 0, 0.12]) b.cylinder(g, 0.027, 0.025, x, 0.17, 0.47, x ? this.cream : this.peach).rotation.x = Math.PI / 2;
    b.plaque(parent, 0.82, 0.13, -0.2, 0.98, 0.55, ['DUPLICATEUR · EXPÉRIMENTAL'], false);
    b.register(g, 'duplicator', 'Examiner le duplicateur expérimental', [-3.25, 2.45, -19.15], allLab); b.batch(g);
  }
  private scope(g: THREE.Object3D, x: number, y: number, z: number, w = 0.7) {
    const b = this.b;
    b.box(g, w, 0.48, 0.39, x, y + 0.25, z, this.cream, 0.04);
    b.box(g, w * 0.72, 0.32, 0.025, x - w * 0.05, y + 0.28, z + 0.2, this.dark);
    b.art(g, w * 0.65, 0.27, x - w * 0.05, y + 0.28, z + 0.217, c => {
      const h = c.canvas.height; c.fillStyle = '#153b36'; c.fillRect(0, 0, 1024, h); c.strokeStyle = '#466b58'; c.lineWidth = 2;
      for (let i = 0; i < 10; i++) { c.beginPath(); c.moveTo(i * 100, 0); c.lineTo(i * 100, h); c.stroke(); }
      for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(0, i * h / 4); c.lineTo(1024, i * h / 4); c.stroke(); }
      c.strokeStyle = '#8ac9ac'; c.lineWidth = 10; c.beginPath(); for (let i = 0; i <= 100; i++) c.lineTo(i * 10, h / 2 + Math.sin(i * 0.3) * h * 0.25); c.stroke();
    }, true);
    for (const yy of [0.16, 0.33]) b.cylinder(g, 0.025, 0.025, x + w * 0.39, y + yy, z + 0.21, this.peach).rotation.x = Math.PI / 2;
  }
  private instruments() {
    const b = this.b;
    const left = b.group(-3.9, 0, -19.35, this.workshop); left.rotation.y = Math.PI / 2;
    this.scope(left, -2.15, 1.12, 0.03, 0.9); this.scope(left, 2.55, 1.12, 0.03, 0.7);
    const right = b.group(4.9, 0, -19.35, this.workshop); right.rotation.y = -Math.PI / 2;
    this.scope(right, -2.65, 1.12, 0.02); this.scope(right, 1.85, 2.32, -0.2, 1.1);
    for (let i = 0; i < 8; i++) {
      const g = i % 2 ? left : right, x = -0.9 + (i % 4) * 0.62;
      b.box(g, 0.22, 0.03, 0.17, x, 1.15, 0.2, this.sage);
      b.box(g, 0.09, 0.03, 0.07, x, 1.18, 0.2, this.iron);
      for (let j = 0; j < 4; j++) b.cylinder(g, 0.012, 0.045, x - 0.07 + j * 0.045, 1.2, 0.14, this.brass);
    }
    for (const side of [-1, 1]) {
      const g = side === -1 ? left : right;
      b.art(g, 1.15, 0.9, 0.8, 1.78, -0.4, c => {
        c.fillStyle = '#c7bda5'; c.fillRect(0, 0, 1024, 800); c.fillStyle = '#4b5547'; c.font = 'bold 65px monospace'; c.fillText(side < 0 ? 'MASTER PLINKO' : 'ESSAIS / AZUR', 55, 90);
        c.strokeStyle = '#586254'; c.lineWidth = 4; c.strokeRect(300, 160, 330, 530); c.strokeRect(335, 205, 260, 320);
        for (let row = 0; row < 8; row++) for (let col = 0; col < 7; col++) c.fillRect(354 + col * 34 + row % 2 * 7, 230 + row * 36, 5, 5);
        c.beginPath(); c.moveTo(55, 260); c.lineTo(280, 330); c.moveTo(650, 350); c.lineTo(910, 270); c.stroke();
        c.font = '35px monospace'; c.fillText('PRÉCISION : OUI', 50, 740); c.fillText('FIABILITÉ : BIENTÔT', 650, 600, 350);
      });
      const note = b.group(-2.85, 1.91, -0.4, g); note.rotation.z = side * 0.035;
      b.plaque(note, 0.64, 0.67, 0, 0, 0, ['IDÉES', 'Plus de précision', 'Moins de bugs', '(peut-être)'], false);
    }
  }
  private details() {
    const b = this.b;
    const door = b.group(2.9, 0, -23.28, this.workshop); door.name = 'azur:utility-door';
    b.box(door, 1.38, 2.63, 0.1, 0, 1.32, 0, this.iron);
    b.box(door, 1.17, 2.43, 0.06, 0, 1.24, 0.075, b.material('#465653'));
    b.ring(door, 0.25, 0.045, 0, 1.68, 0.13, this.brass);
    b.cylinder(door, 0.21, 0.025, 0, 1.68, 0.12, new THREE.MeshBasicMaterial({ color: '#54767c' })).rotation.x = Math.PI / 2;
    b.box(door, 0.39, 0.016, 0.015, 0, 1.68, 0.14, this.iron);
    b.box(door, 0.016, 0.39, 0.015, 0, 1.68, 0.14, this.iron);
    b.box(door, 0.17, 0.045, 0.08, -0.4, 0.92, 0.16, this.brass);
    b.plaque(door, 0.72, 0.15, 0, 2.2, 0.13, ['LOCAL TECHNIQUE'], false);
    b.drawers(this.workshop, 1.5, 2.4, 4, 9, 0.75, 0.1, -23.25, this.iron);
    for (let i = 0; i < 4; i++) b.storage(this.workshop, -3.65 + i * 1.0, 2.65, -23.25, 0.86, this.wood);
    // Chariot à billes et pièces déposées, décalé de l'allée d'arrivée.
    const cart = b.group(1.65, 0, -19.7, this.workshop);
    for (const y of [0.2, 0.86]) b.box(cart, 0.8, 0.05, 0.64, 0, y, 0, this.iron);
    for (const x of [-0.36, 0.36]) for (const z of [-0.27, 0.27]) { b.box(cart, 0.035, 0.93, 0.035, x, 0.5, z, this.brass); b.cylinder(cart, 0.065, 0.04, x, 0.08, z, this.iron).rotation.z = Math.PI / 2; }
    b.storage(cart, 0, 0.23, 0, 0.63, this.wood); b.plaque(cart, 0.45, 0.2, 0, 0.52, 0.26, ['BILLES →'], false);
    for (let i = 0; i < 12; i++) { const ball = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), [this.sage, this.peach, this.brass][i % 3]); ball.position.set(-0.27 + (i % 4) * 0.17, 0.92, -0.2 + Math.floor(i / 4) * 0.18); cart.add(ball); }
    b.tool(cart, 'pliers', 0.1, 0.95, 0.1, 0.9, -Math.PI / 2);
    const supplies = b.group(3.7, 0, -18.4, this.workshop);
    for (const y of [0.16, 0.55, 0.94]) {
      b.box(supplies, 0.92, 0.055, 0.7, 0, y, 0, this.iron);
      this.carton(supplies, 0, y + 0.03, 0, 0.65, y === 0.55);
    }
    for (const x of [-0.43, 0.43]) for (const z of [-0.31, 0.31]) {
      b.box(supplies, 0.035, 1.05, 0.035, x, 0.56, z, this.brass);
      b.cylinder(supplies, 0.065, 0.04, x, 0.08, z, this.iron).rotation.z = Math.PI / 2;
    }
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.7, 2.0), wovenRug()); rug.position.set(-1.3, 0.018, -16.4); rug.rotation.x = -Math.PI / 2; this.workshop.add(rug);
    for (let i = 0; i < 6; i++) {
      const z = -15.7 - i * 1.1;
      this.cable(this.workshop, [[-4.45, 3.15, z], [-2.2, 3.0 - random(i) * 0.25, z + 0.13], [1.0, 2.94 - random(i + 9) * 0.24, z + 0.32], [5.4, 3.13, z - 0.12]], i % 2 ? this.sage : this.iron, 0.015);
    }
    this.cable(this.workshop, [[-3.4, 0.04, -20], [-2.2, 0.035, -19.1], [-1.6, 0.04, -17.9], [-0.3, 0.04, -17.8]], this.iron, 0.018);
    this.cable(this.workshop, [[0.4, 0.03, -19], [1.3, 0.04, -20.5], [3.9, 0.04, -20.2], [4.8, 0.7, -20.2]], this.peach, 0.014);
  }
  private carton(parent: THREE.Object3D, x: number, y: number, z: number, size: number, open = false) {
    const b = this.b, g = b.group(x, y, z, parent), cardboard = b.material('#a08963');
    b.box(g, size, size * 0.5, size * 0.8, 0, size * 0.25, 0, cardboard, 0.004);
    b.box(g, size * 0.2, size * 0.5, 0.006, 0, size * 0.25, size * 0.405, this.cream, 0.002);
    b.box(g, size * 0.4, size * 0.2, 0.008, -size * 0.24, size * 0.28, size * 0.41, this.cream, 0.002);
    if (open) {
      b.box(g, size * 0.88, 0.012, size * 0.69, 0, size * 0.506, 0, this.dark);
      for (const side of [-1, 1]) { const flap = b.box(g, size * 0.48, 0.018, size * 0.8, side * size * 0.64, size * 0.52, 0, cardboard, 0.002); flap.rotation.z = side * 0.25; }
      b.box(g, size * 0.38, size * 0.17, size * 0.3, 0, size * 0.58, 0, this.sage);
    } else b.box(g, size * 0.2, 0.006, size * 0.8, 0, size * 0.505, 0, this.cream, 0.002);
  }
  private benchDetails() {
    const b = this.b;
    for (const [side, angle] of [[-3.9, Math.PI / 2], [4.9, -Math.PI / 2]]) {
      const g = b.group(side, 0, -19.35, this.workshop); g.rotation.y = angle;
      // Cartouches sur un bus d'essai ouvert, faisceaux et fiches de contrôle.
      const rack = b.group(0.85, 1.12, 0.05, g);
      b.box(rack, 0.8, 0.065, 0.46, 0, 0.04, 0, this.lavender);
      for (const x of [-0.37, 0.37]) b.box(rack, 0.045, 0.29, 0.46, x, 0.18, 0, this.cream);
      for (let i = 0; i < 3; i++) {
        const cartridge = b.group(-0.23 + i * 0.23, 0.08, 0, rack); cartridge.rotation.z = i === 2 ? -0.15 : 0;
        b.box(cartridge, 0.04, 0.28, 0.33, 0, 0.14, 0, this.sage);
        for (let j = 0; j < 3; j++) b.box(cartridge, 0.025, 0.045, 0.06, 0.03, 0.07 + j * 0.075, 0.04, this.iron);
        b.box(cartridge, 0.045, 0.06, 0.035, 0, 0.14, 0.18, this.peach);
      }
      b.plaque(g, 0.72, 0.11, 0.85, 0.99, 0.55, ['CARTOUCHES · INCOMPLET'], false);
      for (let i = 0; i < 4; i++) {
        const spool = b.cylinder(g, 0.07, 0.17, 1.7 + i * 0.17, 1.22, -0.05, i % 2 ? this.peach : this.sage);
        spool.rotation.z = Math.PI / 2;
        b.cylinder(g, 0.085, 0.025, 1.62 + i * 0.17, 1.22, -0.05, this.brass).rotation.z = Math.PI / 2;
      }
      this.cable(g, [[-1.6, 1.13, 0.32], [-1.1, 1.14, 0.23], [-0.9, 1.14, 0.41], [-1.1, 1.14, 0.46]], this.peach);
      for (let i = 0; i < 4; i++) b.ring(g, 0.025, 0.006, -1.1 + i * 0.08, 1.14, 0.15, this.brass).rotation.x = Math.PI / 2;
      b.art(g, 0.55, 0.67, -1.35, 1.78, -0.4, c => {
        c.fillStyle = '#c8bda3'; c.fillRect(0, 0, 1024, 1247); c.fillStyle = '#465650'; c.font = 'bold 100px monospace'; c.fillText('CONTRÔLE', 90, 140);
        c.strokeStyle = '#536154'; c.lineWidth = 7;
        c.strokeRect(150, 330, 720, 480); c.beginPath(); c.moveTo(150, 550); c.lineTo(330, 550); c.lineTo(365, 490); c.lineTo(400, 610); c.lineTo(435, 490); c.lineTo(470, 610); c.lineTo(505, 550); c.lineTo(870, 550); c.stroke();
        c.font = '65px monospace'; c.fillText('OK  : à revérifier', 65, 990); c.fillText('KO  : normal, oui.', 65, 1110);
      });
    }
    // Étagères du fond et ancien moniteur, comme dans la référence, sans nouvel appareil fonctionnel.
    for (const y of [0.7, 1.45, 2.2]) {
      b.box(this.workshop, 4.1, 0.065, 0.6, -2.25, y, -23.15, this.wood);
      for (let i = 0; i < 5; i++) b.storage(this.workshop, -3.8 + i * 0.77, y + 0.04, -23.15, 0.58 + i % 2 * 0.1, i % 3 ? this.wood : this.sage);
    }
    this.scope(this.workshop, -3.1, 1.5, -23.08, 0.65);
    const tray = b.group(-1.5, 0.02, -17.75, this.workshop);
    b.box(tray, 0.48, 0.04, 0.33, 0, 0.02, 0, this.iron);
    for (let i = 0; i < 8; i++) b.cylinder(tray, 0.012, 0.05, -0.17 + i % 4 * 0.11, 0.055, -0.08 + Math.floor(i / 4) * 0.16, this.brass).rotation.z = 1.1;
  }
  private planningDesk() {
    const b = this.b, desk = b.group(2.35, 0, -17.8, this.workshop); desk.name = 'azur:planning-desk';
    b.box(desk, 1.6, 0.09, 1.08, 0, 0.94, 0, this.wood);
    b.box(desk, 1.5, 0.15, 0.94, 0, 0.81, 0, this.cream);
    for (const x of [-0.7, 0.7]) for (const z of [-0.43, 0.43]) b.box(desk, 0.075, 0.77, 0.075, x, 0.385, z, this.wood);
    for (const x of [-0.39, 0.39]) {
      b.box(desk, 0.7, 0.13, 0.04, x, 0.81, 0.49, this.sage);
      b.box(desk, 0.13, 0.025, 0.045, x, 0.81, 0.525, this.brass);
    }
    b.box(desk, 1.45, 0.055, 0.055, 0, 0.23, -0.42, this.wood);
    b.stool(this.workshop, 3.1, 0, -16.95);
    this.notebook = new PlanNotebook(b, desk);
    // Lampe articulée sur le bord gauche, sans masquer les dessins.
    b.cylinder(desk, 0.09, 0.035, -0.69, 1.0, -0.35, this.sage);
    b.rod(desk, [-0.69, 1.02, -0.35], [-0.84, 1.64, -0.4], 0.015, this.sage);
    b.rod(desk, [-0.84, 1.64, -0.4], [-0.61, 1.88, -0.32], 0.018, this.sage);
    for (const p of [[-0.69, 1.02, -0.35], [-0.84, 1.64, -0.4]]) b.cylinder(desk, 0.028, 0.035, ...p as [number, number, number], this.brass).rotation.x = Math.PI / 2;
    b.cylinder(desk, 0.12, 0.1, -0.61, 1.86, -0.32, this.sage, 0.045);
    b.cylinder(desk, 0.105, 0.008, -0.61, 1.805, -0.32, new THREE.MeshBasicMaterial({ color: '#ffe3a6' }));
    const light = new THREE.PointLight('#ffdfac', 1.5, 2.4, 2); light.position.set(-0.5, 1.75, 0.05); desk.add(light); this.lights.push(light);
    b.paperwork(desk, 0.05, 0.993, -0.1, 0.32, 0.14, -0.08);
    b.rod(desk, [-0.56, 1.005, 0.5], [-0.2, 1.005, 0.5], 0.008, this.peach);
    b.box(desk, 0.37, 0.012, 0.035, 0.38, 1.0, 0.51, this.cream);
    b.box(desk, 1.45, 0.055, 0.055, 0, 0.61, 0.47, this.wood);
    b.plaque(desk, 0.75, 0.1, 0, 0.61, 0.5, ['BUREAU DES PLANS · AZUR'], false);
    b.register(desk, 'plans', 'Consulter le carnet des plans', [2.35, 1.3, -17.4], allLab);
    b.batch(desk);
  }
  update(shelf: number, latch: number, inside: boolean) {
    this.backroom.visible = inside;
    this.passage.visible = this.workshop.visible = inside && shelf > 0;
    this.shelf.position.x = AZUR.secret.x - AZUR.secret.travel * shelf;
    this.latch.position.x = 2.39 + latch * 0.12;
    this.rollers.forEach(wheel => { wheel.rotation.x = shelf * AZUR.secret.travel / 0.055; });
    this.lights.forEach(light => { light.visible = inside && shelf > 0.02; });
  }
}
