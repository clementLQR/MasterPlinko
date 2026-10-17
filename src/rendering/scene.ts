import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CONFIG, EXITS, MODULE_SLOTS, VIEWS } from '../config';
import type { Navigation } from '../navigation/camera';
import type { Ball, GameState } from '../game/state';
import { BOARD, pathToExit, samplePath } from './trajectory';
import type { Point } from './trajectory';

type Action = 'plinko' | 'azur' | 'stairs' | 'launch' | 'history';
const FLOOR = -7.7;
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
  private camera = new THREE.PerspectiveCamera(39, 1, 0.1, 160);
  private machine = new THREE.Group();
  private flights = new Map<string, { mesh: THREE.Mesh; points: Point[]; elapsed: number }>();
  private ballGeometry = new THREE.SphereGeometry(0.105, 16, 10);
  private silver = new THREE.MeshStandardMaterial({ color: '#e3e7df', metalness: 0.9, roughness: 0.17 });
  private autoMaterial = new THREE.MeshStandardMaterial({ color: '#b2d7bc', metalness: 0.75, roughness: 0.22 });
  private bonusMaterial = new THREE.MeshStandardMaterial({ color: '#ffdd8e', metalness: 0.7, roughness: 0.2, emissive: '#c87928', emissiveIntensity: 0.45 });
  private modules = new Map<string, THREE.Group>();
  private indicator!: THREE.Mesh;
  private lamps: THREE.Mesh[] = [];
  private quality = '';
  private observer: ResizeObserver;
  private raycaster = new THREE.Raycaster();
  private clickTargets: THREE.Object3D[] = [];
  private geometries = new Map<string, THREE.BufferGeometry>();
  private counter!: THREE.CanvasTexture;
  private wallet = -1;
  private environmentTime = 0;
  private rain!: THREE.LineSegments;
  private rainOrigins: number[] = [];
  private wood: THREE.MeshStandardMaterial;
  private darkWood: THREE.MeshStandardMaterial;
  private cream = new THREE.MeshStandardMaterial({ color: '#ead7b0', roughness: 0.67 });
  private sage = new THREE.MeshStandardMaterial({ color: '#91ac91', metalness: 0.2, roughness: 0.58 });
  private pink = new THREE.MeshStandardMaterial({ color: '#c9968f', roughness: 0.64 });
  private lavender = new THREE.MeshStandardMaterial({ color: '#aaa0bf', roughness: 0.64 });
  private iron = new THREE.MeshStandardMaterial({ color: '#35413b', metalness: 0.64, roughness: 0.48 });
  private brass = new THREE.MeshStandardMaterial({ color: '#b99b69', metalness: 0.7, roughness: 0.38 });

  constructor(private element: HTMLElement, private navigation: Navigation, onAction: (action: Action) => void) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); this.renderer.setClearColor('#211c1b');
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false; this.renderer.shadowMap.needsUpdate = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.35;
    this.renderer.domElement.setAttribute('aria-label', 'Cave de Papy en 3D : Plinko crème et pastel, escalier en bois à gauche, établi et fenêtre pluvieuse à droite.');
    this.renderer.domElement.setAttribute('role', 'img'); element.append(this.renderer.domElement);
    this.scene.background = new THREE.Color('#211c1b'); this.scene.fog = new THREE.FogExp2('#302620', 0.009);
    this.scene.add(new THREE.HemisphereLight('#a7b4d3', '#745038', 0.85));
    const key = new THREE.DirectionalLight('#ffe1b2', 1.8); key.position.set(-3, 8, 14); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.normalBias = 0.05;
    Object.assign(key.shadow.camera, { left: -20, right: 21, top: 14, bottom: -13, near: 0.1, far: 70 });
    key.target.position.set(0, -1, 0); this.scene.add(key, key.target);
    const blue = new THREE.PointLight('#759aff', 90, 28); blue.position.set(10, 6, 0.3); this.scene.add(blue);
    const warm = new THREE.PointLight('#ffb562', 105, 32); warm.position.set(3, 6, 3); this.scene.add(warm);
    const woodMap = texture(256, 512, ctx => {
      ctx.fillStyle = '#c99c65'; ctx.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 140; i++) { const x = (i * 41.7) % 256; ctx.strokeStyle = i % 3 ? '#66472a21' : '#fff0c62c'; ctx.lineWidth = 0.5 + i % 3; ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + 8, 150, x - 11, 340, x + 2, 512); ctx.stroke(); }
    });
    this.wood = new THREE.MeshStandardMaterial({ map: woodMap, color: '#f3d8a8', roughness: 0.73 });
    this.darkWood = new THREE.MeshStandardMaterial({ map: woodMap, color: '#805237', roughness: 0.88 });
    this.machine.name = 'machine:base'; this.machine.rotation.x = -0.035; this.scene.add(this.machine);
    this.buildRoom(); this.buildMachine(); this.buildModules(); this.buildBench(); this.buildStairs();
    this.target('plinko', this.machine, 0, 0, -0.2, 11.7, 14.4);
    this.target('azur', this.scene, 11.3, -1.8, 1.8, 8.5, 9.6);
    this.target('stairs', this.scene, -10.8, 0.1, 5.1, 5.4, 14.7);
    this.bindPointer(onAction); this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(element); this.resize();
  }
  private box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material, radius = 0.08) {
    const key = `${w}/${h}/${d}/${radius}`; let geometry = this.geometries.get(key);
    if (!geometry) { geometry = radius > 0 ? new RoundedBoxGeometry(w, h, d, 1, Math.min(radius, w / 3, h / 3, d / 3)) : new THREE.BoxGeometry(w, h, d); this.geometries.set(key, geometry); }
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
    const face = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#a5dfb6', emissiveIntensity: 0.65, roughness: 0.4 })); face.position.set(x, y, z + 0.04); parent.add(face);
  }
  private buildMachine() {
    const root = this.machine;
    this.box(root, 11.7, 13.8, 1.1, 0, -0.15, -0.7, this.wood, 0.32);
    // La surface de jeu reste lisible même lorsque les poutres ou modules projettent des ombres.
    this.box(root, 10.65, 9.8, 0.19, 0, 0.35, -0.1, this.cream, 0.18).receiveShadow = false;
    for (const x of [-5.5, 5.5]) this.box(root, 0.5, 13, 1.2, x, -0.1, -0.06, this.wood, 0.22);
    this.box(root, 11.5, 1.5, 1.1, 0, 5.95, -0.12, this.wood, 0.27); this.screen(root, 0, 6.02, 0.48, 3.6, 1.05);
    this.box(root, 10.7, 0.2, 0.4, 0, 5.13, 0.28, this.darkWood);
    const led = new THREE.MeshStandardMaterial({ color: '#fff0b8', emissive: '#ffce7b', emissiveIntensity: 2 });
    for (let i = 0; i < 8; i++) this.box(root, 0.55, 0.08, 0.2, -4.4 + i * 1.25, 5.0, 0.45, led, 0.025);
    const pins = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.071, 0.088, 0.4, 10), this.wood, 105); const dummy = new THREE.Object3D(); let index = 0;
    for (let row = 0; row < 14; row++) for (let col = 0; col <= row; col++) { dummy.position.set((col - row / 2) * BOARD.spacingX, BOARD.startY - row * BOARD.spacingY, 0.2); dummy.rotation.set(Math.PI / 2, 0, 0); dummy.updateMatrix(); pins.setMatrixAt(index++, dummy.matrix); }
    pins.castShadow = true; pins.name = 'machine:pins'; root.add(pins);
    const pastels = [this.pink, this.lavender, this.sage, this.sage, this.lavender, this.pink];
    for (let i = 0; i < 15; i++) {
      const x = (i - 7) * BOARD.spacingX;
      this.box(root, 0.64, 0.94, 0.12, x, -4.18, 0.05, pastels[i % pastels.length], 0.07);
      this.box(root, 0.045, 0.95, 0.85, x + 0.33, -4.18, 0.44, this.cream, 0.02);
      const plate = lettering(`×${(EXITS[i] / 100).toLocaleString('fr-FR')}`, 0.59, 0.3, '#253d34', '#d8d2b5'); plate.position.set(x, -4.56, 0.9); root.add(plate);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshStandardMaterial({ color: '#ffe6ad', emissive: '#e4ac4f', emissiveIntensity: 0.35 })); lamp.position.set(x, -4.83, 0.64); root.add(lamp); this.lamps.push(lamp);
    }
    this.box(root, 10.7, 0.13, 1.1, 0, -4.7, 0.3, this.wood);
    this.box(root, 11.4, 2, 1.5, 0, -5.87, 0.13, this.wood, 0.23); this.box(root, 10.8, 1.65, 0.18, 0, -5.75, 0.95, this.cream, 0.15);
    this.box(root, 11.7, 0.55, 1.5, 0, -7.0, 0, this.wood, 0.19);
    for (const x of [-4.55, 4.55]) this.box(root, 0.8, 0.45, 1.4, x, -7.45, 0, this.darkWood);
    const button = this.cylinder(root, 0.73, 0.28, -2.65, -5.73, 1.16, this.sage, 'z'); button.userData.action = 'launch'; this.clickTargets.push(button); button.name = 'machine:play-button';
    const arrow = new THREE.Shape(); arrow.moveTo(-0.2, -0.32); arrow.lineTo(0.31, 0); arrow.lineTo(-0.2, 0.32); arrow.closePath();
    const triangle = new THREE.Mesh(new THREE.ExtrudeGeometry(arrow, { depth: 0.035, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.02, bevelThickness: 0.02 }), this.cream); triangle.position.set(-2.65, -5.73, 1.32); root.add(triangle);
    this.counter = texture(256, 80, () => {}, true); this.box(root, 3.3, 1.06, 0.26, 2.35, -5.75, 1.05, this.iron, 0.12);
    const counter = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.78), new THREE.MeshBasicMaterial({ map: this.counter })); counter.position.set(2.35, -5.75, 1.2); root.add(counter);
    this.indicator = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), new THREE.MeshStandardMaterial({ color: '#a3cfac', emissive: '#7ca778', emissiveIntensity: 0.4 })); this.indicator.position.set(4.8, 6.06, 0.54); root.add(this.indicator);
    for (const x of [-5.5, 5.5]) for (const y of [-6.7, -4.7, 1.2, 5.9]) this.cylinder(root, 0.078, 0.08, x, y, 0.58, this.brass, 'z');
    for (const x of [-5.85, 5.85]) for (const y of [-3.5, 3.6]) this.box(root, 0.13, 0.55, 0.3, x, y, -0.2, this.sage, 0.04);
  }
  private buildModules() {
    for (const slot of MODULE_SLOTS) {
      const group = new THREE.Group(); group.name = `module:${slot.id}`; group.position.set(slot.position[0], slot.position[1], slot.position[2]); group.visible = false; this.machine.add(group); this.modules.set(slot.id, group);
      if (slot.id === 'auto_launcher') {
        this.box(group, 1.45, 2, 1.2, 0, 0, 0.1, this.cream, 0.25); this.screen(group, 0, 0.25, 0.76, 0.94, 0.56);
        this.cylinder(group, 0.5, 2.4, 0, 2.13, 0.1, new THREE.MeshStandardMaterial({ color: '#bcdde1', transparent: true, opacity: 0.22, roughness: 0.2, depthWrite: false }));
        for (const y of [0.95, 3.35]) this.cylinder(group, 0.58, 0.14, 0, y, 0.1, this.wood);
        for (let i = 0; i < 7; i++) { const ball = new THREE.Mesh(this.ballGeometry, this.silver); ball.scale.setScalar(1.7); ball.position.set((i % 2 - 0.5) * 0.23, 1.2 + i * 0.27, 0.15); group.add(ball); }
        this.rod(group, [0, -0.6, 0.8], [0.4, -1.35, 1.1], 0.15, this.sage); this.rod(group, [0.4, -1.35, 1.1], [1.15, -1.5, 1.05], 0.1, this.brass);
        this.rod(group, [-0.5, -0.7, -0.4], [-0.7, -3.3, -0.45], 0.1, this.sage);
      } else if (slot.id === 'accounting_tray') {
        this.box(group, 1.5, 1.85, 1.15, 0, 0, 0, this.pink, 0.24); this.screen(group, 0, 0.36, 0.62, 1, 0.52);
        this.box(group, 1.08, 0.12, 0.1, 0, -0.42, 0.65, this.iron);
        const receipt = lettering('003 / +0,50', 0.86, 1.2, '#665643', '#e7dbbd'); receipt.position.set(0, -1.0, 0.72); receipt.rotation.x = -0.15; group.add(receipt);
        for (const x of [-0.4, 0, 0.4]) this.cylinder(group, 0.11, 0.07, x, -0.09, 0.65, this.cream, 'z'); this.target('history', group, 0, 0, 0.85, 1.5, 2.5);
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
    const mortar = new THREE.MeshStandardMaterial({ color: '#51473d', roughness: 1 });
    // Ouverture dans la maçonnerie, avec la fenêtre et la nuit derrière.
    this.box(this.scene, 23.3, 17.5, 1, -5.35, 0.6, -2.65, mortar);
    this.box(this.scene, 3.3, 17.5, 1, 17.35, 0.6, -2.65, mortar);
    this.box(this.scene, 9.4, 12, 1, 10.9, -1.8, -2.65, mortar);
    this.box(this.scene, 9.4, 1.7, 1, 10.9, 8.7, -2.65, mortar);
    const stones: THREE.Matrix4[] = [], colors: THREE.Color[] = []; const dummy = new THREE.Object3D();
    for (let row = 0; row < 16; row++) for (let col = 0; col < 23; col++) {
      const seed = row * 31 + col * 7, x = -17.6 + col * 1.62 + (row % 2) * 0.7, y = -7.2 + row * 1.07;
      if (x > 5.8 && x < 15.9 && y > 3.5 && y < 8.2) continue;
      dummy.position.set(x, y, -1.97 + Math.sin(seed) * 0.13); dummy.rotation.set(Math.sin(seed) * 0.06, Math.cos(seed) * 0.07, Math.sin(seed * 2) * 0.055);
      dummy.scale.set(1.43 + Math.sin(seed) * 0.18, 0.88 + Math.cos(seed) * 0.12, 0.65 + Math.sin(seed * 4) * 0.1); dummy.updateMatrix(); stones.push(dummy.matrix.clone());
      colors.push(new THREE.Color(seed % 4 ? '#796c60' : '#62676a').multiplyScalar(0.78 + (Math.sin(seed * 1.8) + 1) * 0.19));
    }
    const stoneGeometry = new RoundedBoxGeometry(1, 1, 1, 2, 0.19);
    const vertices = stoneGeometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i);
      vertices.setXYZ(i, x + Math.sin(y * 11 + z * 7) * 0.035, y + Math.sin(x * 9 + z * 4) * 0.035, z + Math.sin(x * 12 + y * 6) * 0.03);
    }
    stoneGeometry.computeVertexNormals();
    const stoneMesh = new THREE.InstancedMesh(stoneGeometry, new THREE.MeshStandardMaterial({ roughness: 0.98 }), stones.length);
    stones.forEach((matrix, i) => { stoneMesh.setMatrixAt(i, matrix); stoneMesh.setColorAt(i, colors[i]); }); stoneMesh.castShadow = true; stoneMesh.receiveShadow = true; stoneMesh.name = 'cave:stone-wall'; this.scene.add(stoneMesh);
    // Le retour du mur ferme réellement la pièce, notamment dans le cadrage de l’établi.
    this.box(this.scene, 0.7, 17.5, 29, 19.15, 0.6, 11.4, mortar);
    const returnWall = new THREE.InstancedMesh(stoneGeometry, new THREE.MeshStandardMaterial({ roughness: 0.98 }), 176);
    let sideIndex = 0;
    for (let row = 0; row < 16; row++) for (let col = 0; col < 11; col++) {
      const seed = row * 11 + col;
      dummy.position.set(18.82 + Math.sin(seed) * 0.07, -7.2 + row * 1.07, -1.4 + col * 2.5 + row % 2 * 0.6);
      dummy.rotation.set(0, Math.PI / 2, Math.sin(seed) * 0.025); dummy.scale.set(2.3, 0.87 + Math.sin(seed) * 0.1, 0.58); dummy.updateMatrix();
      returnWall.setMatrixAt(sideIndex, dummy.matrix); returnWall.setColorAt(sideIndex++, colors[seed % colors.length]);
    }
    returnWall.castShadow = true; returnWall.receiveShadow = true; returnWall.name = 'cave:return-wall'; this.scene.add(returnWall);
    const floor = this.box(this.scene, 43, 0.25, 28, 0, FLOOR - 0.2, 9, mortar); floor.name = 'cave:floor';
    const tiles = new THREE.InstancedMesh(new RoundedBoxGeometry(1, 1, 1, 1, 0.1), new THREE.MeshStandardMaterial({ roughness: 0.96 }), 460); let index = 0;
    for (let row = 0; row < 20; row++) for (let col = 0; col < 23; col++) {
      const seed = row * 23 + col; dummy.position.set(-19 + col * 1.73 + row % 2 * 0.6, FLOOR - 0.02, -1 + row * 1.28); dummy.scale.set(1.65, 0.12, 1.2); dummy.rotation.set(0, Math.sin(seed) * 0.04, 0); dummy.updateMatrix(); tiles.setMatrixAt(index, dummy.matrix);
      tiles.setColorAt(index++, new THREE.Color('#897d71').multiplyScalar(0.78 + (Math.sin(seed * 4) + 1) * 0.1));
    }
    tiles.receiveShadow = true; tiles.name = 'cave:old-paving'; this.scene.add(tiles);
    for (let i = 0; i < 25; i++) this.box(this.scene, 1.5, 0.2, 18, -17.5 + i * 1.5, 9.45, 5.8, this.darkWood);
    for (const z of [-1.5, 4.5, 10.5]) this.box(this.scene, 37, 0.65, 0.6, 0, 9.0, z, this.darkWood, 0.16);
    for (const x of [-14, -5.5, 7, 17]) this.box(this.scene, 0.7, 0.85, 17.5, x, 8.8, 5, this.darkWood, 0.16);
    this.buildWindow(); this.buildPendant();
    const rugMap = texture(256, 256, ctx => {
      ctx.fillStyle = '#9f6759'; ctx.fillRect(0, 0, 256, 256); const stripes = ['#5e7367', '#c09578', '#644e4d', '#b28f81', '#c2ab84', '#71617d'];
      for (let y = 0; y < 256; y += 16) { ctx.fillStyle = stripes[Math.floor(y / 16) % stripes.length]; ctx.fillRect(0, y, 256, 10); }
      for (let x = 0; x < 256; x += 3) { ctx.fillStyle = '#eadfba21'; ctx.fillRect(x, 0, 1, 256); }
      for (let y = 0; y < 256; y += 3) { ctx.fillStyle = '#382c2525'; ctx.fillRect(0, y, 256, 1); }
    });
    const rug = this.box(this.scene, 14, 0.07, 7.5, 0.4, FLOOR + 0.1, 4.8, new THREE.MeshStandardMaterial({ map: rugMap, roughness: 1 }), 0.03); rug.rotation.y = -0.035; rug.name = 'cave:worn-rug';
    for (let i = 0; i < 34; i++) for (const z of [1.0, 8.6]) this.box(this.scene, 0.035, 0.035, 0.35 + i % 3 * 0.06, -6.25 + i * 0.4, FLOOR + 0.11, z, this.cream, 0.01);
    for (const [x, y, z, width] of [[-14.1, -6.7, 5.2, 3.1], [-14.2, -5.2, 4.9, 2.8], [-7.3, -6.8, -0.4, 1.6]]) {
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
    const night = new THREE.Mesh(new THREE.PlaneGeometry(8.45, 3.5), new THREE.MeshBasicMaterial({ color: '#182f60' })); night.position.set(10.9, 5.9, -1.72); root.add(night);
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
  }
  private updateRain() {
    const attribute = this.rain.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < 64; i++) { const x = this.rainOrigins[i * 2], y = 4.2 + ((this.rainOrigins[i * 2 + 1] - 4.2 + this.environmentTime * 0.0017) % 3.3); attribute.setXYZ(i * 2, x, y, -1.27); attribute.setXYZ(i * 2 + 1, x - 0.045, Math.min(7.62, y + 0.25), -1.27); } attribute.needsUpdate = true;
  }
  private buildPendant() {
    const root = this.scene; this.cylinder(root, 0.045, 2.1, 3.2, 8.05, 3.1, this.iron);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), new THREE.MeshBasicMaterial({ color: '#ffe1a3' })); bulb.position.set(3.2, 6.62, 3.1); root.add(bulb); this.cylinder(root, 0.19, 0.35, 3.2, 7.04, 3.1, this.brass);
    for (const y of [6.24, 6.8]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.025, 5, 18), this.brass); ring.rotation.x = Math.PI / 2; ring.position.set(3.2, y, 3.1); root.add(ring); }
    for (let i = 0; i < 6; i++) { const angle = i * Math.PI / 3; this.rod(root, [3.2 + Math.cos(angle) * 0.43, 6.24, 3.1 + Math.sin(angle) * 0.43], [3.2 + Math.cos(angle) * 0.31, 7.15, 3.1 + Math.sin(angle) * 0.31], 0.022, this.brass); }
  }
  private buildBench() {
    const root = this.scene;
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
    this.cylinder(root, 0.8, 0.24, 14.1, -4.35, 4.0, this.darkWood);
    for (const [x, z] of [[13.6, 3.5], [14.6, 3.5], [14.1, 4.6]]) this.rod(root, [x, -4.45, z], [x + (x - 14.1) * 0.35, FLOOR, z + (z - 4) * 0.35], 0.1, this.darkWood);
  }
  private buildStairs() {
    const group = new THREE.Group(); group.name = 'cave:stairs'; this.scene.add(group);
    for (let i = 0; i < 11; i++) { const y = FLOOR + 0.65 + i * 1.37, z = 7.2 - i * 0.85; this.box(group, 4.7, 0.24, 1.15, -11.2, y, z, this.darkWood, 0.1); this.box(group, 4.4, 1.12, 0.14, -11.2, y - 0.66, z - 0.43, this.darkWood); }
    for (const x of [-13.65, -8.75]) {
      this.rod(group, [x, -7.2, 7.7], [x, 7.7, -1.65], 0.15, this.darkWood); this.rod(group, [x, -4.0, 7.7], [x, 9.2, -1.0], 0.11, this.darkWood);
      for (const i of [0, 4, 8]) this.rod(group, [x, FLOOR + i * 1.37, 7.2 - i * 0.85], [x, FLOOR + i * 1.37 + 3.4, 7.2 - i * 0.85], 0.1, this.darkWood);
    }
    const plaque = lettering('LE CHALET ↑', 3.4, 0.6, '#c5dbd5', '#314741'); plaque.position.set(-11.2, 7.75, -1.4); group.add(plaque);
  }
  private target(action: Action, parent: THREE.Object3D, x: number, y: number, z: number, width: number, height: number) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); plane.position.set(x, y, z); plane.userData.action = action; parent.add(plane); this.clickTargets.push(plane);
  }
  private bindPointer(onAction: (action: Action) => void) {
    const canvas = this.renderer.domElement;
    const hitAt = (event: PointerEvent | MouseEvent) => {
      if (this.navigation.moving) return;
      const rect = canvas.getBoundingClientRect(); this.raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), this.camera);
      return this.raycaster.intersectObjects(this.clickTargets).find(hit => { let node: THREE.Object3D | null = hit.object; while (node) { if (!node.visible) return false; node = node.parent; } return true; });
    };
    canvas.addEventListener('click', event => { const hit = hitAt(event); if (hit) onAction(hit.object.userData.action); });
    canvas.addEventListener('pointermove', event => {
      const hint = this.element.querySelector<HTMLElement>('#scene-hint'), hit = hitAt(event); canvas.style.cursor = hit ? 'pointer' : 'default'; if (!hint) return; hint.hidden = !hit;
      if (hit) {
        const labels: Record<Action, string> = { stairs: 'Sortir de la cave', azur: 'L’établi d’Azur', plinko: 'La machine de Papy', launch: 'Lancer une bille', history: 'Le Bac comptable' }; hint.textContent = labels[hit.object.userData.action as Action];
        const rect = this.element.getBoundingClientRect(); hint.style.left = `${Math.min(rect.width - 190, Math.max(8, event.clientX - rect.left + 14))}px`; hint.style.top = `${Math.max(8, event.clientY - rect.top - 35)}px`;
      }
    });
    canvas.addEventListener('pointerleave', () => { const hint = this.element.querySelector<HTMLElement>('#scene-hint'); if (hint) hint.hidden = true; });
  }
  private resize() {
    const { width, height } = this.element.getBoundingClientRect(); this.renderer.setSize(Math.max(1, width), Math.max(1, height)); this.camera.aspect = width / Math.max(1, height); this.updateCamera(); this.camera.updateProjectionMatrix(); this.renderer.render(this.scene, this.camera);
  }
  private updateCamera() {
    const mix = (a: number, b: number) => THREE.MathUtils.lerp(a, b, this.navigation.value), x = mix(VIEWS.plinko.x, VIEWS.azur.x), y = mix(VIEWS.plinko.y, VIEWS.azur.y);
    const distance = Math.max(mix(VIEWS.plinko.height, VIEWS.azur.height), mix(VIEWS.plinko.width, VIEWS.azur.width) / this.camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(19.5)));
    this.camera.position.set(x + mix(2.9, 2), y + mix(1.65, 1.9), distance); this.camera.lookAt(x, y, 0);
  }
  frame(state: GameState, delta: number, active: boolean, onArrival: (id: string) => boolean) {
    if (active) { this.navigation.advance(delta, state.preferences.reducedMotion); if (!state.preferences.reducedMotion) this.environmentTime += delta; }
    this.updateCamera(); this.updateRain();
    for (const slot of MODULE_SLOTS) { const group = this.modules.get(slot.id)!, visible = (state.upgrades as readonly string[]).includes(slot.unlockId); if (visible !== group.visible) { group.visible = visible; this.renderer.shadowMap.needsUpdate = true; } }
    this.element.dataset.modules = MODULE_SLOTS.filter(slot => this.modules.get(slot.id)!.visible).map(slot => slot.id).join(',');
    if (this.wallet !== state.walletCents) {
      this.wallet = state.walletCents; const canvas = this.counter.image as HTMLCanvasElement, ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#201d18'; ctx.fillRect(0, 0, 256, 80); ctx.fillStyle = '#ffd082'; ctx.shadowColor = '#e69930'; ctx.shadowBlur = 4; ctx.font = '48px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText((state.walletCents / 100).toFixed(2).padStart(6, '0'), 128, 43, 236); this.counter.needsUpdate = true;
    }
    if (this.quality !== state.preferences.quality) { this.quality = state.preferences.quality; this.renderer.setPixelRatio(this.quality === 'low' ? 1 : Math.min(devicePixelRatio, 1.5)); this.renderer.shadowMap.enabled = this.quality !== 'low'; this.renderer.shadowMap.needsUpdate = true; this.resize(); }
    const ids = new Set(state.pendingBalls.map(ball => ball.id));
    for (const [id, flight] of this.flights) if (!ids.has(id)) { this.machine.remove(flight.mesh); this.flights.delete(id); }
    for (const ball of state.pendingBalls) if (!this.flights.has(ball.id)) this.addBall(ball);
    for (const [id, flight] of this.flights) {
      if (active) flight.elapsed += delta; const point = samplePath(flight.points, flight.elapsed / CONFIG.flightDuration, state.preferences.reducedMotion); flight.mesh.position.set(point.x, point.y, point.z);
      if (active && flight.elapsed >= CONFIG.flightDuration && onArrival(id)) { this.machine.remove(flight.mesh); this.flights.delete(id); const ball = state.pendingBalls.find(ball => ball.id === id); if (ball) (this.lamps[ball.exit].material as THREE.MeshStandardMaterial).emissiveIntensity = 1.6; }
    }
    for (const lamp of this.lamps) { const material = lamp.material as THREE.MeshStandardMaterial; if (active) material.emissiveIntensity = Math.max(0.35, material.emissiveIntensity - delta / 1000); }
    const indicator = this.indicator.material as THREE.MeshStandardMaterial; indicator.color.set(state.repairTriggered && !state.repairPurchased ? '#d8907d' : state.bonusRemainingMs > 0 ? '#f1c37b' : '#abd2ab');
    this.renderer.render(this.scene, this.camera); this.element.dataset.renderedView = this.navigation.moving ? 'moving' : this.navigation.target;
  }
  private addBall(ball: Ball) {
    const mesh = new THREE.Mesh(this.ballGeometry, ball.bonus === 10 ? this.bonusMaterial : ball.origin === 'auto' ? this.autoMaterial : this.silver); this.machine.add(mesh); this.flights.set(ball.id, { mesh, points: pathToExit(ball.exit), elapsed: 0 });
  }
}
