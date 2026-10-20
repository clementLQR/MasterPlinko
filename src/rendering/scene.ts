import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { CAVE, CONFIG, EXITS, MODULE_SLOTS, STAIR_LANDING, STAIRS, VIEWS, WORKBENCH } from '../config';
import type { CameraPose, Navigation, View } from '../navigation/camera';
import { DiegeticInterface } from './interfaces';
import { MagnetModule } from './magnets';
import { CollectorModule } from './collector';
import { CaveDecor, finishSurface, wovenRug } from './decor';
import type { InterfaceState } from './interfaces';
import type { Ball, GameState } from '../game/state';
import { BOARD, pathToExit, samplePath, pinPositions, contactStep } from './trajectory';
import type { Point } from './trajectory';

type Action = string;
const FLOOR = CAVE.floorY;
function noise(x: number, y: number) {
  const hash = (a: number, b: number) => { let n = Math.imul(a, 374761393) + Math.imul(b, 668265263); n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967295; };
  const ix = Math.floor(x), iy = Math.floor(y), u = x - ix, v = y - iy;
  const sx = u * u * (3 - 2 * u), sy = v * v * (3 - 2 * v);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix, iy), hash(ix + 1, iy), sx), THREE.MathUtils.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), sx), sy);
}
function texture(w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void, pixel = false) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h; paint(canvas.getContext('2d')!);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  if (pixel) { map.magFilter = THREE.NearestFilter; map.minFilter = THREE.NearestFilter; map.generateMipmaps = false; } else map.anisotropy = 4;
  return map;
}
function lettering(text: string, w: number, h: number, color = '#e8dec3', background = '#303b35') {
  const pixels = Math.max(128, Math.round(192 * w / h));
  const map = texture(pixels, 192, ctx => {
    ctx.fillStyle = background; ctx.fillRect(0, 0, pixels, 192); ctx.strokeStyle = '#bfa878'; ctx.lineWidth = 3; ctx.strokeRect(7, 7, pixels - 14, 178);
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 110px monospace';
    ctx.font = `bold ${Math.floor(Math.min(125, 110 * (pixels - 25) / ctx.measureText(text).width))}px monospace`; ctx.fillText(text, pixels / 2, 102, pixels - 20);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map }));
}
function pixelScreen() {
  return texture(96, 40, ctx => {
    ctx.fillStyle = '#142f2a'; ctx.fillRect(0, 0, 96, 40); ctx.fillStyle = '#a5e0ac';
    const cat = ['100000001', '110000011', '111111111', '111111111', '110111011', '111101111', '011111110'];
    for (let y = 0; y < cat.length; y++) for (let x = 0; x < cat[y].length; x++) if (cat[y][x] === '1') ctx.fillRect(32 + x * 3, 7 + y * 3, 3, 3);
    for (const x of [8, 18, 72, 84]) for (let row = 0; row < 5; row++) ctx.fillRect(x - row, 23 + row * 2, row * 2 + 1, 2);
    ctx.strokeStyle = '#e2c873'; ctx.lineWidth = 2; ctx.strokeRect(78, 4, 5, 7);
    ctx.fillStyle = '#14342b44'; for (let y = 0; y < 40; y += 2) ctx.fillRect(0, y, 96, 1);
  }, true);
}

