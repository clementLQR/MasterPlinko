import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { finishSurface, wovenRug } from './decor';
import type { Preferences } from '../game/state';
import { AZUR_POSES, AzurNavigation } from '../navigation/shop';
import type { AzurView } from '../navigation/shop';
import { AzurWorkshop } from './shopWorkshop';

const noise = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
function map(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8; return texture;
}

/** Bâtiment d'Azur ; tous les achats et états économiques restent dans le moteur. */
export class AzurShop {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(58, 1, 0.05, 80);
  private renderer: THREE.WebGLRenderer;
  private composer?: EffectComposer;
  private publicKey?: THREE.DirectionalLight;
  private root = new THREE.Group();
  private geometry = new Map<string, THREE.BufferGeometry>();
  private materials = new Map<string, THREE.MeshStandardMaterial>();
  private patina = map(256, 256, c => {
    c.fillStyle = '#d8d2c5'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 12000; i++) { c.fillStyle = i % 2 ? '#292c2514' : '#ffffff18'; c.fillRect(noise(i) * 256, noise(i + 5) * 256, 1 + noise(i + 7) * 2, 1); }
    c.strokeStyle = '#65614f30';
    for (let i = 0; i < 38; i++) { const x = noise(i + 8) * 256, y = noise(i + 9) * 256; c.beginPath(); c.moveTo(x, y); c.lineTo(x + noise(i) * 12, y + noise(i + 1) * 3); c.stroke(); }
  });
  private targets: THREE.Object3D[] = [];
  private ray = new THREE.Raycaster();
  private focused?: THREE.Object3D;
  private pointer?: { x: number; y: number };
  private refreshPointer = false;
  private hint = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: true }));
  private highlight = new THREE.Box3Helper(new THREE.Box3(), '#e6bf7b');
  private active = false;
  private reduced = false;
  private quality = '';
  private journey = new AzurNavigation();
  private privateAccess = false;
  private doorLeaf!: THREE.Group;
  private workshop: AzurWorkshop;
  private get view() { return this.journey.view; }
  private get progress() { return this.journey.moving ? 0 : 1; }
  private rain: THREE.LineSegments;
  private rainTime = 0;
  private observer: ResizeObserver;
  private wood = this.material('#b4a68e');
  private darkWood = this.material('#736656');
  private cream = this.material('#dac9a8');
  private sage = this.material('#91a38c');
  private lavender = this.material('#a89db0');
  private peach = this.material('#c88b69');
  private iron = this.material('#2d3532', 0.55, 0.4);
  private brass = this.material('#aa8750', 0.5, 0.6);
  private paper = this.material('#d7c7a2');
  private glow = new THREE.MeshStandardMaterial({ color: '#ffdf9c', emissive: '#ffc06c', emissiveIntensity: 2.2 });
  private glass = new THREE.MeshStandardMaterial({ color: '#acdad1', transparent: true, opacity: 0.12, roughness: 0.2, depthWrite: false });
  private grille = new THREE.MeshStandardMaterial({ color: '#3b3e36', roughness: 0.9, map: map(128, 128, c => {
    c.fillStyle = '#a69b7b'; c.fillRect(0, 0, 128, 128); c.fillStyle = '#252d28';
    for (let y = 4; y < 128; y += 8) for (let x = 4; x < 128; x += 8) { c.beginPath(); c.arc(x, y, 2, 0, Math.PI * 2); c.fill(); }
  }) });

  constructor(private element: HTMLElement, private announce: (text: string) => void, private leave: () => void) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const canvas = this.renderer.domElement;
    canvas.tabIndex = 0; canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', 'Boutique publique d’Azur, vue depuis l’entrée');
    canvas.setAttribute('aria-describedby', 'shop-help'); element.append(canvas);
    this.scene.background = new THREE.Color('#211b19');
    this.scene.add(this.root); this.root.name = 'azur:public-shop';
    for (const material of [this.wood, this.darkWood]) { material.map = material.bumpMap = null; material.bumpScale = 0.012; }
    finishSurface('bois', [this.wood, this.darkWood]);
    this.room(); this.shelves(); this.counter(); this.repairCorner(); this.displayCase(); this.details(); this.lighting();
    this.rain = this.exterior();
    this.batch();
    this.workshop = new AzurWorkshop({ root: this.root, group: this.group.bind(this), box: this.box.bind(this), cylinder: this.cylinder.bind(this), ring: this.ring.bind(this), rod: this.rod.bind(this), material: this.material.bind(this), art: this.art.bind(this), plaque: this.plaque.bind(this), device: this.device.bind(this), storage: this.storage.bind(this), drawers: this.drawers.bind(this), tool: this.tool.bind(this), armLamp: this.armLamp.bind(this), stool: this.stool.bind(this), mug: this.mug.bind(this), paperwork: this.paperwork.bind(this), register: this.register.bind(this), batch: this.batch.bind(this) });
    this.workshop.update(0, 0, false);
    this.hint.visible = this.highlight.visible = false;
    const line = this.highlight.material as THREE.LineBasicMaterial; line.transparent = true; line.opacity = 0.3;
    this.scene.add(this.hint, this.highlight);
    this.camera.position.copy(AZUR_POSES.entrance.position); this.camera.lookAt(new THREE.Vector3().copy(AZUR_POSES.entrance.lookAt));
    this.bind(); this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(element); this.resize();
  }
  private material(color: string, roughness = 0.82, metalness = 0.04) {
    const key = `${color}/${roughness}/${metalness}`;
    if (!this.materials.has(key)) this.materials.set(key, new THREE.MeshStandardMaterial({ color, map: this.patina, bumpMap: this.patina, bumpScale: 0.004, roughness, metalness }));
    return this.materials.get(key)!;
  }
  private group(x = 0, y = 0, z = 0, parent: THREE.Object3D = this.root) {
    const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g;
  }
  private mesh(g: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh;
  }
  private box(g: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material, r = 0.018) {
    const key = `${w}/${h}/${d}/${r}`;
    if (!this.geometry.has(key)) this.geometry.set(key, new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 3, h / 3, d / 3)));
    return this.mesh(g, this.geometry.get(key)!, m, x, y, z);
  }
  private cylinder(g: THREE.Object3D, r: number, h: number, x: number, y: number, z: number, m: THREE.Material, top = r) {
    const key = `c/${r}/${h}/${top}`;
    if (!this.geometry.has(key)) this.geometry.set(key, new THREE.CylinderGeometry(top, r, h, 20));
    return this.mesh(g, this.geometry.get(key)!, m, x, y, z);
  }
  private ring(g: THREE.Object3D, r: number, tube: number, x: number, y: number, z: number, m: THREE.Material) {
    const key = `t/${r}/${tube}`;
    if (!this.geometry.has(key)) this.geometry.set(key, new THREE.TorusGeometry(r, tube, 6, 40));
    return this.mesh(g, this.geometry.get(key)!, m, x, y, z);
  }
  private rod(g: THREE.Object3D, from: number[], to: number[], r: number, m: THREE.Material) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), direction = b.clone().sub(a);
    const mesh = this.cylinder(g, r, direction.length(), 0, 0, 0, m);
    mesh.position.copy(a.add(b).multiplyScalar(0.5)); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()); return mesh;
  }
  private art(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, draw: (c: CanvasRenderingContext2D) => void, lit = false) {
    const texture = map(1024, Math.round(1024 * h / w), draw);
    return this.mesh(g, new THREE.PlaneGeometry(w, h), lit ? new THREE.MeshBasicMaterial({ map: texture }) : new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95 }), x, y, z);
  }
  private plaque(g: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, lines: string[], dark = true) {
    this.box(g, w + 0.06, h + 0.06, 0.035, x, y, z, this.darkWood);
    return this.art(g, w, h, x, y, z + 0.022, c => {
      const height = c.canvas.height; c.fillStyle = dark ? '#28332f' : '#cdbc96'; c.fillRect(0, 0, 1024, height);
      c.strokeStyle = dark ? '#ad8d58' : '#6b563c'; c.lineWidth = 7; c.strokeRect(18, 18, 988, height - 36);
      c.fillStyle = dark ? '#edd3a2' : '#3e493d'; c.textAlign = 'center'; c.textBaseline = 'middle';
      lines.forEach((line, i) => { c.font = `${i === 0 ? 'bold' : ''} ${Math.min(112, height / (lines.length + 1) * 0.65)}px ${i === 0 ? 'Georgia' : 'monospace'}`; c.fillText(line, 512, height * (i + 1) / (lines.length + 1), 935); });
    });
  }
  private register(object: THREE.Object3D, action: string, label: string, hint: number[], views: AzurView[] = ['entrance', 'counter']) {
    object.userData.action = action; object.userData.label = label; object.userData.hint = new THREE.Vector3(...hint);
    object.userData.views = views;
    this.targets.push(object);
  }
  private room() {
    this.box(this.root, 10.3, 0.18, 10.3, 0, -0.12, 0.5, this.darkWood);
    const boards = [this.material('#a99d88'), this.wood, this.material('#9b8d78'), this.material('#b5a78e')];
    const floorMaterials = boards.filter(m => m !== this.wood);
    floorMaterials.forEach(m => { m.map = m.bumpMap = null; m.bumpScale = 0.01; });
    finishSurface('bois', floorMaterials);
    for (let row = 0; row < 22; row++) for (let col = 0; col < 4; col++) {
      const plank = this.box(this.root, 0.455, 0.055, 2.48, -4.88 + row * 0.466, -0.017, -3.22 + col * 2.5, boards[(row + col) % 4], 0.006);
      plank.position.z += row % 2 ? 0.12 : 0;
    }
    const plaster = this.material('#8d7760');
    // Baie architecturale réelle derrière la porte fermée, raccord réservé à la suite.
    this.box(this.root, 5.84, 3.6, 0.2, -2.08, 1.8, -4.45, plaster);
    this.box(this.root, 2.74, 3.6, 0.2, 3.63, 1.8, -4.45, plaster);
    this.box(this.root, 1.42, 0.99, 0.2, 1.55, 3.105, -4.45, plaster);
    this.box(this.root, 0.2, 3.6, 10, 5, 1.8, 0.5, plaster);
    this.box(this.root, 10, 0.15, 10.2, 0, 3.58, 0.5, this.darkWood);
    for (let i = 0; i < 26; i++) this.box(this.root, 10, 0.035, 0.38, 0, 3.48, -4.3 + i * 0.39, boards[i % 4], 0.005);
    for (const z of [-3.7, -0.7, 2.3, 5.2]) this.box(this.root, 10.1, 0.22, 0.22, 0, 3.32, z, this.darkWood);
    for (const x of [-4.85, 0.5, 4.85]) this.box(this.root, 0.17, 0.28, 10, x, 3.36, 0.5, this.wood);
    for (const y of [0.12, 0.8, 3.15]) {
      if (y < 3) {
        this.box(this.root, 5.84, 0.14, 0.13, -2.08, y, -4.29, this.wood);
        this.box(this.root, 2.74, 0.14, 0.13, 3.63, y, -4.29, this.wood);
      } else this.box(this.root, 10, 0.14, 0.13, 0, y, -4.29, this.wood);
      this.box(this.root, 0.13, 0.14, 10, 4.86, y, 0.5, this.wood);
    }
    for (const x of [-4.85, -0.4, 4.85]) this.box(this.root, 0.18, 3.5, 0.17, x, 1.75, -4.26, this.darkWood);
    // La baie et la porte d'entrée sont de vrais cadres, ouvrant sur une rue en volumes.
    const entry = this.group(-4.95, 0, 2.5); entry.rotation.y = Math.PI / 2; entry.name = 'azur:entrance-door';
    for (const x of [-1.85, -0.62, 0.62, 1.85]) this.box(entry, 0.12, 3.25, 0.18, x, 1.62, 0, this.wood);
    for (const y of [0.12, 0.62, 3.18]) this.box(entry, 3.85, 0.13, 0.18, 0, y, 0, this.wood);
    for (const x of [-1.23, 0, 1.23]) {
      this.box(entry, 1.12, 0.46, 0.09, x, 0.35, 0, this.darkWood);
      this.box(entry, 1.1, 2.4, 0.016, x, 1.89, 0, this.glass);
    }
    this.rod(entry, [0.45, 0.94, 0.16], [0.45, 1.24, 0.16], 0.028, this.brass);
    this.plaque(entry, 0.68, 0.57, 1.2, 2.1, 0.025, ['Réparation', 'Vente', 'Reconditionné'], false);
    this.register(entry, 'entrance', 'Quitter la boutique', [-4.0, 2.4, 0.6]);
    this.box(this.root, 0.2, 3.5, 5.12, -4.96, 1.75, -1.89, plaster);
    this.box(this.root, 0.2, 3.5, 1.25, -4.96, 1.75, 5.05, plaster);
    // Même porte fermée qu'en boutique ; pivot réel dans l'arrière-boutique.
    const door = this.group(1.55, 0, -4.27); door.name = 'azur:backroom-door';
    for (const x of [-0.68, 0.68]) this.box(door, 0.12, 2.55, 0.18, x, 1.27, 0.02, this.wood);
    this.box(door, 1.48, 0.13, 0.18, 0, 2.55, 0.02, this.wood);
    this.doorLeaf = this.group(-0.615, 0, 0, door); this.doorLeaf.name = 'azur:private-door-leaf';
    this.box(this.doorLeaf, 1.23, 2.47, 0.1, 0.615, 1.26, -0.015, this.material('#536357'));
    for (const y of [0.6, 1.75]) this.box(this.doorLeaf, 0.98, 0.78, 0.045, 0.615, y, 0.057, this.material('#46564b'));
    this.cylinder(this.doorLeaf, 0.048, 0.13, 1.045, 1.08, 0.11, this.brass).rotation.x = Math.PI / 2;
    this.plaque(this.doorLeaf, 0.77, 0.25, 0.615, 2.05, 0.08, ['PRIVÉ · AZUR']);
    this.register(door, 'backroom', 'Entrer dans l’arrière-boutique', [1.55, 2.75, -3.95], ['entrance', 'counter', 'backroom', 'discovery']);
    const connection = this.group(1.55, 0, -4.45); connection.name = 'azur:backroom-connection';
    connection.userData.connects = 'azur:backroom';
    const rug = this.mesh(this.root, new THREE.PlaneGeometry(5.8, 2.1), wovenRug(), -0.7, 0.022, 2.25); rug.rotation.x = -Math.PI / 2;
    const mat = this.mesh(this.root, new THREE.PlaneGeometry(1.45, 1.0), wovenRug(), -3.95, 0.025, 3.1); mat.rotation.x = -Math.PI / 2; mat.rotation.z = Math.PI / 2;
  }
  private device(parent: THREE.Object3D, kind: 'radio' | 'clock' | 'tape' | 'tv' | 'fan' | 'lamp', x: number, y: number, z: number, s: number, color: THREE.Material, strange = false) {
    const g = this.group(x, y, z, parent); g.scale.setScalar(s); g.name = `azur:device:${kind}`;
    if (kind === 'radio') {
      this.box(g, 0.72, 0.43, 0.29, 0, 0.24, 0, color, 0.055);
      this.box(g, 0.29, 0.29, 0.015, -0.17, 0.245, 0.153, this.grille, 0.025);
      this.box(g, 0.25, 0.085, 0.02, 0.18, 0.31, 0.155, this.material('#394f47'));
      for (let i = 0; i < 7; i++) this.box(g, 0.012, 0.038, 0.008, 0.08 + i * 0.032, 0.31, 0.17, this.paper, 0.002);
      for (const x of [0.1, 0.26]) this.cylinder(g, 0.048, 0.05, x, 0.17, 0.17, this.brass).rotation.x = Math.PI / 2;
      for (const x of [-0.22, 0.22]) this.box(g, 0.035, 0.12, 0.035, x, 0.49, 0, this.iron);
      this.box(g, 0.47, 0.035, 0.035, 0, 0.54, 0, this.iron);
      for (let i = 0; i < (strange ? 5 : 1); i++) this.rod(g, [0.26 - i * 0.11, 0.45, -0.07], [0.32 + (i - 2) * 0.14, 0.94 + noise(i) * 0.2, -0.08], 0.009, this.brass);
    } else if (kind === 'clock') {
      this.box(g, 0.49, 0.3, 0.22, 0, 0.18, 0, color, 0.07);
      this.art(g, 0.38, 0.17, 0, 0.2, 0.114, c => {
        c.fillStyle = '#263c36'; c.fillRect(0, 0, 1024, c.canvas.height); c.fillStyle = '#c1cd9a'; c.textAlign = 'center'; c.font = 'bold 240px monospace'; c.fillText(strange ? '25:61' : '08:24', 512, 285);
      }, true);
      for (const x of [-0.15, 0.15]) this.box(g, 0.06, 0.045, 0.15, x, 0.02, 0, this.iron);
      this.box(g, 0.16, 0.04, 0.09, 0.08, 0.34, 0, this.cream);
    } else if (kind === 'tape') {
      this.box(g, 0.68, 0.26, 0.35, 0, 0.16, 0, color, 0.03);
      this.box(g, 0.33, 0.15, 0.03, -0.11, 0.17, 0.18, this.iron);
      for (const x of [-0.2, -0.02]) { this.ring(g, 0.045, 0.012, x, 0.17, 0.202, this.paper); }
      for (let i = 0; i < 5; i++) this.box(g, 0.05, 0.027, 0.08, -0.24 + i * 0.067, 0.31, 0.07, i === 0 ? this.peach : this.cream);
      this.box(g, 0.19, 0.14, 0.012, 0.23, 0.17, 0.183, this.grille);
      this.box(g, 0.35, 0.035, 0.035, -0.08, 0.39, -0.09, this.iron);
      for (const x of [-0.24, 0.08]) this.box(g, 0.03, 0.08, 0.03, x, 0.35, -0.09, this.iron);
    } else if (kind === 'tv') {
      this.box(g, 0.76, 0.64, 0.53, 0, 0.36, 0, color, 0.06);
      this.box(g, 0.57, 0.47, 0.06, -0.055, 0.38, 0.27, this.iron, 0.055);
      const screen = this.box(g, 0.49, 0.39, 0.06, -0.055, 0.38, 0.302, this.material('#487475', 0.35), 0.06);
      screen.material = new THREE.MeshStandardMaterial({ color: '#548780', emissive: '#1b6563', emissiveIntensity: 0.3, roughness: 0.28 });
      this.art(g, 0.43, 0.29, -0.055, 0.38, 0.337, c => {
        const h = c.canvas.height; c.fillStyle = '#264447'; c.fillRect(0, 0, 1024, h);
        for (let i = 0; i < 5; i++) { c.fillStyle = ['#adc6a1', '#d6be89', '#889eb5', '#bf9182', '#5b837c'][i]; c.fillRect(i * 205, h * 0.3, 205, h * 0.4); }
        c.strokeStyle = '#182d2f66'; for (let y = 0; y < h; y += 6) { c.beginPath(); c.moveTo(0, y); c.lineTo(1024, y); c.stroke(); }
      }, true);
      for (const y of [0.48, 0.29]) this.cylinder(g, 0.038, 0.04, 0.3, y, 0.29, this.cream).rotation.x = Math.PI / 2;
      this.box(g, 0.32, 0.055, 0.35, 0, 0.025, 0.01, this.darkWood);
      this.rod(g, [0, 0.7, 0], [-0.25, 1.02, -0.05], 0.008, this.brass); this.rod(g, [0, 0.7, 0], [0.25, 0.98, 0.03], 0.008, this.brass);
    } else if (kind === 'fan') {
      this.cylinder(g, 0.25, 0.07, 0, 0.04, 0, color); this.rod(g, [0, 0.07, 0], [0, 0.49, 0], 0.037, color);
      this.ring(g, 0.32, 0.025, 0, 0.67, 0, color);
      for (let i = 0; i < 3; i++) {
        const blade = this.box(g, 0.13, 0.25, 0.025, 0, 0.8, -0.02, strange && i === 0 ? this.wood : color, 0.045);
        blade.position.set(Math.sin(i * 2.094) * 0.13, 0.67 + Math.cos(i * 2.094) * 0.13, -0.02); blade.rotation.z = -i * 2.094 - 0.3;
      }
      for (const r of [0.13, 0.21, 0.29]) this.ring(g, r, 0.006, 0, 0.67, 0.03, this.iron);
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; this.rod(g, [0, 0.67, 0.045], [Math.sin(a) * 0.31, 0.67 + Math.cos(a) * 0.31, 0.045], 0.004, this.iron); }
      this.cylinder(g, 0.05, 0.06, 0, 0.67, 0.06, this.brass).rotation.x = Math.PI / 2;
    } else {
      this.cylinder(g, 0.17, 0.065, 0, 0.032, 0, color); this.rod(g, [0, 0.05, 0], [-0.06, 0.5, 0], 0.025, this.brass);
      this.cylinder(g, 0.24, 0.25, -0.06, 0.59, 0, color, 0.12);
      this.cylinder(g, 0.2, 0.018, -0.06, 0.473, 0, this.glow);
    }
    return g;
  }
  private shelves() {
    const shelf = this.group(-2.25, 0, -3.92); shelf.name = 'azur:retail-shelves';
    for (const x of [-2.27, 0, 2.27]) this.box(shelf, 0.09, 3.0, 0.55, x, 1.5, 0, this.darkWood);
    for (const y of [0.18, 0.85, 1.55, 2.3, 3.0]) {
      this.box(shelf, 4.65, 0.075, 0.73, 0, y, 0, this.wood);
      this.box(shelf, 4.65, 0.04, 0.025, 0, y - 0.03, 0.37, this.brass);
    }
    this.box(this.root, 2.24, 0.83, 0.07, -1.25, 2.92, -3.36, this.darkWood);
    this.art(this.root, 2.15, 0.75, -1.25, 2.92, -3.315, c => {
      c.fillStyle = '#2a3532'; c.fillRect(0, 0, 1024, 357); c.strokeStyle = '#a99267'; c.lineWidth = 5; c.strokeRect(12, 12, 1000, 333);
      c.fillStyle = '#e6c79c'; c.textAlign = 'center'; c.font = 'bold 174px Georgia'; c.fillText('AZUR', 512, 174);
      c.font = '48px monospace'; c.fillText('ÉLECTRONIQUE', 512, 240); c.font = '29px monospace'; c.fillText('RÉPARATION · VENTE · RECONDITIONNÉ', 512, 302);
    });
    const colors = [this.cream, this.sage, this.lavender, this.peach];
    const kinds = ['radio', 'clock', 'tape', 'tv', 'fan', 'lamp'] as const;
    for (let row = 0; row < 4; row++) for (let i = 0; i < 5; i++) {
      if (row === 3 && i > 1) continue;
      const kind = kinds[(i + row * 2) % kinds.length], s = kind === 'tv' ? 0.74 : kind === 'fan' ? 0.64 : 0.82;
      this.device(shelf, kind, -1.88 + i * 0.91, [0.22, 0.9, 1.6, 2.35][row], 0.04, s, colors[(row + i) % 4], row === 2 && i === 0);
    }
    // Appareils empilables, cordons et stocks plus serrés dans la partie supérieure.
    for (let i = 0; i < 3; i++) {
      this.device(shelf, i % 2 ? 'tape' : 'radio', 0.2 + i * 0.72, 2.35, -0.04, 0.64, colors[i]);
      this.box(shelf, 0.5, 0.07, 0.29, -1.8 + i * 0.62, 1.63, -0.13, i % 2 ? this.lavender : this.peach);
    }
    for (let i = 0; i < 13; i++) {
      const x = -4.45 + i * 0.34, box = this.group(x, 3.1, -3.97);
      this.box(box, 0.3, 0.23 + noise(i) * 0.12, 0.38, 0, 0.13, 0, i % 3 === 0 ? this.sage : this.material('#92734f'));
      this.box(box, 0.12, 0.075, 0.01, 0, 0.15, 0.2, this.paper);
    }
    // Petits accessoires entre les silhouettes principales : chaque tablette reste habitée.
    for (let row = 0; row < 3; row++) for (let i = 0; i < 5; i++) {
      const x = -3.72 + i * 0.91, y = [0.22, 0.9, 1.6][row];
      if ((row + i) % 3 === 0) this.accessory(this.root, 'headphones', x, y, -3.57, 0.5);
      else if ((row + i) % 3 === 1) this.accessory(this.root, 'camera', x, y, -3.55, 0.6);
      else { this.storage(this.root, x, y, -3.51, 0.27, this.peach); this.storage(this.root, x + 0.05, y + 0.16, -3.51, 0.22, this.cream); }
    }
    for (let i = 0; i < 5; i++) this.plaque(this.root, 0.3, 0.07, -4.1 + i * 0.88, 1.54, -3.5, [['RADIOS', 'RÉVEILS', 'CASSETTES', 'TESTÉS', 'OCCASION'][i]], false);
    // Les ventes à gauche se poursuivent sur un retour bas, sans encombrer la baie.
    const left = this.group(-4.43, 0, -2.25); left.rotation.y = Math.PI / 2;
    for (const y of [0.18, 0.87, 1.59, 2.35]) this.box(left, 2.5, 0.07, 0.68, 0, y, 0, this.wood);
    for (const x of [-1.25, 1.25]) this.box(left, 0.07, 2.7, 0.65, x, 1.35, 0, this.darkWood);
    this.device(left, 'tv', -0.68, 1.63, 0, 0.82, this.cream);
    this.device(left, 'fan', 0.55, 1.63, 0, 0.77, this.sage);
    this.device(left, 'radio', -0.63, 0.91, 0, 1.0, this.peach);
    this.device(left, 'tape', 0.58, 0.91, 0, 1.05, this.lavender);
    this.device(left, 'clock', 0.57, 2.39, 0, 0.9, this.peach);
    this.plant(left, -0.78, 2.4, -0.1, 0.5, true);
    for (let i = 0; i < 4; i++) this.storage(left, -0.85 + i * 0.55, 0.23, 0.02, 0.48, this.material('#817b60'));
  }
  private storage(g: THREE.Object3D, x: number, y: number, z: number, s: number, color = this.sage) {
    this.box(g, s, s * 0.53, s * 0.72, x, y + s * 0.26, z, color);
    this.box(g, s * 0.97, s * 0.12, s * 0.73, x, y + s * 0.53, z, color);
    this.box(g, s * 0.32, s * 0.16, 0.015, x, y + s * 0.3, z + s * 0.37, this.paper);
    this.box(g, s * 0.18, s * 0.025, 0.035, x, y + s * 0.2, z + s * 0.39, this.iron);
  }
  private counter() {
    const counter = this.group(-0.9, 0, -0.35); counter.name = 'azur:counter';
    this.box(counter, 4.8, 0.96, 1.12, 0, 0.5, 0, this.darkWood);
    for (let i = 0; i < 21; i++) this.box(counter, 0.215, 0.83, 0.06, -2.25 + i * 0.225, 0.51, 0.59, this.wood, 0.006);
    for (const y of [0.1, 0.94]) this.box(counter, 4.85, 0.1, 0.12, 0, y, 0.61, this.wood);
    for (const x of [-2.33, 2.33]) this.box(counter, 0.12, 0.9, 0.12, x, 0.51, 0.6, this.wood);
    this.box(counter, 5.02, 0.115, 1.4, 0, 1.03, 0, this.wood, 0.027);
    this.box(counter, 4.94, 0.025, 1.31, 0, 1.1, 0, this.darkWood);
    this.register(counter, 'counter', 'S’approcher du comptoir d’Azur', [-0.9, 1.47, 0.44]);
    // Caisse mécanique ; rien n'est lié au solde du Plinko.
    const till = this.group(0.7, 1.115, -0.57); till.rotation.y = -0.1; till.name = 'azur:cash-register';
    this.box(till, 0.8, 0.15, 0.65, 0, 0.075, 0, this.material('#6d796a'));
    this.box(till, 0.65, 0.36, 0.45, 0, 0.3, -0.09, this.cream, 0.04);
    this.box(till, 0.47, 0.11, 0.025, 0, 0.4, 0.151, this.material('#2c4035'));
    this.art(till, 0.42, 0.08, 0, 0.4, 0.166, c => { c.fillStyle = '#263d32'; c.fillRect(0, 0, 1024, 200); c.fillStyle = '#beca9b'; c.font = 'bold 130px monospace'; c.textAlign = 'center'; c.fillText('BONJOUR', 512, 145); }, true);
    for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) this.box(till, 0.065, 0.026, 0.055, -0.24 + i * 0.093, 0.18 + row * 0.036, 0.18 - row * 0.065, i === 5 ? this.peach : this.paper, 0.008);
    this.box(till, 0.23, 0.035, 0.025, 0, 0.075, 0.335, this.brass);
    this.device(this.root, 'radio', -2.1, 1.12, -0.55, 1.1, this.peach, true);
    this.device(this.root, 'tape', -1.15, 1.12, -0.45, 0.83, this.lavender);
    this.plaque(this.root, 0.53, 0.13, -2.1, 1.23, -0.13, ['Fonctionne normalement'], false);
    // Appareil ouvert sur un tapis de réparation, circuit et capot séparés.
    this.box(this.root, 0.75, 0.016, 0.45, -0.15, 1.122, -0.37, this.material('#556f62'));
    const circuit = this.group(-0.25, 1.15, -0.36); circuit.rotation.y = 0.25;
    this.box(circuit, 0.36, 0.055, 0.24, 0, 0.03, 0, this.sage);
    for (let i = 0; i < 5; i++) { this.cylinder(circuit, 0.015, 0.05, -0.13 + i * 0.06, 0.08, -0.06, this.brass); this.box(circuit, 0.04, 0.025, 0.045, -0.13 + i * 0.06, 0.07, 0.04, this.iron); }
    const lid = this.box(this.root, 0.37, 0.05, 0.25, 0.12, 1.15, -0.4, this.cream); lid.rotation.y = -0.2;
    this.tool(this.root, 'driver', 0.1, 1.14, -0.1, 0.7, -Math.PI / 2);
    this.paperwork(this.root, -1.1, 1.132, 0.12, 0.42, 0.3, -0.14);
    this.mug(this.root, 1.1, 1.12, -0.45);
    this.accessory(this.root, 'camera', -2.95, 1.12, -0.55, 0.7);
    this.rod(this.root, [-0.58, 1.15, -0.16], [-0.34, 1.15, -0.05], 0.014, this.brass);
    this.ring(this.root, 0.055, 0.012, -0.61, 1.15, -0.17, this.peach).rotation.x = Math.PI / 2;
    // Ardoise de boutique posée au sol, jamais un panneau d'interface.
    const board = this.group(-3.34, 0, 0.54); board.rotation.y = 0.08;
    this.plaque(board, 0.62, 0.82, 0, 0.47, 0, ['Petites', 'réparations,', 'grandes', 'idées.']);
    for (const x of [-0.36, 0.36]) this.box(board, 0.06, 1.0, 0.07, x, 0.5, -0.03, this.wood);
    this.rod(board, [-0.33, 0.85, -0.03], [-0.33, 0.03, -0.5], 0.025, this.wood);
  }
  private tool(g: THREE.Object3D, kind: 'driver' | 'pliers' | 'spanner', x: number, y: number, z: number, s = 1, rotation = 0) {
    const t = this.group(x, y, z, g); t.scale.setScalar(s); t.rotation.x = rotation;
    if (kind === 'driver') {
      this.box(t, 0.055, 0.18, 0.05, 0, 0, 0, this.peach, 0.02); this.rod(t, [0, 0.08, 0], [0, 0.3, 0], 0.009, this.brass);
    } else if (kind === 'pliers') {
      for (const sign of [-1, 1]) {
        this.rod(t, [0, 0.12, 0], [sign * 0.055, -0.12, 0], 0.019, this.sage);
        this.rod(t, [0, 0.12, 0], [sign * 0.055, 0.25, 0], 0.012, this.iron);
      }
      this.cylinder(t, 0.026, 0.045, 0, 0.1, 0.015, this.brass).rotation.x = Math.PI / 2;
    } else {
      this.box(t, 0.035, 0.28, 0.024, 0, 0.05, 0, this.brass); this.ring(t, 0.055, 0.015, 0, 0.22, 0, this.brass);
      this.box(t, 0.1, 0.04, 0.025, 0, -0.09, 0, this.brass);
      for (const x of [-0.04, 0.04]) this.box(t, 0.025, 0.07, 0.025, x, -0.14, 0, this.brass);
    }
  }
  private drawers(g: THREE.Object3D, w: number, h: number, cols: number, rows: number, x: number, y: number, z: number, color = this.sage) {
    this.box(g, w, h, 0.25, x, y + h / 2, z, this.darkWood);
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const xx = x - w / 2 + (col + 0.5) * w / cols, yy = y + (row + 0.5) * h / rows;
      this.box(g, w / cols - 0.018, h / rows - 0.018, 0.04, xx, yy, z + 0.14, color);
      this.box(g, w / cols * 0.48, h / rows * 0.28, 0.008, xx, yy + 0.014, z + 0.165, this.paper);
      this.box(g, w / cols * 0.25, 0.015, 0.03, xx, yy - h / rows * 0.22, z + 0.18, this.brass);
    }
  }
  private repairCorner() {
    const work = this.group(4.37, 0, -1.65); work.rotation.y = -Math.PI / 2; work.name = 'azur:repair-corner';
    this.box(work, 4.9, 0.12, 0.95, 0, 1.02, 0, this.wood);
    for (const x of [-2.15, 2.15]) for (const z of [-0.32, 0.32]) this.box(work, 0.1, 1.0, 0.1, x, 0.5, z, this.darkWood);
    this.box(work, 4.7, 0.07, 0.72, 0, 0.22, 0, this.wood);
    this.box(work, 4.8, 1.27, 0.07, 0, 1.87, -0.37, this.material('#a87b4c'));
    const holes: number[] = [];
    for (let row = 0; row < 12; row++) for (let col = 0; col < 43; col++) holes.push(-2.28 + col * 0.108, 1.3 + row * 0.103, -0.329);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(holes, 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#473729', size: 0.018, sizeAttenuation: true })); work.add(points);
    for (let i = 0; i < 18; i++) this.tool(work, ['driver', 'pliers', 'spanner'][i % 3] as 'driver' | 'pliers' | 'spanner', -2.17 + i * 0.25, 1.85 + (i % 2) * 0.25, -0.27, 0.8 + (i % 3) * 0.12);
    this.drawers(work, 1.0, 0.74, 4, 5, 1.9, 1.08, 0, this.material('#626e7c'));
    this.drawers(this.root, 1.05, 1.3, 4, 6, 0.38, 1.27, -4.1, this.material('#bd9f6b'));
    for (const y of [2.59, 3.18]) {
      this.box(work, 4.95, 0.07, 0.48, 0, y, -0.25, this.wood);
      for (let i = 0; i < 9; i++) this.storage(work, -2.2 + i * 0.54, y + 0.04, -0.24, 0.45, i % 3 === 0 ? this.sage : this.material('#a08156'));
    }
    this.device(work, 'tv', -0.7, 1.09, -0.02, 0.68, this.sage);
    this.device(work, 'radio', 0.6, 1.09, 0, 0.65, this.cream);
    this.device(work, 'tape', -1.7, 1.09, 0, 0.6, this.peach);
    this.paperwork(work, -0.05, 1.09, 0.12, 0.45, 0.32, -0.06);
    this.mug(work, 1.1, 1.08, 0.12); this.armLamp(work, 0.9, 1.08, -0.15, 0.85);
    for (let i = 0; i < 5; i++) this.storage(work, -1.9 + i * 0.85, 0.26, 0, 0.65, i % 2 ? this.sage : this.material('#8a6d4c'));
    this.stool(this.root, 3.02, 0, -1.2); this.stool(this.root, 0.8, 0, -2.65);
    const cables = this.group(4.79, 0, 1.01); cables.rotation.y = -Math.PI / 2;
    for (let i = 0; i < 5; i++) { this.ring(cables, 0.12 + (i % 2) * 0.03, 0.015, -0.4 + (i % 3) * 0.35, 2.75 - Math.floor(i / 3) * 0.4, 0, i % 2 ? this.iron : this.peach); }
    this.plaque(cables, 0.88, 0.66, 0, 1.84, 0, ['De bons appareils', 'pour une vie', 'plus simple.'], false);
    // Dossiers punaisés et fils de test : le poste reste un atelier de réparation ordinaire.
    const notes = this.group(4.76, 0, -1.5); notes.rotation.y = -Math.PI / 2;
    for (let i = 0; i < 3; i++) {
      const note = this.group(-0.72 + i * 0.62, 1.45 + (i % 2) * 0.14, 0.12, notes); note.rotation.z = (i - 1) * 0.06;
      this.plaque(note, 0.29, 0.25, 0, 0, 0, [['À TESTER', 'contact', 'à revoir'], ['VALIDÉ', 'Normalement,', 'oui.'], ['ATELIER', 'ne rien', 'jeter.']][i], false);
      this.cylinder(note, 0.014, 0.016, 0, 0.13, 0.035, this.peach).rotation.x = Math.PI / 2;
    }
  }
  private armLamp(g: THREE.Object3D, x: number, y: number, z: number, s: number) {
    const lamp = this.group(x, y, z, g); lamp.scale.setScalar(s);
    this.cylinder(lamp, 0.16, 0.045, 0, 0.02, 0, this.sage);
    this.rod(lamp, [0, 0.04, 0], [0.12, 0.42, -0.02], 0.025, this.sage);
    this.rod(lamp, [0.12, 0.42, -0.02], [-0.28, 0.75, 0.04], 0.025, this.sage);
    for (const p of [[0, 0.07, 0], [0.12, 0.42, -0.02], [-0.28, 0.75, 0.04]]) this.cylinder(lamp, 0.047, 0.06, ...p as [number, number, number], this.brass).rotation.x = Math.PI / 2;
    const shade = this.group(-0.31, 0.68, 0.08, lamp); shade.rotation.z = -0.35;
    this.cylinder(shade, 0.19, 0.19, 0, 0, 0, this.sage, 0.075); this.cylinder(shade, 0.163, 0.015, 0, -0.095, 0, this.glow);
    const glow = new THREE.PointLight('#ffd49a', 4.5, 2.8, 2); glow.position.set(-0.31, 0.5, 0.16); lamp.add(glow);
  }
  private displayCase() {
    const cabinet = this.group(3.6, 0, 0.8); cabinet.name = 'azur:display-cabinet'; cabinet.scale.x = 0.8;
    this.box(cabinet, 1.9, 0.38, 0.91, 0, 0.2, 0, this.wood);
    this.box(cabinet, 1.9, 0.08, 0.91, 0, 2.18, 0, this.wood);
    this.box(cabinet, 1.85, 1.8, 0.065, 0, 1.26, -0.43, this.darkWood);
    for (const x of [-0.91, 0.91]) for (const z of [-0.4, 0.4]) this.box(cabinet, 0.055, 1.83, 0.055, x, 1.26, z, this.brass);
    for (const y of [0.41, 0.99, 1.58]) {
      this.box(cabinet, 1.8, 0.035, 0.78, 0, y, 0, this.cream);
      this.box(cabinet, 1.7, 0.014, 0.025, 0, y + 0.53, -0.3, this.glow);
      const light = new THREE.PointLight('#ffe0a6', 2.6, 2.1); light.position.set(0, y + 0.45, 0.18); cabinet.add(light);
    }
    this.box(cabinet, 1.78, 1.75, 0.01, 0, 1.29, 0.42, this.glass);
    this.box(cabinet, 0.01, 1.75, 0.78, -0.93, 1.29, 0, this.glass);
    this.device(cabinet, 'radio', -0.43, 0.44, 0.02, 0.73, this.cream);
    this.device(cabinet, 'tape', 0.43, 0.44, 0.02, 0.77, this.sage);
    this.device(cabinet, 'clock', -0.4, 1.02, 0.05, 0.88, this.lavender, true);
    this.device(cabinet, 'radio', 0.4, 1.02, 0.02, 0.76, this.peach);
    this.device(cabinet, 'fan', -0.43, 1.61, -0.02, 0.58, this.sage, true);
    this.device(cabinet, 'lamp', 0.42, 1.61, 0, 0.72, this.cream);
    // Une vitrine étroite, sans écraser les proportions des appareils qu'elle contient.
    for (const child of cabinet.children) if (child.name.startsWith('azur:device:')) child.scale.x /= 0.8;
    this.plaque(cabinet, 1.46, 0.18, 0, 0.24, 0.47, ['UNE DEUXIÈME VIE · TESTÉS ICI']);
    this.plant(cabinet, 0.48, 2.22, -0.05, 0.54);
  }
  private accessory(g: THREE.Object3D, kind: 'camera' | 'headphones', x: number, y: number, z: number, s: number) {
    const prop = this.group(x, y, z, g); prop.scale.setScalar(s);
    if (kind === 'camera') {
      this.box(prop, 0.35, 0.23, 0.19, 0, 0.13, 0, this.iron, 0.025);
      this.cylinder(prop, 0.084, 0.09, 0.03, 0.13, 0.13, this.brass).rotation.x = Math.PI / 2;
      this.cylinder(prop, 0.062, 0.01, 0.03, 0.13, 0.18, this.material('#1d383b', 0.18)).rotation.x = Math.PI / 2;
      this.box(prop, 0.1, 0.055, 0.09, -0.1, 0.265, 0.01, this.cream);
      this.box(prop, 0.05, 0.035, 0.055, 0.12, 0.26, 0, this.peach);
    } else {
      this.ring(prop, 0.18, 0.02, 0, 0.24, 0, this.iron);
      for (const x of [-0.17, 0.17]) this.box(prop, 0.09, 0.18, 0.12, x, 0.16, 0.02, this.lavender, 0.035);
      this.rod(prop, [0.18, 0.1, -0.01], [0.27, 0.01, 0.13], 0.01, this.iron);
    }
  }
  private mug(g: THREE.Object3D, x: number, y: number, z: number) {
    this.cylinder(g, 0.065, 0.14, x, y + 0.07, z, this.cream);
    this.cylinder(g, 0.054, 0.004, x, y + 0.141, z, this.material('#443021'));
    this.ring(g, 0.04, 0.013, x + 0.075, y + 0.075, z, this.cream).rotation.y = Math.PI / 2;
  }
  private paperwork(g: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, angle: number) {
    const paper = this.group(x, y, z, g); paper.rotation.x = -Math.PI / 2; paper.rotation.z = angle;
    this.art(paper, w, h, 0, 0, 0.002, c => {
      const height = c.canvas.height; c.fillStyle = '#d7c7a2'; c.fillRect(0, 0, 1024, height); c.fillStyle = '#566152'; c.font = 'bold 68px monospace'; c.fillText('AZUR · FICHE ATELIER', 65, 95);
      c.strokeStyle = '#76684c'; c.lineWidth = 3;
      for (let i = 0; i < 8; i++) { c.beginPath(); c.moveTo(70, 160 + i * 53); c.lineTo(900 - (i % 3) * 140, 160 + i * 53); c.stroke(); }
      c.strokeStyle = '#926441'; c.lineWidth = 9; c.beginPath(); c.ellipse(795, height - 110, 110, 55, -0.2, 0, Math.PI * 2); c.stroke();
    });
  }
  private stool(g: THREE.Object3D, x: number, y: number, z: number) {
    const stool = this.group(x, y, z, g);
    this.cylinder(stool, 0.24, 0.085, 0, 0.65, 0, this.wood);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; this.rod(stool, [Math.sin(a) * 0.18, 0.62, Math.cos(a) * 0.18], [Math.sin(a) * 0.27, 0.035, Math.cos(a) * 0.27], 0.025, this.darkWood); }
    this.ring(stool, 0.215, 0.015, 0, 0.26, 0, this.brass).rotation.x = Math.PI / 2;
  }
  private plant(parent: THREE.Object3D, x: number, y: number, z: number, s: number, hanging = false) {
    const g = this.group(x, y, z, parent); g.scale.setScalar(s);
    this.cylinder(g, 0.19, 0.36, 0, 0.18, 0, this.material('#98714c'), 0.27);
    this.cylinder(g, 0.24, 0.02, 0, 0.36, 0, this.darkWood);
    const leaf = this.material('#4f693a'); leaf.side = THREE.DoubleSide;
    for (let branch = 0; branch < 8; branch++) {
      const a = branch * 2.4, end = [Math.sin(a) * 0.5, hanging ? -0.8 - noise(branch) * 0.6 : 0.6 + noise(branch) * 0.5, Math.cos(a) * 0.4];
      this.rod(g, [0, 0.32, 0], end, 0.012, this.material('#5f6e38'));
      for (let i = 0; i < 5; i++) {
        const t = (i + 1) / 5, mesh = this.mesh(g, new THREE.SphereGeometry(0.1, 7, 5), leaf, end[0] * t + (i % 2 ? 0.07 : -0.07), 0.32 + (end[1] - 0.32) * t, end[2] * t);
        mesh.scale.set(1, 0.4, 1.8); mesh.rotation.set(a, i * 1.8, a);
      }
    }
  }
  private details() {
    this.plant(this.root, -4.03, 0.03, 1.43, 1.1);
    this.plant(this.root, 4.65, 0.03, 3.3, 0.85);
    this.plant(this.root, -4.35, 2.85, -4, 0.65, true);
    this.armLamp(this.root, -3.76, 0.94, -2.35, 0.9);
    // Accessoires reconditionnés, rouleaux et tiroirs dépareillés.
    for (let i = 0; i < 5; i++) {
      this.storage(this.root, -1.9 + i * 0.68, 0.1, -2.85, 0.57, i % 2 ? this.sage : this.peach);
      this.box(this.root, 0.25, 0.04, 0.17, -3.95 + i * 0.3, 2.46, -3.8, i % 2 ? this.lavender : this.cream);
    }
    const calendar = this.group(2.7, 0, -4.28);
    this.plaque(calendar, 0.59, 0.78, 0, 1.83, 0, ['ON RÉPARE', 'aussi', 'les bonnes', 'habitudes.'], false);
    this.plaque(this.root, 0.65, 0.16, -3.5, 1.49, -3.47, ['RECONDITIONNÉ · GARANTI TESTÉ'], false);
    for (let i = 0; i < 5; i++) this.rod(this.root, [3.0, 3.12 - i * 0.022, -4.2], [4.75, 3.12 - i * 0.022, -4.2], 0.008, i % 2 ? this.iron : this.brass);
    this.device(this.root, 'lamp', -3.83, 1.07, -0.75, 1.1, this.cream);
    const left = this.group(-4.77, 0, -0.6); left.rotation.y = Math.PI / 2;
    this.plaque(left, 0.68, 0.7, 0, 2.25, 0, ['ON GARDE', 'ce qui peut', 'encore servir.']);
    this.box(left, 1.36, 0.06, 0.32, -0.15, 2.78, 0.02, this.wood);
    this.plant(left, -0.55, 2.82, 0.02, 0.45, true);
    this.storage(left, 0.25, 2.81, 0.03, 0.37, this.peach);
    // Ombres de contact douces sous les meubles : indépendantes de la qualité de la carte d'ombre.
    const contact = map(64, 64, c => {
      const gradient = c.createRadialGradient(32, 32, 8, 32, 32, 32); gradient.addColorStop(0, '#1c160ce0'); gradient.addColorStop(0.65, '#1c160c70'); gradient.addColorStop(1, '#1c160c00'); c.fillStyle = gradient; c.fillRect(0, 0, 64, 64);
    });
    const material = new THREE.MeshBasicMaterial({ map: contact, transparent: true, opacity: 0.55, depthWrite: false });
    for (const [x, z, w, d] of [[-0.9, -0.35, 5.6, 2.2], [3.6, 0.8, 2.05, 1.7], [3.02, -1.2, 0.8, 0.8], [-4.03, 1.43, 1.0, 0.8]]) {
      const shadow = this.mesh(this.root, new THREE.PlaneGeometry(w, d), material, x, 0.013, z); shadow.rotation.x = -Math.PI / 2; shadow.castShadow = false;
    }
  }
  private lighting() {
    this.scene.add(new THREE.HemisphereLight('#d9cba9', '#453024', 0.72));
    const key = new THREE.DirectionalLight('#ffe7c6', 0.9); key.position.set(-2.5, 3.2, 3.0); key.target.position.set(0, 0.4, -1.5);
    this.publicKey = key;
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.1, far: 18 }); key.shadow.normalBias = 0.025; key.shadow.bias = -0.0002; this.scene.add(key, key.target);
    for (const p of [[-1.1, 2.9, 1.55], [-1.9, 2.95, -1.7], [2.65, 2.8, -1.25]]) {
      const lamp = this.group(p[0], p[1], p[2]);
      this.rod(lamp, [0, 0.05, 0], [0, 3.46 - p[1], 0], 0.012, this.iron);
      this.cylinder(lamp, 0.31, 0.17, 0, 0, 0, this.material('#716248'), 0.12);
      this.cylinder(lamp, 0.26, 0.025, 0, -0.082, 0, this.glow);
      const bulb = new THREE.PointLight('#ffd29a', 12, 7, 2); bulb.position.set(0, -0.15, 0); lamp.add(bulb);
    }
    const window = new THREE.PointLight('#819fe7', 24, 8, 2); window.position.set(-4.5, 2.0, 2.5); this.scene.add(window);
    const repair = new THREE.PointLight('#ffbe71', 8, 4.5, 2); repair.position.set(3.7, 2.65, -2); this.scene.add(repair);
  }
  private exterior() {
    const blue = new THREE.MeshBasicMaterial({ map: map(64, 512, c => {
      const gradient = c.createLinearGradient(0, 0, 0, 512); gradient.addColorStop(0, '#172c50'); gradient.addColorStop(0.55, '#385b8e'); gradient.addColorStop(1, '#75617d'); c.fillStyle = gradient; c.fillRect(0, 0, 64, 512);
    }) });
    this.box(this.root, 0.3, 18, 40, -16, 5, 0, blue); this.box(this.root, 17, 0.15, 25, -10, -0.15, 1, this.material('#354963'));
    for (let i = 0; i < 8; i++) {
      const g = this.group(-12 - noise(i) * 2, 0, -10 + i * 3.4); g.rotation.y = Math.PI / 2;
      const h = 2.2 + noise(i + 50) * 2.2;
      const facade = this.material(i % 2 ? '#596178' : '#667080'); facade.emissive.set('#314362'); facade.emissiveIntensity = 0.6;
      this.box(g, 2.0, h, 1.5, 0, h / 2, 0, facade);
      const roof = this.mesh(g, new THREE.ConeGeometry(1.5, 1.2, 4), this.material('#2b3548'), 0, h + 0.6, 0); roof.rotation.y = Math.PI / 4;
      for (const x of [-0.52, 0.52]) for (let y = 0.8; y < h; y += 1.1) this.box(g, 0.32, 0.48, 0.02, x, y, 0.77, new THREE.MeshBasicMaterial({ color: i % 3 ? '#cb945f' : '#7288b2' }));
      for (const x of [-0.86, 0, 0.86]) this.box(g, 0.055, h, 0.04, x, h / 2, 0.78, this.material('#37465d'));
      for (const y of [0.22, 1.58]) if (y < h) this.box(g, 2, 0.06, 0.04, 0, y, 0.79, this.material('#37465d'));
    }
    const streetlamp = this.group(-7, 0, 1.3); this.cylinder(streetlamp, 0.04, 3.6, 0, 1.8, 0, this.iron); this.box(streetlamp, 0.22, 0.35, 0.22, 0, 3.58, 0, this.glow);
    const rainPoints = new Float32Array(240 * 6);
    for (let i = 0; i < 240; i++) { const x = -5.3 - noise(i) * 2.8, y = noise(i + 100) * 5.6, z = -1 + noise(i + 200) * 7; rainPoints.set([x, y, z, x - 0.025, y - 0.11, z], i * 6); }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(rainPoints, 3));
    const rain = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#abc6fa', transparent: true, opacity: 0.42 })); this.root.add(rain); return rain;
  }
  private batch(root: THREE.Group = this.root) {
    // Les trois objets interactifs gardent leur hiérarchie pour l'occultation et le focus.
    this.scene.updateMatrixWorld(true);
    const inverse = root.matrixWorld.clone().invert();
    const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>(), remove: THREE.Mesh[] = [];
    root.traverse(object => {
      if (!(object instanceof THREE.Mesh) || Array.isArray(object.material) || object.material.transparent) return;
      let parent: THREE.Object3D | null = object;
      while (parent && parent !== root) { if (parent.userData.action || parent.userData.dynamic) return; parent = parent.parent; }
      const bucket = buckets.get(object.material) ?? [];
      const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      bucket.push(geometry.applyMatrix4(inverse.clone().multiply(object.matrixWorld))); buckets.set(object.material, bucket); remove.push(object);
    });
    remove.forEach(object => object.removeFromParent());
    for (const [material, geometries] of buckets) {
      const geometry = mergeGeometries(geometries); geometries.forEach(g => g.dispose());
      if (!geometry) throw new Error('Géométrie de boutique incompatible.');
      const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh);
    }
  }
  reset() { this.journey.reset(); this.pointer = undefined; this.focus(); this.element.dataset.view = 'entrance'; }
  setPrivateAccess(allowed: boolean) { if (this.privateAccess !== allowed) this.focus(); this.privateAccess = allowed; }
  setActive(active: boolean, preferences: Preferences) {
    this.active = active; this.reduced = preferences.reducedMotion;
    if (this.quality !== preferences.quality) {
      this.quality = preferences.quality; this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.quality === 'low' ? 1 : 1.5));
      if (this.quality !== 'low' && !this.composer) {
        this.composer = new EffectComposer(this.renderer); this.composer.addPass(new RenderPass(this.scene, this.camera));
        const ao = new SSAOPass(this.scene, this.camera, 640, 360, 12); ao.kernelRadius = 0.12; ao.minDistance = 0.001; ao.maxDistance = 0.008; this.composer.addPass(ao);
        this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(640, 360), 0.012, 0.1, 3)); this.composer.addPass(new OutputPass());
      }
      this.composer?.setPixelRatio(this.renderer.getPixelRatio());
      this.renderer.shadowMap.enabled = this.quality !== 'low'; this.resize();
    }
    if (!active) { this.pointer = undefined; this.focus(); }
  }
  focusCanvas() { this.renderer.domElement.focus({ preventScroll: true }); }
  back() {
    if (this.journey.moving) return;
    if (this.view === 'entrance') { this.focus(); this.leave(); }
    else if (this.view === 'counter' || this.view === 'backroom' || this.view === 'discovery') this.go('entrance');
    else this.go(this.view === 'workshop' ? 'backroom' : 'workshop');
  }
  private go(view: AzurView, immediate = this.reduced) {
    if (!this.journey.go(view, this.privateAccess)) return;
    if (immediate) this.journey.advance(0, true);
    this.refreshPointer = true; this.focus(); this.element.dataset.view = view;
    const descriptions: Record<AzurView, string> = { entrance: 'Boutique d’Azur. Échap quitte la boutique.', counter: 'Comptoir d’Azur. Échap revient à l’entrée.', backroom: 'Réserve d’Azur. Appareils à réparer, pièces détachées et une radio. Échap retourne à la boutique.', discovery: 'L’étagère a dégagé un passage. Sélectionnez le passage pour entrer dans l’atelier.', workshop: 'Atelier caché d’Azur. MasterPlinko hors service au centre, prototypes sur les établis. Échap revient à la réserve.', machine: 'MasterPlinko cassé : capot ouvert, câbles débranchés et panneau démonté. Aucune mise en marche.', prototypes: 'Prototypes du Doigt mécanique et du Bac comptable. Objets d’essai, aucun achat ni déblocage.', duplicator: 'Duplicateur expérimental sous cloche. Prototype décoratif, aucune acquisition.' };
    this.announce(descriptions[view]);
  }
  private act(target: THREE.Object3D) {
    if (!this.active || this.progress < 1) return;
    if (target.userData.action === 'counter') this.go(this.view === 'counter' ? 'entrance' : 'counter');
    else if (target.userData.action === 'entrance') { this.focus(); this.leave(); }
    else if (target.userData.action === 'backroom') {
      if (this.journey.inPublic && !this.privateAccess) this.announce('Accès privé fermé. La réparation initiale doit être achetée dans le catalogue.');
      else this.go(this.journey.inPublic ? 'backroom' : 'entrance');
    } else if (target.userData.action === 'secret-switch') {
      if (!this.journey.secretOpen) this.go('discovery'); else this.announce('Le passage est déjà ouvert.');
    } else if (target.userData.action === 'enter-workshop') this.go('workshop');
    else if (target.userData.action === 'return-backroom') this.go('backroom');
    else if (target.userData.action === 'return-shop') this.go('entrance');
    else if (['machine', 'prototypes', 'duplicator'].includes(target.userData.action)) this.go(this.view === target.userData.action ? 'workshop' : target.userData.action as AzurView);
  }
  private focus(object?: THREE.Object3D) {
    this.renderer.domElement.style.cursor = object ? 'pointer' : 'default';
    if (object === this.focused) return;
    this.focused = object; this.hint.visible = this.highlight.visible = !!object;
    this.element.dataset.focusedAction = object?.userData.action ?? '';
    const label = object?.userData.action === this.view && ['machine', 'prototypes', 'duplicator'].includes(this.view) ? 'Reculer dans l’atelier' : object?.userData.action === 'counter' && this.view === 'counter' ? 'Revenir à l’entrée' : object?.userData.action === 'backroom' ? this.journey.inPublic ? this.privateAccess ? 'Entrer dans l’arrière-boutique' : 'Accès privé — réparation initiale requise' : 'Retourner dans la boutique' : object?.userData.label;
    this.renderer.domElement.setAttribute('aria-label', label ?? 'Boutique publique d’Azur');
    if (!object) return;
    this.announce(label);
    const m = this.hint.material as THREE.SpriteMaterial; m.map?.dispose();
    m.map = map(1024, 96, c => { c.fillStyle = '#25332bea'; c.fillRect(0, 0, 1024, 96); c.fillStyle = '#eddbb5'; c.font = '32px monospace'; c.textAlign = 'center'; c.fillText(label, 512, 59, 980); }); m.needsUpdate = true;
    this.hint.position.copy(object.userData.hint);
    const width = object.userData.action === 'entrance' ? 1.8 : Math.max(2.7, this.camera.position.distanceTo(this.hint.position) * 0.52);
    this.hint.scale.set(width, width * 96 / 1024, 1);
    this.highlight.box.setFromObject(object).expandByScalar(0.012);
  }
  private hit(x: number, y: number) {
    if (!this.active || this.progress < 1) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.scene.updateMatrixWorld(true);
    this.ray.setFromCamera(new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2), this.camera);
    const hit = this.ray.intersectObjects(this.targets.filter(object => this.allowed(object)), true)[0];
    if (!hit) return;
    let target: THREE.Object3D | null = hit.object;
    while (target && !target.userData.action) target = target.parent;
    if (!target || this.blocked(hit.distance, target)) return;
    return target;
  }
  private allowed(object: THREE.Object3D) {
    return object.userData.views.includes(this.view) && (object.userData.action !== 'enter-workshop' || this.journey.secretOpen);
  }
  private blocked(distance: number, target: THREE.Object3D) {
    return this.ray.intersectObjects(this.root.children.filter(child => child.visible), true).some(hit => {
      if (hit.distance >= distance - 0.015 || !(hit.object instanceof THREE.Mesh) || hit.object.material instanceof Array || hit.object.material.transparent) return false;
      let ancestor: THREE.Object3D | null = hit.object;
      while (ancestor) { if (ancestor === target) return false; ancestor = ancestor.parent; }
      return true;
    });
  }
  private keyboardTargets() {
    this.scene.updateMatrixWorld(true);
    return this.targets.filter(object => {
      if (!this.allowed(object)) return false;
      const center = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
      if (object.userData.action === 'entrance') center.set(-4.84, 2.1, 0.7);
      // Le haut de la porte reste visible derrière le comptoir.
      if (object.userData.action === 'backroom') center.y = 2.25;
      const projected = center.clone().project(this.camera);
      if (Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 || projected.z > 1) return false;
      this.ray.set(this.camera.position, center.clone().sub(this.camera.position).normalize());
      return !this.blocked(this.camera.position.distanceTo(center), object);
    });
  }
  private bind() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointermove', event => { this.pointer = { x: event.clientX, y: event.clientY }; this.refreshPointer = true; this.focus(this.hit(event.clientX, event.clientY)); });
    canvas.addEventListener('pointerleave', () => { this.pointer = undefined; this.focus(); });
    canvas.addEventListener('blur', () => { this.pointer = undefined; this.focus(); });
    canvas.addEventListener('click', event => { this.focusCanvas(); const target = this.hit(event.clientX, event.clientY); if (target) this.act(target); });
    canvas.addEventListener('keydown', event => {
      if (!this.active || document.hidden || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === 'Escape') { event.preventDefault(); this.back(); }
      else if (event.key === 'Tab') {
        event.preventDefault(); this.pointer = undefined; if (this.progress < 1) return;
        const targets = this.keyboardTargets(), i = targets.indexOf(this.focused!);
        const next = i < 0 ? (event.shiftKey ? targets.length - 1 : 0) : (i + (event.shiftKey ? -1 : 1) + targets.length) % targets.length;
        this.focus(targets[next]);
      } else if (event.key === 'Enter' || event.code === 'Space') { event.preventDefault(); if (this.focused) this.act(this.focused); }
    });
  }
  private resize() {
    const w = this.element.clientWidth || innerWidth, h = this.element.clientHeight || innerHeight;
    this.renderer.setSize(w, h); this.camera.aspect = w / h;
    this.composer?.setSize(w, h);
    // Le cadrage d'entrée garde le comptoir et les retours latéraux visibles à 1280×720.
    this.camera.fov = this.camera.aspect < 1.5 ? 68 : 58; this.camera.updateProjectionMatrix();
    this.refreshPointer = true;
  }
  frame(ms: number) {
    if (!this.active) return;
    this.journey.advance(ms, this.reduced);
    const pose = this.journey.pose;
    const fov = this.view === 'backroom' && pose.position.z < -5.2 ? 68 : this.camera.aspect < 1.5 ? 68 : 58;
    if (Math.abs(this.camera.fov - fov) > 0.01) { this.camera.fov = this.reduced ? fov : THREE.MathUtils.lerp(this.camera.fov, fov, Math.min(1, ms / 140)); this.camera.updateProjectionMatrix(); }
    this.camera.position.copy(pose.position); this.camera.lookAt(new THREE.Vector3().copy(pose.lookAt)); this.camera.updateMatrixWorld();
    if (this.publicKey) { this.publicKey.intensity = 0.9 * THREE.MathUtils.clamp((pose.position.z + 5.3) / 1.5, 0, 1); this.publicKey.visible = this.publicKey.intensity > 0; }
    this.doorLeaf.rotation.y = this.journey.door * Math.PI / 2;
    this.workshop.update(this.journey.shelf, this.journey.latch, this.journey.door > 0);
    this.element.dataset.secret = this.journey.secretOpen ? 'open' : 'closed';
    if (this.refreshPointer && this.progress === 1) {
      this.refreshPointer = false;
      if (this.pointer) this.focus(this.hit(this.pointer.x, this.pointer.y));
    }
    this.element.dataset.view = this.view; this.element.dataset.moving = String(this.progress < 1);
    if (!this.reduced) { this.rainTime = (this.rainTime + ms / 1000 * 1.2) % 5.6; this.rain.position.y = -this.rainTime; }
    if (this.composer && this.quality !== 'low') this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