/** Géométrie réelle et matériaux procéduraux ; aucune image de fond. */
export class PlinkoScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private composer!: EffectComposer;
  private camera = new THREE.PerspectiveCamera(39, 1, 0.1, 160);
  private machine = new THREE.Group();
  private workbench = new THREE.Group();
  private flights = new Map<string, { mesh: THREE.Mesh; points: Point[]; elapsed: number }>();
  private ballGeometry = new THREE.SphereGeometry(BOARD.ballRadius, 20, 14);
  private silver = new THREE.MeshStandardMaterial({ color: '#e3e7df', metalness: 0.9, roughness: 0.17 });
  private autoMaterial = new THREE.MeshStandardMaterial({ color: '#b2d7bc', metalness: 0.75, roughness: 0.22 });
  private bonusMaterial = new THREE.MeshStandardMaterial({ color: '#ffdd8e', metalness: 0.7, roughness: 0.2, emissive: '#c87928', emissiveIntensity: 0.45 });
  private modules = new Map<string, THREE.Group>();
  private magnets!: MagnetModule;
  private collector!: CollectorModule;
  private collectorMaterial = new THREE.MeshStandardMaterial({ color: '#c4aed4', metalness: 0.65, roughness: 0.25 });
  private indicator!: THREE.Mesh;
  private lamps: THREE.Mesh[] = [];
  private exitLabels: THREE.Mesh[] = [];
  private exitBacks: THREE.Mesh[] = [];
  private exitPulse = new Float32Array(15);
  private quality = '';
  private observer: ResizeObserver;
  private raycaster = new THREE.Raycaster();
  private clickTargets: THREE.Object3D[] = [];
  private interfaces!: DiegeticInterface;
  private interactionEnabled = true;
  private travelCamera?: CameraPose;
  private ui: InterfaceState = { canWrite: false, autoEnabled: false, message: '', historyPage: 0 };
  private currentState?: GameState;
  private focused?: THREE.Object3D;
  private hint = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.Texture(), transparent: true, depthTest: true, depthWrite: false }));
  /** `none` : rendu immédiat (fixtures) ; `waiting`/`compiling` : aucune image avant shaders prêts. */
  private gate: 'none' | 'waiting' | 'compiling' | 'ready' = 'none';
  private highlight = new THREE.Box3Helper(new THREE.Box3(), '#e0d3a0');
  private hintText = '';
  private geometries = new Map<string, THREE.BufferGeometry>();
  private counter!: THREE.CanvasTexture;
  private wallet = -1;
  private environmentTime = 0;
  private rain!: THREE.LineSegments;
  private rainOrigins: number[] = [];
  private wood: THREE.MeshStandardMaterial;
  private darkWood: THREE.MeshStandardMaterial;
  private stairMaterial: THREE.MeshStandardMaterial;
  private cream = new THREE.MeshStandardMaterial({ color: '#ead7b0', roughness: 0.67 });
  private sage = new THREE.MeshStandardMaterial({ color: '#91ac91', metalness: 0.2, roughness: 0.58 });
  private pink = new THREE.MeshStandardMaterial({ color: '#c9968f', roughness: 0.64 });
  private lavender = new THREE.MeshStandardMaterial({ color: '#aaa0bf', roughness: 0.64 });
  private iron = new THREE.MeshStandardMaterial({ color: '#35413b', metalness: 0.64, roughness: 0.48 });
  private brass = new THREE.MeshStandardMaterial({ color: '#b99b69', metalness: 0.7, roughness: 0.38 });

  constructor(private element: HTMLElement, private navigation: Navigation, onAction: (action: Action) => void, private onContact: (variant: number) => void = () => {}, deferRender = false) {
    if (deferRender) this.gate = 'waiting';
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); this.renderer.setClearColor('#211c1b');
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false; this.renderer.shadowMap.needsUpdate = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15;
    // Reflets doux générés localement ; une petite carte évite de rendre une seconde scène.
    const environment = texture(512, 256, c => {
      c.fillStyle = '#645443'; c.fillRect(0, 0, 512, 256);
      const glow = c.createLinearGradient(0, 0, 0, 256); glow.addColorStop(0, '#b2a18a'); glow.addColorStop(0.6, '#4c4339'); glow.addColorStop(1, '#211f1c'); c.fillStyle = glow; c.fillRect(0, 0, 512, 256);
      c.fillStyle = '#d7e7ff'; c.fillRect(320, 55, 80, 60); c.fillStyle = '#ffdfab'; c.fillRect(100, 35, 45, 80);
    });
    const pmrem = new THREE.PMREMGenerator(this.renderer); this.scene.environment = pmrem.fromEquirectangular(environment).texture;
    this.scene.environmentIntensity = 0.18; this.silver.envMapIntensity = 3; environment.dispose(); pmrem.dispose();
    this.renderer.domElement.setAttribute('aria-label', 'Cave de Papy en 3D : Plinko crème et pastel, escalier en bois à gauche, établi et fenêtre pluvieuse à droite.');
    this.renderer.domElement.setAttribute('role', 'application'); this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute('aria-describedby', 'keyboard-help'); element.append(this.renderer.domElement);
    this.scene.background = new THREE.Color('#211c1b'); this.scene.fog = new THREE.FogExp2('#302620', 0.009);
    this.scene.add(new THREE.HemisphereLight('#a7b4d3', '#44301e', 0.27));
    const key = new THREE.DirectionalLight('#ffdfb1', 0.65); key.position.set(-3, 8, 14); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.normalBias = 0.025; key.shadow.bias = -0.0001;
    Object.assign(key.shadow.camera, { left: -20, right: 21, top: 14, bottom: -13, near: 0.1, far: 70 });
    key.target.position.set(0, -1, 0); this.scene.add(key, key.target);
    const blue = new THREE.PointLight('#578cff', 65, 28); blue.position.set(10, 6, 0.3); this.scene.add(blue);
    const warm = new THREE.PointLight('#ffad55', 115, 32); warm.position.set(3.2, 6.6, 3.1); this.scene.add(warm);
    const woodMap = texture(512, 512, ctx => {
      const pixels = ctx.createImageData(512, 512);
      for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
        const warp = x + Math.sin(y * 0.018 + x * 0.01) * 5 + Math.sin(y * 0.047) * 1.3;
        const grain = Math.sin(warp * 0.32) * 4 + Math.sin(warp * 2.1) * 1.8 + (noise(x * 0.05, y * 0.008) - 0.5) * 42;
        const fleck = (noise(x, y) - 0.5) * 3;
        const at = (y * 512 + x) * 4;
        pixels.data.set([205 + grain + fleck, 164 + grain + fleck, 113 + grain * 0.8, 255], at);
      }
      ctx.putImageData(pixels, 0, 0);
      for (const [x, y] of [[94, 170], [361, 390]]) for (let ring = 1; ring < 9; ring++) {
        ctx.strokeStyle = `rgba(93,60,32,${0.19 - ring * 0.015})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(x, y, 2 + ring * 1.8, 4 + ring * 5.5, 0.06, 0, Math.PI * 2); ctx.stroke();
      }
    });
    this.wood = new THREE.MeshStandardMaterial({ map: woodMap, bumpMap: woodMap, bumpScale: 0.035, color: '#fff0d3', roughness: 0.69 });
    this.darkWood = new THREE.MeshStandardMaterial({ map: woodMap, bumpMap: woodMap, bumpScale: 0.09, color: '#796044', roughness: 0.88 });
    this.stairMaterial = this.darkWood.clone(); this.stairMaterial.emissive.set('#dfb66b'); this.stairMaterial.emissiveIntensity = 0;
    finishSurface('bois', [this.wood, this.darkWood, this.stairMaterial]);
    this.machine.name = 'machine:base'; this.machine.rotation.x = -0.065; this.scene.add(this.machine);
    const benchFrame = new THREE.Group(); benchFrame.name = 'cave:workbench';
    benchFrame.position.set(WORKBENCH.x, 0, WORKBENCH.z); benchFrame.rotation.y = WORKBENCH.yaw;
    this.workbench.position.set(-WORKBENCH.originX, 0, -WORKBENCH.originZ); benchFrame.add(this.workbench); this.scene.add(benchFrame);
    this.buildRoom(); this.buildMachine(); this.buildModules(); this.buildBench(); this.buildStairs();
    new CaveDecor(this.scene, this.wood, this.darkWood, this.workbench);
    this.interfaces = new DiegeticInterface(this.scene, this.machine, this.modules, (object, action, label, views) => this.register(object, action, label, views));
    this.target('plinko', this.machine, 0, 0, -0.2, 11.7, 14.4, () => 'Revenir à la machine', ['azur', 'commandes']);
    this.hint.visible = false; this.highlight.visible = false;
    (this.highlight.material as THREE.LineBasicMaterial).transparent = true; (this.highlight.material as THREE.LineBasicMaterial).opacity = 0.38;
    this.scene.add(this.hint, this.highlight);
    for (const material of [this.silver, this.autoMaterial, this.bonusMaterial, this.collectorMaterial]) {
      const ball = new THREE.Mesh(this.ballGeometry, material); ball.visible = false; this.machine.add(ball);
    }
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const ao = new SSAOPass(this.scene, this.camera, 640, 360, 12); ao.kernelRadius = 0.8; ao.minDistance = 0.0008; ao.maxDistance = 0.026;
    this.composer.addPass(ao);
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(640, 360), 0.12, 0.28, 1.8));
    this.composer.addPass(new OutputPass());
    this.bindPointer(onAction); this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(element); this.resize();
  }
  private box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material, radius = 0.08) {
    const horizontalGrain = w > h && (material === this.wood || material === this.darkWood || material === this.stairMaterial);
    const key = `${w}/${h}/${d}/${radius}/${horizontalGrain}`; let geometry = this.geometries.get(key);
    if (!geometry) { geometry = radius > 0 ? new RoundedBoxGeometry(w, h, d, 1, Math.min(radius, w / 3, h / 3, d / 3)) : new THREE.BoxGeometry(w, h, d); if (horizontalGrain) { const uv = geometry.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i)); } this.geometries.set(key, geometry); }
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  private cylinder(parent: THREE.Object3D, radius: number, height: number, x: number, y: number, z: number, material: THREE.Material, axis: 'x' | 'y' | 'z' = 'y') {
    const key = `c/${radius}/${height}`; let geometry = this.geometries.get(key);
    if (!geometry) { geometry = new THREE.CylinderGeometry(radius, radius, height, 12); this.geometries.set(key, geometry); }
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z);
    if (axis === 'z') mesh.rotation.x = Math.PI / 2; if (axis === 'x') mesh.rotation.z = Math.PI / 2;
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  private rod(parent: THREE.Object3D, a: number[], b: number[], radius: number, material: THREE.Material) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b); const mesh = this.cylinder(parent, radius, start.distanceTo(end), 0, 0, 0, material);
    mesh.position.copy(start.add(end).multiplyScalar(0.5)); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize()); return mesh;
  }
  private screen(parent: THREE.Object3D, x: number, y: number, z: number, width: number, height: number) {
    this.box(parent, width + 0.15, height + 0.15, 0.15, x, y, z - 0.05, this.iron, 0.12); const map = pixelScreen();
    const face = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map, toneMapped: false })); face.position.set(x, y, z + 0.04); parent.add(face);
  }
  private contactShade(parent: THREE.Object3D, width: number, height: number, x: number, y: number, z: number, floor = false, opacity = 0.5) {
    const map = texture(64, 64, c => {
      const gradient = c.createRadialGradient(32, 32, 5, 32, 32, 32);
      gradient.addColorStop(0, '#1c120def'); gradient.addColorStop(0.5, '#1c120d80'); gradient.addColorStop(1, '#1c120d00');
      c.fillStyle = gradient; c.fillRect(0, 0, 64, 64);
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map, transparent: true, opacity, depthWrite: false }));
    mesh.position.set(x, y, z); if (floor) mesh.rotation.x = -Math.PI / 2; parent.add(mesh);
    return mesh;
  }
  private buildMachine() {
    const root = this.machine;
    this.box(root, 11.7, 13.8, 1.1, 0, -0.15, -0.7, this.wood, 0.32);
    // La surface de jeu reste lisible même lorsque les poutres ou modules projettent des ombres.
    this.box(root, 10.65, 9.8, 0.19, 0, 0.35, -0.1, this.cream, 0.18).receiveShadow = false;
    for (const x of [-5.5, 5.5]) this.box(root, 0.5, 13, 1.2, x, -0.1, -0.06, this.wood, 0.22);
    this.box(root, 11.5, 1.5, 1.1, 0, 5.95, -0.12, this.wood, 0.27); this.screen(root, 0, 6.02, 0.48, 3.6, 1.05);
    // La traverse laisse une vraie ouverture sous le distributeur central.
    for (const x of [-2.875, 2.875]) this.box(root, 4.95, 0.2, 0.4, x, 5.13, 0.28, this.darkWood);
    const led = new THREE.MeshStandardMaterial({ color: '#fff0b8', emissive: '#ffce7b', emissiveIntensity: 2 });
    for (let i = 0; i < 8; i++) this.box(root, 0.55, 0.08, 0.2, -4.4 + i * 1.25, 5.0, 0.45, led, 0.025);
    // Les guides, l'entrée et les picots partagent le repère des trajectoires.
    for (const x of [-BOARD.halfWidth, BOARD.halfWidth]) {
      this.box(root, 0.13, 9.45, 0.85, x, 0.23, 0.3, this.wood, 0.045);
      this.box(root, 0.035, 9.25, 0.06, x, 0.23, 0.75, this.brass, 0.015);
    }
    this.box(root, 0.64, 0.17, 0.55, 0, 5.36, 0.31, this.iron, 0.06);
    for (const x of [-0.24, 0.24]) this.box(root, 0.08, 0.3, 0.46, x, 5.18, 0.35, this.brass, 0.03);
    const positions = pinPositions();
    const pins = new THREE.InstancedMesh(new THREE.CylinderGeometry(BOARD.pinRadius, BOARD.pinRadius, 0.48, 12), this.silver, positions.length);
    const collars = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.108, 0.108, 0.035, 12), this.brass, positions.length);
    const shadowMap = texture(32, 32, c => {
      const gradient = c.createRadialGradient(16, 16, 2, 16, 16, 16); gradient.addColorStop(0, '#49311dcc'); gradient.addColorStop(1, '#49311d00'); c.fillStyle = gradient; c.fillRect(0, 0, 32, 32);
    });
    const pinShadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.38, 0.32), new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, opacity: 0.6 }), positions.length);
    const dummy = new THREE.Object3D();
    positions.forEach((point, index) => {
      dummy.position.set(point.x, point.y, 0.25); dummy.rotation.set(Math.PI / 2, 0, 0); dummy.updateMatrix(); pins.setMatrixAt(index, dummy.matrix);
      dummy.position.z = 0.025; dummy.updateMatrix(); collars.setMatrixAt(index, dummy.matrix);
      dummy.position.set(point.x + 0.035, point.y - 0.045, 0.004); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); pinShadows.setMatrixAt(index, dummy.matrix);
    });
    root.add(collars, pinShadows);
    pins.castShadow = true; pins.name = 'machine:pins'; root.add(pins);
    const pastels = [this.pink, this.lavender, this.sage, this.sage, this.lavender, this.pink];
    for (let i = 0; i < 15; i++) {
      const x = (i - 7) * BOARD.spacingX;
      const backMaterial = (pastels[i % pastels.length] as THREE.MeshStandardMaterial).clone();
      backMaterial.emissive.set('#ffcb77');
      const back = this.box(root, 0.62, 0.91, 0.12, x, -4.23, 0.05, backMaterial, 0.07); this.exitBacks.push(back);
      this.box(root, 0.045, 0.91, 0.85, x + 0.33, -4.235, 0.44, this.cream, 0.02);
      const plate = lettering(`×${(EXITS[i] / 100).toLocaleString('fr-FR')}`, 0.61, 0.43, '#fff2cf', '#34463b'); plate.position.set(x, -4.5, 0.9); plate.name = `machine:exit:${i}`; root.add(plate); this.exitLabels.push(plate);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffe6ad', emissive: '#e4ac4f', emissiveIntensity: 0.35 })); lamp.position.set(x, -4.83, 0.64); root.add(lamp); this.lamps.push(lamp);
    }
    this.box(root, 0.045, 0.91, 0.85, -4.95, -4.235, 0.44, this.cream, 0.02);
    this.box(root, 10.7, 0.13, 1.1, 0, -4.7, 0.3, this.wood);
    this.box(root, 11.4, 2, 1.5, 0, -5.87, 0.13, this.wood, 0.23); this.box(root, 10.8, 1.65, 0.18, 0, -5.75, 0.95, this.cream, 0.15);
    this.box(root, 11.7, 0.55, 1.5, 0, -7.0, 0, this.wood, 0.19);
    for (const x of [-4.55, 4.55]) this.box(root, 0.8, 0.45, 1.4, x, -7.45, 0, this.darkWood);
    const button = this.cylinder(root, 0.73, 0.28, -3.45, -5.73, 1.16, this.sage, 'z'); this.register(button, 'launch', () => `Lancer — mise : ${((this.currentState?.selectedBetCents ?? 100) / 100).toLocaleString('fr-FR')} pièce(s)${this.launchCondition()}`, ['plinko', 'commandes']); button.name = 'machine:play-button';
    const arrow = new THREE.Shape(); arrow.moveTo(-0.2, -0.32); arrow.lineTo(0.31, 0); arrow.lineTo(-0.2, 0.32); arrow.closePath();
    const triangle = new THREE.Mesh(new THREE.ExtrudeGeometry(arrow, { depth: 0.035, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.02, bevelThickness: 0.02 }), this.cream); triangle.position.set(-3.45, -5.73, 1.32); root.add(triangle);
    triangle.userData.control = button;
    this.counter = texture(256, 80, () => {}, true); this.box(root, 3.3, 1.06, 0.26, 2.35, -5.75, 1.05, this.iron, 0.12);
    const counter = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.78), new THREE.MeshBasicMaterial({ map: this.counter })); counter.position.set(2.35, -5.75, 1.2); root.add(counter);
    this.register(counter, 'commandes', () => 'Solde en pièces — rapprocher les afficheurs', ['plinko']);
    this.indicator = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshStandardMaterial({ color: '#a3cfac', emissive: '#7ca778', emissiveIntensity: 0.4 })); this.indicator.position.set(4.8, 6.06, 0.54); root.add(this.indicator);
    for (const x of [-5.5, 5.5]) for (const y of [-6.7, -4.7, 1.2, 5.9]) this.cylinder(root, 0.078, 0.08, x, y, 0.58, this.brass, 'z');
    for (const x of [-5.85, 5.85]) for (const y of [-3.5, 3.6]) this.box(root, 0.13, 0.55, 0.3, x, y, -0.2, this.sage, 0.04);
    // Assemblages, traces de ponçage et vis fendues, sans objets décoratifs dans le plateau.
    for (const x of [-5.5, 5.5]) for (const y of [-6.7, -4.7, 1.2, 5.9]) {
      this.box(root, 0.09, 0.018, 0.012, x, y, 0.63, this.iron, 0.003);
    }
    for (const y of [-7.12, 6.5]) this.box(root, 10.55, 0.025, 0.02, 0, y, y > 0 ? 0.45 : 0.78, this.darkWood, 0.006);
    this.contactShade(this.scene, 14, 3, 0, FLOOR + 0.09, 0.3, true, 0.8);
    this.contactShade(this.scene, 14, 16, 0, -0.2, -1.47, false, 0.75);
  }
  private buildModules() {
    for (const slot of MODULE_SLOTS) {
      const group = new THREE.Group(); group.name = `module:${slot.id}`; group.position.set(slot.position[0], slot.position[1], slot.position[2]); group.visible = false; this.machine.add(group); this.modules.set(slot.id, group);
      if (slot.id === 'magnets') {
        this.magnets = new MagnetModule(group, this.register.bind(this));
      } else if (slot.id === 'collector') {
        this.collector = new CollectorModule(group, this.register.bind(this));
      } else if (slot.id === 'auto_launcher') {
        this.box(group, 1.45, 2, 1.2, 0, 0, 0.1, this.cream, 0.25); this.screen(group, 0, 0.25, 0.76, 0.94, 0.56);
        this.cylinder(group, 0.5, 2.4, 0, 2.13, 0.1, new THREE.MeshStandardMaterial({ color: '#bcdde1', transparent: true, opacity: 0.22, roughness: 0.2, depthWrite: false }));
        for (const y of [0.95, 3.35]) this.cylinder(group, 0.58, 0.14, 0, y, 0.1, this.wood);
        for (let i = 0; i < 7; i++) { const ball = new THREE.Mesh(this.ballGeometry, this.silver); ball.scale.setScalar(1.7); ball.position.set((i % 2 - 0.5) * 0.23, 1.2 + i * 0.27, 0.15); group.add(ball); }
        this.rod(group, [0, -0.6, 0.8], [0.4, -1.35, 1.1], 0.15, this.sage); this.rod(group, [0.4, -1.35, 1.1], [1.15, -1.5, 1.05], 0.1, this.brass);
        this.rod(group, [-0.5, -0.7, -0.4], [-0.7, -3.3, -0.45], 0.1, this.sage);
      } else if (slot.id === 'accounting_tray') {
        this.box(group, 1.5, 1.85, 1.15, 0, 0, 0, this.pink, 0.24); this.screen(group, 0, 0.36, 0.62, 1, 0.52);
        this.box(group, 1.08, 0.12, 0.1, 0, -0.42, 0.65, this.iron);
        const receipt = lettering('TICKET', 0.86, 1.2, '#665643', '#e7dbbd'); receipt.position.set(0, -1.0, 0.72); receipt.rotation.x = -0.15; group.add(receipt);
        for (const x of [-0.4, 0, 0.4]) this.cylinder(group, 0.11, 0.07, x, -0.09, 0.65, this.cream, 'z'); this.target('historique', group, 0, 0, 0.85, 1.5, 2.5, () => 'Consulter les gains — ticket du Bac comptable', ['plinko', 'commandes']);
      } else if (slot.id === 'duplicator') {
        this.box(group, 6.2, 1.2, 0.9, 0, 0, 0, this.cream, 0.16);
        const chamber = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 0.5), new THREE.MeshStandardMaterial({ color: '#b5e1d0', transparent: true, opacity: 0.4 })); chamber.position.z = 0.55; group.add(chamber);
        for (const x of [-2.15, 2.15]) this.cylinder(group, 0.5, 0.35, x, -0.15, 0.55, this.brass, 'z');
      } else if (slot.id === 'instability_counter') {
        this.box(group, 1.6, 2.1, 1, 0, 0, 0, this.cream, 0.25); this.screen(group, 0, 0.36, 0.56, 1.15, 0.7);
        for (const [i, material] of [this.sage, this.brass, this.pink].entries()) this.cylinder(group, 0.14, 0.07, (i - 1) * 0.43, -0.5, 0.58, material, 'z');
      } else {
        this.box(group, 2.4, 1.7, 1.7, 0, 0, 0, this.cream, 0.27); this.cylinder(group, 0.64, 0.1, 0, 0, 0.9, this.iron, 'z');
        for (let i = 0; i < 6; i++) { const angle = i * Math.PI / 3; this.rod(group, [0, 0, 0.98], [Math.cos(angle) * 0.62, Math.sin(angle) * 0.62, 0.98], 0.035, this.brass); }
      }
    }
  }
  private buildRoom() {
    const mortar = new THREE.MeshStandardMaterial({ color: '#55473b', roughness: 1 });
    const stoneMap = texture(512, 512, ctx => {
      const data = ctx.createImageData(512, 512);
      for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
        const cloud = (noise(x / 64, y / 64) - 0.5) * 38 + (noise(x / 17, y / 17) - 0.5) * 19;
        const v = 160 + cloud + (noise(x, y) - 0.5) * 32;
        data.data.set([v + 8, v, v - 12, 255], (y * 512 + x) * 4);
      }
      ctx.putImageData(data, 0, 0);
    });
    const stoneMaterial = new THREE.MeshStandardMaterial({ map: stoneMap, bumpMap: stoneMap, bumpScale: 0.16, roughness: 0.98 });
    finishSurface('pierre', [stoneMaterial]);
    // Ouvertures réelles de la fenêtre et du palier supérieur de l’escalier.
    this.box(this.scene, 3.4, 17.5, 1, -23.3, 0.6, -2.65, mortar);
    this.box(this.scene, 22.6, 17.5, 1, -5.1, 0.6, -2.65, mortar);
    this.box(this.scene, 5.2, 14.35, 1, STAIRS.x, -0.525, -2.65, mortar);
    this.box(this.scene, 3.3, 17.5, 1, 17.35, 0.6, -2.65, mortar);
    this.box(this.scene, 9.4, 12, 1, 10.9, -1.8, -2.65, mortar);
    this.box(this.scene, 9.4, 1.7, 1, 10.9, 8.7, -2.65, mortar);
    const stones: THREE.Matrix4[] = [], colors: THREE.Color[] = []; const dummy = new THREE.Object3D();
    for (let row = 0; row < 21; row++) {
      let edge = -26 - (row % 3) * 0.61, col = 0;
      while (edge < 19) {
        const seed = row * 31 + col++ * 7;
        const width = 0.72 + (Math.sin(seed * 6.7) + 1) * 0.53;
        const x = edge + width / 2, y = -7.35 + row * 0.84 + Math.sin(seed * 3.1) * 0.13;
        edge += width - 0.02;
        if (x + width / 2 > 6 && x - width / 2 < 15.7 && y > 3.5 && y < 8.2) continue;
        if (x + width / 2 > STAIRS.x - 2.6 && x - width / 2 < STAIRS.x + 2.6 && y + 0.7 > 6.65) continue;
        dummy.position.set(x, y, -2.02 + Math.sin(seed) * 0.18);
        dummy.rotation.set(Math.sin(seed) * 0.12, Math.cos(seed) * 0.15, Math.sin(seed * 2) * 0.12);
        dummy.scale.set(width, 0.81 + Math.cos(seed) * 0.14, 0.68 + Math.sin(seed * 4) * 0.2); dummy.updateMatrix(); stones.push(dummy.matrix.clone());
        colors.push(new THREE.Color(seed % 5 ? '#a28d78' : '#818a8b').multiplyScalar(0.8 + (Math.sin(seed * 1.8) + 1) * 0.13));
      }
    }
    const stoneBase = new RoundedBoxGeometry(1, 1, 1, 3, 0.11);
    const vertices = stoneBase.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
      vertices.setXYZ(i, x + Math.sin(y * 11 + z * 7) * 0.075, y + Math.sin(x * 9 + z * 4) * 0.075, z + Math.sin(x * 12 + y * 6) * 0.085);
    }
    stoneBase.deleteAttribute('normal');
    const stoneGeometry = mergeVertices(stoneBase); stoneGeometry.computeVertexNormals(); stoneBase.dispose();
    const stoneMesh = new THREE.InstancedMesh(stoneGeometry, stoneMaterial, stones.length);
    stones.forEach((matrix, i) => { stoneMesh.setMatrixAt(i, matrix); stoneMesh.setColorAt(i, colors[i]); }); stoneMesh.castShadow = true; stoneMesh.receiveShadow = true; stoneMesh.name = 'cave:stone-wall'; this.scene.add(stoneMesh);
    // Le retour du mur ferme réellement la pièce, notamment dans le cadrage de l’établi.
    const roomEnd = CAVE.rearZ + 0.6, sideDepth = roomEnd + 3.1, sideColumns = Math.ceil(sideDepth / 2.5);
    this.box(this.scene, 0.7, 17.5, sideDepth, 19.15, 0.6, (roomEnd - 3.1) / 2, mortar);
    const returnWall = new THREE.InstancedMesh(stoneGeometry, stoneMaterial, 16 * sideColumns);
    let sideIndex = 0;
    for (let row = 0; row < 16; row++) for (let col = 0; col < sideColumns; col++) {
      const seed = row * sideColumns + col;
      dummy.position.set(18.82 + Math.sin(seed) * 0.07, -7.2 + row * 1.07 + Math.sin(seed * 4) * 0.08, -1.4 + col * 2.5 + row % 2 * 0.6 + Math.cos(seed * 2) * 0.12);
      dummy.rotation.set(Math.cos(seed) * 0.04, Math.PI / 2 + Math.sin(seed) * 0.06, Math.sin(seed) * 0.06); dummy.scale.set(2.3 + Math.cos(seed * 3) * 0.22, 0.87 + Math.sin(seed) * 0.15, 0.58); dummy.updateMatrix();
      returnWall.setMatrixAt(sideIndex, dummy.matrix); returnWall.setColorAt(sideIndex++, colors[seed % colors.length]);
    }
    returnWall.castShadow = true; returnWall.receiveShadow = true; returnWall.name = 'cave:return-wall'; this.scene.add(returnWall);
    this.box(this.scene, 0.7, 17.5, sideDepth, -25.1, 0.6, (roomEnd - 3.1) / 2, mortar);
    const leftWall = returnWall.clone(); leftWall.position.x = -43.6; this.scene.add(leftWall);
    // Le mur opposé possède une vraie baie, avec les mêmes pierres que le reste de la cave.
    for (const [x, width] of [[-21.1, 8], [6.9, 24.4]]) this.box(this.scene, width, 17.5, 0.8, x, 0.6, CAVE.rearZ, mortar);
    this.box(this.scene, 11.8, 8.7, 0.8, -11.2, FLOOR + 4.35, CAVE.rearZ, mortar);
    this.box(this.scene, 11.8, 2.25, 0.8, -11.2, 8.325, CAVE.rearZ, mortar);
    const rearMatrices: THREE.Matrix4[] = [];
    for (let row = 0; row < 17; row++) for (let col = 0; col < 26; col++) {
      const seed = row * 26 + col, x = -24.5 + col * 1.7 + row % 2 * 0.7, y = -7.1 + row * 0.98;
      if (x > -18 && x < -4.5 && y > 0.55 && y < 7.6) continue;
      dummy.position.set(x, y, CAVE.rearZ - 0.42 + Math.sin(seed) * 0.08);
      dummy.rotation.set(Math.sin(seed) * 0.07, 0, Math.cos(seed) * 0.07); dummy.scale.set(1.58, 0.91, 0.6); dummy.updateMatrix(); rearMatrices.push(dummy.matrix.clone());
    }
    const rearWall = new THREE.InstancedMesh(stoneGeometry, stoneMaterial, rearMatrices.length);
    rearMatrices.forEach((matrix, i) => { rearWall.setMatrixAt(i, matrix); rearWall.setColorAt(i, colors[i % colors.length]); });
    rearWall.castShadow = true; rearWall.receiveShadow = true; rearWall.name = 'cave:rear-wall'; this.scene.add(rearWall);
    const floor = this.box(this.scene, 49, 0.25, roomEnd + 9, -3, FLOOR - 0.2, (roomEnd - 9) / 2, mortar); floor.name = 'cave:floor';
    const tileRows = Math.ceil((roomEnd + 2) / 0.95);
    const tiles = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 1, 1, 2, 0.11), stoneMaterial, tileRows * 36); let index = 0;
    for (let row = 0; row < tileRows; row++) for (let col = 0; col < 36; col++) {
      const seed = row * 36 + col; dummy.position.set(-25 + col * 1.25 + row % 2 * 0.38, FLOOR - 0.02, -1 + row * 0.95); dummy.scale.set(1.18, 0.12, 0.88); dummy.rotation.set(0, Math.sin(seed) * 0.04, 0); dummy.updateMatrix(); tiles.setMatrixAt(index, dummy.matrix);
      tiles.setColorAt(index++, new THREE.Color('#685746').multiplyScalar(0.78 + (Math.sin(seed * 4) + 1) * 0.1));
    }
    tiles.receiveShadow = true; tiles.name = 'cave:old-paving'; this.scene.add(tiles);
    // Trémie réelle au-dessus de l’escalier : le regard ne rencontre pas un plafond fermé.
    for (let i = 0; i < 30; i++) {
      const x = -24.5 + i * 1.5, opening = x > STAIRS.x - 3 && x < STAIRS.x + 3;
      const start = opening ? 4.6 : -3.2;
      this.box(this.scene, 1.5, 0.2, roomEnd - start, x, 9.45, (roomEnd + start) / 2, this.darkWood);
    }
    // Poutres d’un mur à l’autre (x = -24,75 → 18,5) ; au-dessus de la cage d’escalier,
    // elles s’arrêtent contre le coffrage (x = -21,71 et -16,29) sans traverser le puits.
    const wallLeft = -24.75, wallRight = 18.5, shaftLeft = STAIRS.x - 2.71, shaftRight = STAIRS.x + 2.71;
    for (const z of [-1.5, 4.5, 10.5, 16.5, 22.5, 28.5, 34.5, 40.5, 46.5]) {
      if (z < 6) {
        this.box(this.scene, shaftLeft - wallLeft, 0.65, 0.6, (wallLeft + shaftLeft) / 2, 9, z, this.darkWood);
        this.box(this.scene, wallRight - shaftRight, 0.65, 0.6, (shaftRight + wallRight) / 2, 9, z, this.darkWood);
      } else this.box(this.scene, wallRight - wallLeft, 0.65, 0.6, (wallLeft + wallRight) / 2, 9.0, z, this.darkWood, 0.16);
    }
    for (const x of [-14, -5.5, 7, 17]) this.box(this.scene, 0.7, 0.85, roomEnd + 3.75, x, 8.8, (roomEnd - 3.75) / 2, this.darkWood, 0.16);
    this.buildWindow(); this.buildPendant();
    const rug = this.box(this.scene, 21, 0.07, 12.5, 0.4, FLOOR + 0.1, 8.3, wovenRug(), 0.03); rug.rotation.y = -0.025; rug.name = 'cave:worn-rug';
    for (let i = 0; i < 70; i++) for (const z of [1.95, 14.65]) this.box(this.scene, 0.025, 0.025, 0.24 + i % 3 * 0.07, -9.8 + i * 0.3, FLOOR + 0.11, z, this.cream, 0.005);
    for (const [x, y, z, width] of [[-7.3, -6.8, -0.4, 1.6]]) {
      this.box(this.scene, width, 1.4, 2.1, x, y, z, this.darkWood, 0.14);
      for (const offset of [-0.48, 0.48]) this.box(this.scene, 0.12, 1.35, 2.16, x + offset * width, y, z, this.iron, 0.025);
      this.box(this.scene, 0.6, 0.12, 0.1, x, y, z + 1.1, this.brass);
    }
    const dust = new Float32Array(55 * 3); for (let i = 0; i < 55; i++) { dust[i * 3] = Math.sin(i * 41) * 14; dust[i * 3 + 1] = Math.cos(i * 17) * 7; dust[i * 3 + 2] = 1 + (i % 9) * 0.6; }
    const dustGeometry = new THREE.BufferGeometry(); dustGeometry.setAttribute('position', new THREE.BufferAttribute(dust, 3));
    const particles = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: '#e9cf9e', size: 0.028, transparent: true, opacity: 0.3, depthWrite: false })); particles.name = 'cave:dust'; this.scene.add(particles);
  }
  private buildWindow() {
    const root = this.scene;
    this.box(root, 9.1, 4.05, 0.6, 10.9, 5.9, -2.1, this.darkWood, 0.13);
    const nightMap = texture(256, 128, c => {
      const sky = c.createLinearGradient(0, 0, 0, 128); sky.addColorStop(0, '#163a79'); sky.addColorStop(0.6, '#315d9a'); sky.addColorStop(1, '#142e4d'); c.fillStyle = sky; c.fillRect(0, 0, 256, 128);
    });
    const night = new THREE.Mesh(new THREE.PlaneGeometry(8.45, 3.5), new THREE.MeshBasicMaterial({ map: nightMap })); night.position.set(10.9, 5.9, -1.72); root.add(night);
    for (let i = 0; i < 8; i++) {
      const tree = new THREE.Group(); tree.position.set(7.3 + i, 4.2, -1.59); tree.scale.setScalar(0.7 + i % 3 * 0.14);
      for (let tier = 0; tier < 3; tier++) { const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5 - tier * 0.09, 0.8, 5), new THREE.MeshBasicMaterial({ color: i % 2 ? '#233e62' : '#1c344b' })); cone.position.y = tier * 0.35; tree.add(cone); } root.add(tree);
    }
    for (const x of [6.5, 10.9, 15.3]) this.box(root, 0.16, 3.8, 0.27, x, 5.9, -1.39, this.darkWood);
    for (const y of [4.03, 7.78]) this.box(root, 9.3, 0.2, 0.62, 10.9, y, -1.4, this.darkWood);
    const rainPositions = new Float32Array(64 * 6); for (let i = 0; i < 64; i++) this.rainOrigins.push(6.7 + (i * 1.371) % 8.35, 4.2 + (i * 0.759) % 3.3);
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    this.rain = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#a4c3ff', transparent: true, opacity: 0.48 })); this.rain.name = 'cave:rain'; root.add(this.rain); this.updateRain();
    this.box(root, 9.7, 0.24, 1.25, 10.9, 3.85, -1.1, this.darkWood);
    // Quelques fougères sur l'appui : silhouettes en feuilles, loin de la zone de jeu.
    const leafMaterial = new THREE.MeshStandardMaterial({ color: '#254b2e', roughness: 0.86, side: THREE.DoubleSide });
    const leafShape = new THREE.Shape(); leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(0.24, 0.16, 0, 0.48); leafShape.quadraticCurveTo(-0.2, 0.17, 0, 0);
    const leafGeometry = new THREE.ShapeGeometry(leafShape);
    for (const base of [7.4, 12.9, 14.4]) for (let stem = -2; stem <= 2; stem++) {
      const endX = base + stem * 0.38, top = 4.8 + (2 - Math.abs(stem)) * 0.2;
      this.rod(root, [base, 3.95, -0.7], [endX, top, -0.65], 0.016, leafMaterial);
      for (let j = 1; j <= 5; j++) for (const side of [-1, 1]) {
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial); const t = j / 6;
        leaf.position.set(base + (endX - base) * t, 3.95 + (top - 3.95) * t, -0.62);
        leaf.rotation.z = -side * (0.8 + t * 0.3); leaf.scale.setScalar(0.9 - t * 0.3); root.add(leaf);
      }
    }
  }
  private updateRain() {
    const attribute = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < 64; i++) {
      const x = this.rainOrigins[i * 2];
      // Y monte dans la scène : soustraire le temps fait tomber la pluie vers le bas.
      const y = 4.2 + THREE.MathUtils.euclideanModulo(this.rainOrigins[i * 2 + 1] - 4.2 - this.environmentTime * 0.0017, 3.3);
      attribute.setXYZ(i * 2, x, y, -1.27);
      attribute.setXYZ(i * 2 + 1, x - 0.045, Math.min(7.62, y + 0.25), -1.27);
    }
    attribute.needsUpdate = true;
  }
  private buildPendant() {
    const root = this.scene; this.cylinder(root, 0.045, 2.1, 3.2, 8.05, 3.1, this.iron);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), new THREE.MeshBasicMaterial({ color: '#ffe1a3' })); bulb.position.set(3.2, 6.62, 3.1); root.add(bulb); this.cylinder(root, 0.19, 0.35, 3.2, 7.04, 3.1, this.brass);
    for (const y of [6.24, 6.8]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.025, 5, 18), this.brass); ring.rotation.x = Math.PI / 2; ring.position.set(3.2, y, 3.1); root.add(ring); }
    for (let i = 0; i < 6; i++) { const angle = i * Math.PI / 3; this.rod(root, [3.2 + Math.cos(angle) * 0.43, 6.24, 3.1 + Math.sin(angle) * 0.43], [3.2 + Math.cos(angle) * 0.31, 7.15, 3.1 + Math.sin(angle) * 0.31], 0.022, this.brass); }
  }
  private buildBench() {
    const root = this.workbench;
    this.box(root, 9, 0.46, 3.5, 11.2, -1.65, 0.1, this.darkWood, 0.12); this.box(root, 8.6, 0.6, 3.1, 11.2, -2.15, 0.1, this.darkWood);
    for (const x of [7.3, 15.1]) for (const z of [-0.95, 1.4]) this.box(root, 0.36, 5.6, 0.36, x, -4.75, z, this.darkWood);
    this.box(root, 8.6, 3.25, 0.18, 11.2, 0.3, -1.22, this.wood);
    const holes: THREE.Matrix4[] = []; const dummy = new THREE.Object3D();
    for (let row = 0; row < 9; row++) for (let col = 0; col < 24; col++) { dummy.position.set(7.2 + col * 0.35, -1.05 + row * 0.34, -1.08); dummy.rotation.x = Math.PI / 2; dummy.updateMatrix(); holes.push(dummy.matrix.clone()); }
    const pegs = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.018, 6), this.iron, holes.length); holes.forEach((matrix, i) => pegs.setMatrixAt(i, matrix)); root.add(pegs);
    for (let i = 0; i < 9; i++) {
      const x = 7.9 + i * 0.8, y = 0.7 + i % 2 * 0.2;
      this.box(root, 0.13, 1.15, 0.16, x, y - 0.45, -0.94, i % 3 === 0 ? this.pink : this.iron);
      if (i % 2) this.cylinder(root, 0.21, 0.09, x, y + 0.25, -0.94, this.iron, 'z'); else this.box(root, 0.43, 0.19, 0.2, x, y + 0.2, -0.94, this.brass);
    }
    this.box(root, 9.1, 0.22, 1.4, 11.1, 2.45, -0.75, this.darkWood);
    for (let i = 0; i < 6; i++) { const x = 7.9 + i * 1.05, h = 0.65 + i % 3 * 0.2; this.cylinder(root, 0.26, h, x, 2.6 + h / 2, -0.65, i % 2 ? this.sage : this.iron); this.cylinder(root, 0.28, 0.1, x, 2.63 + h, -0.65, this.brass); this.box(root, 0.39, h * 0.35, 0.03, x, 2.7 + h / 2, -0.37, this.cream); }
    for (let i = 0; i < 6; i++) { this.box(root, 0.95, 0.45, 0.9, 9.4 + i % 3 * 1.02, -1.15 + Math.floor(i / 3) * 0.51, 0.4, this.iron); this.box(root, 0.25, 0.06, 0.1, 9.4 + i % 3 * 1.02, -1.15 + Math.floor(i / 3) * 0.51, 0.89, this.brass); }
    this.box(root, 3.1, 1.45, 2.2, 12.5, -6.7, 0.2, this.sage, 0.15); this.box(root, 3.2, 0.18, 2.25, 12.5, -5.9, 0.2, this.iron);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 4 - row % 2; col++) { const x = 7.7 + col * 0.64 + row % 2 * 0.3, y = -7.2 + row * 0.58; this.cylinder(root, 0.31, 2, x, y, 0.2, this.darkWood, 'z'); this.cylinder(root, 0.26, 0.03, x, y, 1.23, this.wood, 'z'); }
    this.cylinder(root, 0.5, 0.12, 14.45, -1.36, 0.3, this.sage);
    this.rod(root, [14.45, -1.3, 0.3], [14.9, 0.3, 0.1], 0.07, this.iron); this.rod(root, [14.9, 0.3, 0.1], [14, 1.0, 0.3], 0.07, this.iron);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.5, 14, 1, true), this.sage); shade.position.set(13.9, 0.85, 0.4); shade.rotation.z = -0.4; root.add(shade);
    const light = new THREE.PointLight('#ffca86', 32, 12); light.position.set(13.65, 0.45, 0.8); root.add(light);
    this.cylinder(root, 0.24, 0.54, 13.45, -1.16, 1.1, this.cream); const handle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 6, 12), this.cream); handle.position.set(13.75, -1.15, 1.1); root.add(handle);
    this.box(root, 1.4, 0.15, 0.95, 8.1, -1.34, 0.8, this.pink);
    this.cylinder(root, 0.8, 0.24, 10.1, -4.35, 4.0, this.darkWood);
    for (const [x, z] of [[9.6, 3.5], [10.6, 3.5], [10.1, 4.6]]) this.rod(root, [x, -4.45, z], [x + (x - 10.1) * 0.35, FLOOR, z + (z - 4) * 0.35], 0.1, this.darkWood);
    this.contactShade(root, 10, 5, 11, FLOOR + 0.09, 0.6, true, 0.7);
    this.contactShade(root, 3.2, 3, 10.1, FLOOR + 0.09, 4, true, 0.7);
    // Assemblage de l'établi : plateau en planches, traverses et fixations.
    for (const z of [-0.95, 0, 0.95]) this.box(root, 8.8, 0.018, 0.025, 11.2, -1.405, z, this.iron, 0.005);
    this.box(root, 8, 0.28, 0.28, 11.2, -5.8, 1.4, this.darkWood);
    for (const x of [7.35, 15.05]) for (const y of [-2.14, -5.8]) this.cylinder(root, 0.07, 0.04, x, y, 1.63, this.brass, 'z');
    // Conduit ancien, colliers et câble de la machine contre la pierre.
    this.cylinder(this.scene, 0.18, 16, -6.5, 0.3, -1.1, this.iron);
    for (const y of [-6, -2, 2, 6]) {
      this.cylinder(this.scene, 0.23, 0.16, -6.5, y, -1.1, this.brass);
      this.box(this.scene, 0.65, 0.22, 0.1, -6.5, y, -1.35, this.iron);
    }
  }
  private buildStairs() {
    const group = new THREE.Group(); group.name = 'cave:stairs'; this.scene.add(group);
    const structure = new THREE.Group(); structure.name = 'cave:stairs:structure'; group.add(structure);
    for (let i = 0; i < STAIRS.count; i++) {
      const y = STAIRS.firstY + i * STAIRS.rise, z = STAIRS.firstZ - i * STAIRS.run;
      this.box(structure, 4.7, STAIRS.thickness, STAIRS.depth, STAIRS.x, y, z, this.stairMaterial, 0.1);
      const previousTop = i === 0 ? FLOOR : STAIRS.firstY + (i - 1) * STAIRS.rise + STAIRS.thickness / 2;
      const underside = y - STAIRS.thickness / 2;
      this.box(structure, 4.4, underside - previousTop, 0.14, STAIRS.x, (underside + previousTop) / 2, z + STAIRS.depth / 2 - 0.07, this.stairMaterial, 0.015);
    }
    for (const x of [STAIRS.x - 2.45, STAIRS.x + 2.45]) {
      this.rod(structure, [x, -7.2, 7.7], [x, 7.7, -1.65], 0.15, this.stairMaterial); this.rod(structure, [x, -4.0, 7.7], [x, 9.2, -1.0], 0.11, this.stairMaterial);
      for (const i of [0, 4, 8]) this.rod(structure, [x, FLOOR + i * 1.37, 7.2 - i * 0.85], [x, FLOOR + i * 1.37 + 3.4, 7.2 - i * 0.85], 0.1, this.stairMaterial);
    }
    this.box(structure, 5, STAIRS.thickness, 4.1, STAIRS.x, STAIR_LANDING.y - STAIRS.thickness / 2, -2.85, this.stairMaterial);
    structure.traverse(object => { if (object instanceof THREE.Mesh) this.register(object, 'sorties', () => this.exitLabel(), ['plinko']); });
    const eyeHeight = VIEWS.plinko.y + VIEWS.plinko.offsetY - FLOOR;
    const headroom = eyeHeight + 3.2, ceilingY = STAIR_LANDING.y + headroom;
    const wallY = STAIR_LANDING.y + headroom / 2;
    for (const x of [STAIRS.x - 2.6, STAIRS.x + 2.6]) this.box(group, 0.22, headroom, 11, x, wallY, 0.5, this.darkWood);
    this.box(group, 5.4, headroom, 0.2, STAIRS.x, wallY, -5, this.darkWood);
    this.box(group, 5.4, 0.2, 11, STAIRS.x, ceilingY, 0.5, this.darkWood);
    const landingLight = new THREE.PointLight('#ffcc8d', 95, 21); landingLight.position.set(STAIRS.x, ceilingY - 1, -2.5); group.add(landingLight);
    const plaque = lettering('LE CHALET ↑', 3.4, 0.6, '#c5dbd5', '#314741'); plaque.position.set(STAIRS.x, STAIR_LANDING.y + eyeHeight + 0.7, -4.86); group.add(plaque);
  }
  setInterface(ui: InterfaceState) { this.ui = ui; this.interfaces.setInteractionState(ui); }
  clearFocus() { this.focus(undefined); }
  resetFlights() {
    this.clearFocus();
    for (const flight of this.flights.values()) this.machine.remove(flight.mesh);
    this.flights.clear(); this.exitPulse.fill(0);
  }
  setDeparture(enabled: boolean, camera?: CameraPose) {
    this.interactionEnabled = enabled; this.travelCamera = camera;
    if (!enabled) { this.clearFocus(); this.renderer.domElement.style.cursor = 'default'; }
  }
  cameraPose(): CameraPose {
    this.updateCamera();
    return { position: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z }, lookAt: { x: this.navigation.pose.x, y: this.navigation.pose.y, z: this.navigation.pose.z } };
  }
  private exitLabel() {
    const balls = this.currentState?.pendingBalls.length ?? 0;
    return `Sortir de la cave${this.ui.autoEnabled ? ' — le Doigt mécanique s’arrêtera' : ''}${balls ? ` · ${balls} bille(s) finiront leur chute` : ''}`;
  }
  private launchCondition() {
    const s = this.currentState;
    if (!this.ui.canWrite) return ' · partie suspendue';
    if (!s) return '';
    if (s.factoryRemainingMs) return ' · service en cours';
    if (s.repairTriggered && !s.repairPurchased) return ' · panne, faire réparer chez Azur';
    if (s.walletCents < s.selectedBetCents) return ' · solde insuffisant, usine accessible par l’escalier';
    if (s.pendingBalls.length >= CONFIG.maxBalls) return ' · 50 billes en cours';
    if (s.manualCooldownMs) return ' · patienter';
    return '';
  }
  private register(object: THREE.Object3D, action: string, label: () => string, views?: View[]) {
    object.userData = { ...object.userData, action, label, views }; this.clickTargets.push(object);
  }
  private target(action: Action, parent: THREE.Object3D, x: number, y: number, z: number, width: number, height: number, label: () => string, views?: View[]) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); plane.position.set(x, y, z); parent.add(plane); this.register(plane, action, label, views);
  }
  private reachable(object: THREE.Object3D) {
    if (!this.interactionEnabled || this.navigation.moving || (object.userData.views && !object.userData.views.includes(this.navigation.target)) || !this.interfaces.actionAvailable(object.userData.action)) return false;
    let node: THREE.Object3D | null = object;
    while (node) { if (!node.visible) return false; node = node.parent; }
    const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
    return frustum.intersectsBox(new THREE.Box3().setFromObject(object));
  }
  private unobstructed(object: THREE.Object3D, point: THREE.Vector3) {
    const distance = this.raycaster.ray.origin.distanceTo(point);
    return !this.raycaster.intersectObjects(this.scene.children, true).some(hit => {
      if (hit.distance >= distance - 0.07 || hit.object === object || hit.object.userData.control === object || !(hit.object instanceof THREE.Mesh)) return false;
      let node: THREE.Object3D | null = hit.object;
      while (node) { if (!node.visible) return false; node = node.parent; }
      const materials = Array.isArray(hit.object.material) ? hit.object.material : [hit.object.material];
      return materials.some(material => material.visible && (!material.transparent || material.opacity > 0.5));
    });
  }
  private focus(object?: THREE.Object3D) {
    const stairsFocused = object?.userData.action === 'sorties';
    this.stairMaterial.emissiveIntensity = stairsFocused ? 0.16 : 0;
    this.focused = object; this.hint.visible = !!object; this.highlight.visible = !!object && !stairsFocused;
    this.element.dataset.focusedAction = object?.userData.action ?? '';
    if (!object) { this.hintText = ''; return; }
    const label = object.userData.label() as string;
    if (label !== this.hintText) {
      this.hintText = label;
      const map = texture(1536, 128, ctx => { ctx.fillStyle = '#24352eed'; ctx.fillRect(0, 0, 1536, 128); ctx.fillStyle = '#eddfb9'; ctx.font = '38px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 768, 64, 1490); });
      const material = this.hint.material as THREE.SpriteMaterial; material.map?.dispose(); material.map = map; material.needsUpdate = true;
      const status = document.getElementById('accessibility-status'); if (status) status.textContent = label;
      this.renderer.domElement.setAttribute('aria-label', label);
    }
    const bounds = new THREE.Box3().setFromObject(object); this.highlight.box.copy(bounds).expandByScalar(0.035);
    // Repère commun visible à côté de la rampe, même si son extrémité sort du cadre.
    if (stairsFocused) this.hint.position.set(STAIRS.x + 3.8, 1.2, STAIRS.footZ - 0.5);
    else this.hint.position.set((bounds.min.x + bounds.max.x) / 2, bounds.max.y + 0.35, bounds.max.z + 0.35);
    const scale = Math.min(5.5, Math.max(2.9, this.camera.position.distanceTo(this.hint.position) * 0.13)); this.hint.scale.set(scale, scale / 12, 1);
  }
  private bindPointer(onAction: (action: Action) => void) {
    const canvas = this.renderer.domElement;
    const rayAt = (event: PointerEvent | MouseEvent) => {
      const rect = canvas.getBoundingClientRect(); this.raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), this.camera);
    };
    const hitAt = (event: PointerEvent | MouseEvent) => {
      rayAt(event);
      return this.raycaster.intersectObjects(this.clickTargets, false).find(hit => this.reachable(hit.object) && this.unobstructed(hit.object, hit.point))?.object;
    };
    canvas.addEventListener('click', event => { canvas.focus({ preventScroll: true }); const hit = hitAt(event); if (hit) { this.focus(hit); onAction(hit.userData.action); } });
    canvas.addEventListener('pointermove', event => {
      const hit = hitAt(event); canvas.style.cursor = hit ? 'pointer' : 'default'; this.focus(hit);
    });
    canvas.addEventListener('pointerleave', () => this.focus(undefined));
    canvas.addEventListener('blur', () => this.focus(undefined));
    canvas.addEventListener('keydown', event => {
      if (event.key === 'Tab' && this.interactionEnabled) {
        event.preventDefault(); const targets = this.clickTargets.filter(object => {
          if (!this.reachable(object)) return false;
          const point = object.getWorldPosition(new THREE.Vector3()), projected = point.clone().project(this.camera); this.raycaster.setFromCamera(new THREE.Vector2(projected.x, projected.y), this.camera);
          if (Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1) return false;
          const surface = this.raycaster.intersectObject(object, false)[0]?.point ?? point;
          return this.unobstructed(object, surface);
        }).filter((object, index, list) => list.findIndex(candidate => candidate.userData.action === object.userData.action) === index);
        const index = this.focused ? targets.indexOf(this.focused) : -1;
        const next = index < 0 ? (event.shiftKey ? targets.length - 1 : 0) : (index + (event.shiftKey ? -1 : 1) + targets.length) % targets.length;
        this.focus(targets[next]);
      } else if ((event.key === 'Enter' || event.code === 'Space') && this.focused && this.reachable(this.focused)) {
        event.preventDefault(); if (!event.repeat) onAction(this.focused.userData.action);
      }
    });
  }
  private resize() {
    const { width, height } = this.element.getBoundingClientRect(); this.renderer.setSize(Math.max(1, width), Math.max(1, height)); this.camera.aspect = width / Math.max(1, height); this.updateCamera(); this.camera.updateProjectionMatrix(); this.composer?.setSize(Math.max(1, width), Math.max(1, height)); this.render();
  }
  private applyQuality(quality: string) {
    this.quality = quality; this.renderer.setPixelRatio(this.quality === 'low' ? 1 : Math.min(devicePixelRatio, 1.5)); this.renderer.shadowMap.enabled = this.quality !== 'low'; this.renderer.shadowMap.needsUpdate = true; this.composer.setPixelRatio(this.renderer.getPixelRatio()); this.resize();
  }
  /**
   * Démarrage sans image figée : avec ses nombreuses lumières, la cave compte une quarantaine de shaders
   * coûteux. Les compiler en parallèle dans le pilote (`compileAsync`), vers la cible réellement
   * utilisée, avant la première image ; la page reste réactive pendant ce temps.
   */
  prepare(quality: string) {
    if (this.gate === 'compiling' || this.gate === 'ready') return;
    this.gate = 'compiling'; this.applyQuality(quality);
    this.renderer.setRenderTarget(this.quality !== 'low' ? this.composer.readBuffer : null);
    const ready = this.renderer.compileAsync(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
    void ready.then(() => {
      // Envoyer aussi les textures au GPU (pages du boîtier, ticket, étiquettes) avant la première image.
      this.scene.traverse(object => {
        const material = (object as THREE.Mesh).material;
        for (const m of Array.isArray(material) ? material : material ? [material] : []) {
          for (const value of Object.values(m)) if (value instanceof THREE.Texture) this.renderer.initTexture(value);
        }
      });
      this.gate = 'ready';
    });
  }
  private render() {
    if (this.gate === 'waiting' || this.gate === 'compiling') return;
    if (this.composer && this.quality !== 'low') this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
  private updateCamera() {
    if (this.travelCamera) {
      const { position, lookAt } = this.travelCamera;
      this.camera.position.set(position.x, position.y, position.z); this.camera.lookAt(lookAt.x, lookAt.y, lookAt.z); this.camera.updateMatrixWorld(true); return;
    }
    const p = this.navigation.pose;
    const distance = Math.max(p.height, p.width / this.camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(19.5)));
    this.camera.position.set(p.x + p.offsetX + Math.sin(p.yaw) * distance, p.y + p.offsetY, p.z + Math.cos(p.yaw) * distance); this.camera.lookAt(p.x, p.y, p.z); this.camera.updateMatrixWorld(true);
  }

  frame(state: GameState, delta: number, active: boolean, onArrival: (id: string) => boolean) {
    this.currentState = state; this.navigation.advance(delta, state.preferences.reducedMotion);
    if (active && !state.preferences.reducedMotion) this.environmentTime += delta;
    this.updateCamera(); this.updateRain();
    for (const slot of MODULE_SLOTS) { const group = this.modules.get(slot.id)!, visible = (state.upgrades as readonly string[]).includes(slot.unlockId) || (slot.id === 'magnets' && !!this.ui.magnetsAvailable) || (slot.id === 'collector' && !!this.ui.collectorAvailable); if (visible !== group.visible) { group.visible = visible; this.renderer.shadowMap.needsUpdate = true; } }
    this.magnets.update(state, this.ui.autoEnabled);
    this.collector.update(state);
    this.element.dataset.modules = MODULE_SLOTS.filter(slot => this.modules.get(slot.id)!.visible).map(slot => slot.id).join(',');
    if (this.wallet !== state.walletCents) {
      this.wallet = state.walletCents; const canvas = this.counter.image as HTMLCanvasElement, ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#201d18'; ctx.fillRect(0, 0, 256, 80); ctx.fillStyle = '#ffd082'; ctx.shadowColor = '#e69930'; ctx.shadowBlur = 4; ctx.font = '48px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText((state.walletCents / 100).toFixed(2).padStart(6, '0').replace('.', ','), 128, 43, 236); this.counter.needsUpdate = true;
    }
    if (this.quality !== state.preferences.quality) this.applyQuality(state.preferences.quality);
    const ids = new Set(state.pendingBalls.map(ball => ball.id));
    for (const [id, flight] of this.flights) if (!ids.has(id)) { this.machine.remove(flight.mesh); this.flights.delete(id); }
    for (const ball of state.pendingBalls) if (!this.flights.has(ball.id)) this.addBall(ball);
    for (const [id, flight] of this.flights) {
      const previousContact = contactStep(flight.elapsed / CONFIG.flightDuration);
      if (active) flight.elapsed += delta;
      const point = samplePath(flight.points, flight.elapsed / CONFIG.flightDuration, state.preferences.reducedMotion); flight.mesh.position.set(point.x, point.y, point.z);
      const contact = contactStep(flight.elapsed / CONFIG.flightDuration);
      if (active && contact > previousContact && flight.elapsed < CONFIG.flightDuration) this.onContact(contact + point.x);
      const ball = state.pendingBalls.find(ball => ball.id === id);
      if (ball && this.modules.get('magnets')!.visible) this.magnets.attraction(ball, point, flight.elapsed / CONFIG.flightDuration, state.preferences.reducedMotion);
      if (active && flight.elapsed >= CONFIG.flightDuration && onArrival(id)) {
        this.machine.remove(flight.mesh); this.flights.delete(id);
        if (ball) this.exitPulse[ball.exit] = 1;
      }
    }
    this.lamps.forEach((lamp, i) => {
      if (active) this.exitPulse[i] = Math.max(0, this.exitPulse[i] - delta / 650);
      const pulse = this.exitPulse[i];
      (lamp.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.35 + pulse * 1.4;
      (this.exitBacks[i].material as THREE.MeshStandardMaterial).emissiveIntensity = pulse * 0.35;
      this.exitLabels[i].scale.setScalar(1 + (state.preferences.reducedMotion ? 0 : Math.sin(pulse * Math.PI) * 0.08));
      (this.exitLabels[i].material as THREE.MeshBasicMaterial).color.setRGB(1, 1 - pulse * 0.12, 1 - pulse * 0.3);
    });
    const indicator = this.indicator.material as THREE.MeshStandardMaterial; indicator.color.set(state.repairTriggered && !state.repairPurchased ? '#d8907d' : state.bonusRemainingMs > 0 ? '#f1c37b' : '#abd2ab');
    this.interfaces.update(state, this.ui, this.navigation.target);
    if (this.focused) this.focus(this.reachable(this.focused) ? this.focused : undefined);
    this.render(); if (this.gate === 'none' || this.gate === 'ready') this.element.dataset.renderedView = this.navigation.moving ? 'moving' : this.navigation.target;
  }
  private addBall(ball: Ball) {
    const mesh = new THREE.Mesh(this.ballGeometry, ball.bonus > 1 ? this.bonusMaterial : ball.origin === 'collector' ? this.collectorMaterial : ball.origin === 'auto' ? this.autoMaterial : this.silver); this.machine.add(mesh); this.flights.set(ball.id, { mesh, points: pathToExit(ball.exit, Math.random, ball.magnetFrom), elapsed: 0 });
  }
}
