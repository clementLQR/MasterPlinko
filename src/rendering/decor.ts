import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CAVE, STAIRS } from '../config';

const FLOOR = CAVE.floorY;
const random = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

function canvasMap(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d')!);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  return map;
}

/** Objets de la cave, sans état de jeu. Les petites pièces opaques sont regroupées par matériau. */
export class CaveDecor {
  private root = new THREE.Group();
  private workshopRoot = new THREE.Group();
  private patina = canvasMap(256, 256, c => {
    c.fillStyle = '#dbd6c7'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 15000; i++) { c.fillStyle = i % 2 ? '#161d1820' : '#ffffff20'; c.fillRect(random(i) * 256, random(i + 5) * 256, 1 + random(i + 1) * 2, 1); }
    c.strokeStyle = '#57533b30'; c.lineWidth = 0.6;
    for (let i = 0; i < 70; i++) { const x = random(i + 7) * 256, y = random(i + 9) * 256; c.beginPath(); c.moveTo(x, y); c.lineTo(x + random(i) * 15, y + random(i + 3) * 6); c.stroke(); }
  });
  private iron = this.material('#252b28', 0.65, 0.38);
  private brass = this.material('#a47739', 0.42, 0.7);
  private cream = this.material('#d1bd90');
  private red = this.material('#923e28');
  private teal = this.material('#397873', 0.58, 0.28);
  private sage = this.material('#6c7950');
  private paper = this.material('#c4b38a');
  private leaf = this.material('#637d35');
  private amber = new THREE.MeshStandardMaterial({ color: '#ffde8b', emissive: '#ff9c25', emissiveIntensity: 3.6 });
  private cyan = new THREE.MeshStandardMaterial({ color: '#6ee3cf', emissive: '#39e4cb', emissiveIntensity: 1.6 });
  private geometry = new Map<string, THREE.BufferGeometry>();
  private contactMap?: THREE.CanvasTexture;

  constructor(private scene: THREE.Scene, private wood: THREE.Material, private darkWood: THREE.Material, workbench: THREE.Group) {
    this.root.name = 'cave:decor'; scene.add(this.root); workbench.add(this.workshopRoot);
    this.leaf.side = THREE.DoubleSide;
    this.lounge(); this.shelves(); this.stove(); this.invention(); this.workshop(); this.wallDetails(); this.lighting(); this.rearWorkshop();
    this.batch();
  }
  private material(color: string, roughness = 0.83, metalness = 0.05) { return new THREE.MeshStandardMaterial({ color, map: this.patina, bumpMap: this.patina, bumpScale: 0.025, roughness, metalness }); }
  private mesh(parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  private box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material, radius = 0.04) {
    const horizontalGrain = w > h && (material === this.wood || material === this.darkWood);
    const key = `${w}/${h}/${d}/${radius}/${horizontalGrain}`;
    if (!this.geometry.has(key)) {
      const geometry = new RoundedBoxGeometry(w, h, d, 3, Math.min(radius, w / 3, h / 3, d / 3));
      if (horizontalGrain) { const uv = geometry.getAttribute('uv'); for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i)); }
      this.geometry.set(key, geometry);
    }
    return this.mesh(parent, this.geometry.get(key)!, material, x, y, z);
  }
  private cylinder(parent: THREE.Object3D, r: number, h: number, x: number, y: number, z: number, material: THREE.Material, top = r) {
    const key = `c${r}/${h}/${top}`;
    if (!this.geometry.has(key)) this.geometry.set(key, new THREE.CylinderGeometry(top, r, h, 16));
    return this.mesh(parent, this.geometry.get(key)!, material, x, y, z);
  }
  private ball(parent: THREE.Object3D, r: number, x: number, y: number, z: number, material: THREE.Material) {
    const key = `s${r}`; if (!this.geometry.has(key)) this.geometry.set(key, new THREE.SphereGeometry(r, 16, 10));
    return this.mesh(parent, this.geometry.get(key)!, material, x, y, z);
  }
  private ring(parent: THREE.Object3D, r: number, tube: number, x: number, y: number, z: number, material: THREE.Material) {
    const key = `t${r}/${tube}`; if (!this.geometry.has(key)) this.geometry.set(key, new THREE.TorusGeometry(r, tube, 6, 24));
    return this.mesh(parent, this.geometry.get(key)!, material, x, y, z);
  }
  private rod(parent: THREE.Object3D, from: number[], to: number[], r: number, material: THREE.Material) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const mesh = this.cylinder(parent, r, a.distanceTo(b), 0, 0, 0, material);
    mesh.position.copy(a.clone().add(b).multiplyScalar(0.5)); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize()); return mesh;
  }
  private group(x: number, y: number, z: number, parent: THREE.Object3D = this.root) {
    const group = new THREE.Group(); group.position.set(x, y, z); parent.add(group); return group;
  }
  private floorShadow(parent: THREE.Object3D, x: number, z: number, width: number, depth: number) {
    this.contactMap ??= canvasMap(64, 64, c => {
      const gradient = c.createRadialGradient(32, 32, 5, 32, 32, 32); gradient.addColorStop(0, '#130e09e0'); gradient.addColorStop(0.6, '#130e0970'); gradient.addColorStop(1, '#130e0900');
      c.fillStyle = gradient; c.fillRect(0, 0, 64, 64);
    });
    const mesh = this.mesh(parent, new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({ map: this.contactMap, transparent: true, opacity: 0.45, depthWrite: false }), x, 0.18, z);
    mesh.rotation.x = -Math.PI / 2; mesh.castShadow = false;
  }
  private art(parent: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, draw: (c: CanvasRenderingContext2D) => void, frame = true) {
    if (frame) this.box(parent, w + 0.16, h + 0.16, 0.13, x, y, z - 0.06, this.darkWood);
    const map = canvasMap(512, Math.round(512 * h / w), draw);
    return this.mesh(parent, new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.95 }), x, y, z + 0.015);
  }
  private text(c: CanvasRenderingContext2D, lines: string[], w: number, h: number, color = '#cdb68b') {
    c.fillStyle = '#1d2928'; c.fillRect(0, 0, w, h); c.strokeStyle = color; c.lineWidth = 3; c.strokeRect(15, 15, w - 30, h - 30);
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = color;
    c.font = `bold ${Math.min(62, (h - 100) / (lines.length + 1))}px monospace`;
    lines.forEach((line, i) => c.fillText(line, w / 2, h * (i + 1) / (lines.length + 1), w - 50));
  }
  private chest(parent: THREE.Object3D, x: number, y: number, z: number, w = 1.7, color: THREE.Material = this.teal) {
    this.box(parent, w, 0.9, 1.15, x, y + 0.45, z, color, 0.09); this.box(parent, w + 0.05, 0.15, 1.2, x, y + 0.9, z, color);
    for (const side of [-1, 1]) {
      this.box(parent, 0.12, 0.92, 0.045, x + side * w * 0.37, y + 0.48, z + 0.59, this.brass);
      this.box(parent, 0.22, 0.2, 0.08, x + side * w * 0.37, y + 0.6, z + 0.63, this.brass);
    }
    this.box(parent, 0.5, 0.09, 0.08, x, y + 0.46, z + 0.65, this.iron);
    this.box(parent, 0.48, 0.2, 0.02, x, y + 0.72, z + 0.62, this.paper);
  }
  private books(parent: THREE.Object3D, x: number, y: number, z: number, n: number, horizontal = false) {
    const colors = [this.red, this.sage, this.teal, this.cream, this.iron];
    for (let i = 0; i < n; i++) {
      const h = 0.8 + random(i + x) * 0.4, g = this.group(x + (horizontal ? 0 : i * 0.22), y + (horizontal ? i * 0.18 : h / 2), z, parent);
      if (horizontal) g.rotation.z = Math.PI / 2;
      g.rotation.y = (random(i * 7 + x) - 0.5) * 0.13;
      this.box(g, 0.19, h, 0.62, 0, 0, 0, colors[(i + Math.round(Math.abs(x))) % colors.length], 0.01);
      for (const band of [-0.3, 0.3]) this.box(g, 0.15, 0.025, 0.01, 0, band * h, 0.32, this.brass, 0.005);
    }
  }
  private plant(parent: THREE.Object3D, x: number, y: number, z: number, s = 1, hanging = false) {
    const group = this.group(x, y, z, parent); group.scale.setScalar(s);
    this.cylinder(group, 0.26, 0.46, 0, 0.23, 0, this.red, 0.36);
    this.cylinder(group, 0.37, 0.08, 0, 0.47, 0, this.red);
    this.cylinder(group, 0.31, 0.02, 0, 0.48, 0, this.iron);
    for (let branch = 0; branch < 7; branch++) {
      const angle = branch * 2.399;
      let a = [0, 0.48, 0];
      for (let i = 1; i <= (hanging ? 14 : 4); i++) {
        const t = i / 4, b = [Math.sin(angle) * (0.13 + Math.min(t, 1.2) * 0.31), hanging ? 0.8 - i * 0.24 : 0.48 + Math.sin(t * 1.2) * (0.5 + branch % 3 * 0.19), Math.cos(angle) * (0.13 + Math.min(t, 1.2) * 0.31)];
        this.rod(group, a, b, 0.012, this.leaf);
        const key = 'leaf';
        if (!this.geometry.has(key)) { const shape = new THREE.Shape(); shape.moveTo(0, -0.2); shape.quadraticCurveTo(-0.28, 0.02, -0.16, 0.15); shape.quadraticCurveTo(-0.05, 0.21, 0, 0.1); shape.quadraticCurveTo(0.12, 0.25, 0.19, 0.1); shape.quadraticCurveTo(0.23, -0.02, 0, -0.2); this.geometry.set(key, new THREE.ShapeGeometry(shape)); }
        const leaf = this.mesh(group, this.geometry.get(key)!, this.leaf, b[0], b[1], b[2]); leaf.rotation.set(-0.45, angle * 0.3, angle + i);
        a = b;
      }
    }
  }
  private lantern(parent: THREE.Object3D, x: number, y: number, z: number, s = 1) {
    const group = this.group(x, y, z, parent); group.scale.setScalar(s);
    this.cylinder(group, 0.31, 0.12, 0, 0.06, 0, this.brass); this.cylinder(group, 0.16, 0.24, 0, 0.28, 0, this.amber);
    this.ball(group, 0.10, 0, 0.42, 0, this.amber).scale.set(0.75, 1.5, 0.75);
    this.cylinder(group, 0.25, 0.52, 0, 0.49, 0, new THREE.MeshStandardMaterial({ color: '#b4ad84', transparent: true, opacity: 0.14, roughness: 0.2, depthWrite: false }));
    this.cylinder(group, 0.33, 0.12, 0, 0.85, 0, this.brass, 0.2); this.cylinder(group, 0.19, 0.15, 0, 0.98, 0, this.brass);
    for (const sign of [-1, 1]) this.rod(group, [sign * 0.32, 0.12, 0], [sign * 0.32, 0.9, 0], 0.028, this.iron);
    this.ring(group, 0.28, 0.025, 0, 1.13, 0, this.iron);
  }
  private mug(parent: THREE.Object3D, x: number, y: number, z: number) {
    this.cylinder(parent, 0.17, 0.3, x, y + 0.15, z, this.cream);
    this.cylinder(parent, 0.14, 0.008, x, y + 0.305, z, this.darkWood);
    this.ring(parent, 0.12, 0.035, x + 0.21, y + 0.16, z, this.cream);
  }
  private robot(parent: THREE.Object3D, x: number, y: number, z: number, s = 1) {
    const g = this.group(x, y, z, parent); g.scale.setScalar(s);
    this.box(g, 0.72, 0.66, 0.42, 0, 0.85, 0, this.teal, 0.08); this.box(g, 0.78, 0.49, 0.45, 0, 1.47, 0, this.teal, 0.09);
    for (const sign of [-1, 1]) {
      this.ball(g, 0.075, sign * 0.21, 1.5, 0.24, this.amber);
      this.box(g, 0.21, 0.5, 0.23, sign * 0.23, 0.3, 0, this.teal); this.box(g, 0.34, 0.18, 0.51, sign * 0.23, 0.1, 0.08, this.iron);
      this.cylinder(g, 0.13, 0.22, sign * 0.48, 0.99, 0, this.brass).rotation.z = Math.PI / 2;
      this.box(g, 0.18, 0.54, 0.2, sign * 0.55, 0.7, 0, this.teal);
    }
    this.box(g, 0.43, 0.31, 0.06, 0, 0.86, 0.24, this.iron);
    for (let i = 0; i < 3; i++) this.ball(g, 0.04, -0.13 + i * 0.13, 0.88, 0.29, i % 2 ? this.red : this.amber);
    this.rod(g, [0, 1.72, 0], [0.09, 1.96, 0], 0.02, this.brass); this.ball(g, 0.055, 0.09, 1.96, 0, this.red);
    this.box(g, 0.29, 0.035, 0.03, 0, 1.31, 0.25, this.brass);
  }
  private radio(parent: THREE.Object3D, x: number, y: number, z: number, w = 1.7) {
    this.box(parent, w, 0.8, 0.7, x, y + 0.4, z, this.darkWood, 0.09);
    this.box(parent, w * 0.86, 0.61, 0.025, x, y + 0.4, z + 0.36, this.iron);
    for (const dx of [-0.3, 0.3]) this.cylinder(parent, 0.14, 0.06, x + dx * w, y + 0.29, z + 0.4, this.brass).rotation.x = Math.PI / 2;
    this.box(parent, w * 0.4, 0.2, 0.03, x, y + 0.57, z + 0.4, this.cream);
    for (let i = 0; i < 9; i++) this.box(parent, 0.02, 0.16, 0.02, x - w * 0.17 + i * w * 0.043, y + 0.57, z + 0.43, this.brass, 0.005);
    this.rod(parent, [x + w * 0.35, y + 0.8, z], [x + w * 0.55, y + 1.7, z], 0.015, this.brass);
  }
  private television(parent: THREE.Object3D, x: number, y: number, z: number, w: number, landscape: boolean) {
    const h = w * 0.72;
    this.box(parent, w, h, 0.85, x, y + h / 2, z, this.iron, 0.16);
    this.box(parent, w * 0.76, h * 0.79, 0.13, x - w * 0.065, y + h * 0.52, z + 0.45, this.brass, 0.13);
    const screen = this.art(parent, w * 0.7, h * 0.72, x - w * 0.065, y + h * 0.52, z + 0.53, c => {
      const height = c.canvas.height; c.fillStyle = landscape ? '#6695a1' : '#102d36'; c.fillRect(0, 0, 512, height);
      if (landscape) {
        for (let row = 0; row < 3; row++) {
          c.fillStyle = ['#bec9ba', '#638b83', '#315a53'][row]; c.beginPath(); c.moveTo(0, height);
          for (let i = 0; i <= 8; i++) c.lineTo(i * 80, height * (0.22 + row * 0.21) + Math.sin(i * 6 + row) * height * 0.16);
          c.lineTo(512, height); c.fill();
        }
        c.fillStyle = '#c59766'; c.fillRect(250, height * 0.64, 80, 70); c.fillStyle = '#704c3b'; c.beginPath(); c.moveTo(233, height * 0.65); c.lineTo(290, height * 0.48); c.lineTo(348, height * 0.65); c.fill();
        c.fillStyle = '#f2cd7a'; c.fillRect(270, height * 0.71, 16, 20); c.fillRect(300, height * 0.71, 16, 20);
        // Petites touches de pixel art dans le tube cathodique, comme une vieille carte postale.
        c.fillStyle = '#d3ddd0';
        for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(40 + i * 93, 35 + i % 3 * 18, 29, 7, 0, 0, Math.PI * 2); c.fill(); }
        c.fillStyle = '#e2e1c4';
        for (let i = 0; i < 4; i++) { const x = 55 + i * 129; c.beginPath(); c.moveTo(x, height * 0.21); c.lineTo(x - 18, height * 0.32); c.lineTo(x, height * 0.29); c.lineTo(x + 15, height * 0.33); c.fill(); }
        for (let i = 0; i < 24; i++) {
          const x = i * 23, base = height * (0.72 + random(i) * 0.12), size = 30 + random(i + 4) * 45;
          if (x > 230 && x < 350) continue;
          c.fillStyle = i % 2 ? '#294e46' : '#365f4c';
          for (let tier = 0; tier < 3; tier++) { const y = base - size + tier * size * 0.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + size * 0.23, y + size * 0.55); c.lineTo(x - size * 0.23, y + size * 0.55); c.fill(); }
        }
        c.fillStyle = '#806447'; c.fillRect(315, height * 0.49, 8, 25);
        for (let i = 0; i < 65; i++) { c.fillStyle = i % 3 ? '#bcba76' : '#a1745c'; c.fillRect(random(i) * 512, height * (0.88 + random(i + 2) * 0.12), 3, 2); }
      } else {
        const glow = c.createRadialGradient(256, height * 0.7, 2, 256, height * 0.7, height * 0.7); glow.addColorStop(0, '#519b98'); glow.addColorStop(1, '#102d36'); c.fillStyle = glow; c.fillRect(0, 0, 512, height);
        c.fillStyle = '#498b8e66'; c.beginPath(); c.moveTo(232, height * 0.37); c.lineTo(160, height); c.lineTo(350, height); c.lineTo(280, height * 0.37); c.fill();
        c.fillStyle = '#76aeab'; c.beginPath(); c.ellipse(256, height * 0.33, 90, 19, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(256, height * 0.31, 45, 22, 0, 0, Math.PI * 2); c.fill();
      }
      for (let yy = 0; yy < height; yy += 4) { c.fillStyle = '#06161d24'; c.fillRect(0, yy, 512, 1); }
    }, false);
    screen.material = new THREE.MeshBasicMaterial({ map: (screen.material as THREE.MeshStandardMaterial).map, color: '#a6bbae', toneMapped: false });
    for (const yy of [0.3, 0.6]) this.cylinder(parent, w * 0.035, 0.04, x + w * 0.41, y + h * yy, z + 0.46, this.brass).rotation.x = Math.PI / 2;
    for (let i = 0; i < 5; i++) this.box(parent, 0.14, 0.02, 0.02, x + w * 0.41, y + h * 0.1 + i * 0.06, z + 0.46, this.brass, 0.005);
  }
  private lounge() {
    const g = this.group(-11.6, FLOOR, 5.8); g.rotation.y = 0.1;
    const leatherMap = canvasMap(256, 256, c => {
      c.fillStyle = '#a48a70'; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 15000; i++) { c.fillStyle = i % 2 ? '#301d0f19' : '#ffe5b419'; c.fillRect(random(i) * 256, random(i + 1) * 256, 1, 1); }
      for (let i = 0; i < 36; i++) { const x = random(i) * 256, y = random(i + 6) * 256; c.strokeStyle = '#38261330'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 7, y - 20, x - 10, y - 30, x + 6, y - 40); c.stroke(); }

    });
    const leather = new THREE.MeshStandardMaterial({ map: leatherMap, bumpMap: leatherMap, bumpScale: 0.025, color: '#76513b', roughness: 0.67 });
    for (const x of [-4, 4]) for (const z of [-1.4, 1.4]) this.box(g, 0.32, 0.45, 0.32, x, 0.23, z, this.darkWood);
    this.box(g, 9.4, 1.15, 4.5, 0, 1.05, 0, leather, 0.3);
    for (let i = 0; i < 3; i++) {
      const x = -2.65 + i * 2.65;
      this.box(g, 2.58, 0.65, 3.15, x, 1.97, 0.4, leather, 0.28);
      const back = this.box(g, 2.6, 2.65, 0.85, x, 3.04, -1.75, leather, 0.3); back.rotation.x = -0.10;
      for (const yy of [2.55, 3.4]) for (const xx of [-0.57, 0.57]) this.ball(g, 0.05, x + xx, yy, -1.23, this.darkWood);
    }
    for (const x of [-4.34, 4.34]) this.box(g, 0.72, 2.15, 4.5, x, 2.1, 0, leather, 0.3);
    const plaid = canvasMap(256, 256, c => {
      c.fillStyle = '#963e28'; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 8; i++) { c.fillStyle = '#1b282ac0'; c.fillRect(i * 32, 0, 13, 256); c.fillRect(0, i * 32, 256, 13); c.fillStyle = '#b28e602e'; c.fillRect(i * 32 + 19, 0, 2, 256); c.fillRect(0, i * 32 + 19, 256, 2); }
      for (let i = 0; i < 256; i += 2) { c.fillStyle = '#b5ac8530'; c.fillRect(0, i, 256, 0.6); }
    });
    const blanket = new THREE.MeshStandardMaterial({ map: plaid, bumpMap: plaid, bumpScale: 0.035, roughness: 1 });
    this.box(g, 2.5, 0.055, 3.3, -2.65, 2.33, 0.4, blanket);
    this.box(g, 2.5, 2.65, 0.09, -2.65, 3.04, -1.20, blanket, 0.04).rotation.x = -0.12;
    this.box(g, 2.5, 1.15, 0.055, -2.65, 1.8, 2.02, blanket);
    const cushion = this.box(g, 1.65, 1.55, 0.5, 2.0, 3.02, -0.85, this.sage, 0.23); cushion.rotation.set(-0.25, -0.1, -0.2);
    const table = this.group(-13.5, FLOOR, 10.1);
    this.chest(table, 0, 0.2, 0, 3, this.darkWood); table.scale.y = 1.55;
    this.lantern(table, -0.7, 1.1, 0, 0.9); this.books(table, 0.4, 1.1, 0, 3, true); this.mug(table, 0.8, 1.5, 0.2);
    const pouf = this.group(-5.8, FLOOR, 10.0);
    this.cylinder(pouf, 1.45, 1.35, 0, 0.8, 0, this.sage, 1.3);
    this.ball(pouf, 1.4, 0, 1.35, 0, this.sage).scale.set(1, 0.3, 1);
    for (let i = 0; i < 14; i++) {
      const a = i * Math.PI / 7;
      this.rod(pouf, [Math.sin(a) * 1.4, 0.25, Math.cos(a) * 1.4], [Math.sin(a) * 1.31, 1.55, Math.cos(a) * 1.31], 0.025, this.cream);
    }
  }
  private shelf(x: number, z: number, width: number, levels: number[], height: number, parent = this.root, floor: number = FLOOR) {
    const group = this.group(x, floor, z, parent);
    for (const xx of [-width / 2, width / 2]) for (const zz of [-0.5, 0.5]) this.cylinder(group, 0.065, height, xx, height / 2, zz, this.iron);
    for (const y of levels) {
      this.box(group, width + 0.3, 0.17, 1.5, 0, y, 0, this.darkWood);
      this.box(group, width, 0.035, 0.06, 0, y - 0.15, 0.6, this.amber);
    }
    return group;
  }
  private shelves() {
    const left = this.shelf(-12.9, -0.55, 6.1, [0.45, 2.6, 5, 7.6, 10.1, 12.5], 14);
    this.chest(left, -1.8, 0.55, 0, 2.1, this.darkWood); this.chest(left, 0.6, 0.55, 0, 2.2); this.books(left, 1.9, 0.55, 0, 4);
    this.books(left, -2.6, 2.7, 0, 6); this.radio(left, 0, 2.7, 0, 2.3); this.chest(left, 2, 2.7, 0, 1.5, this.red);
    this.television(left, 0.2, 5.1, 0, 2.9, false); this.books(left, -2.8, 5.1, 0, 6); this.lantern(left, 2.3, 5.1, 0, 0.95);
    this.robot(left, -1.9, 7.7, 0, 0.95); this.robot(left, -0.6, 7.7, 0, 0.65); this.lava(left, 0.9, 7.7, 0); this.globe(left, 2.3, 7.7, 0);
    this.helmet(left, -2.1, 10.2, 0); this.plasma(left, 0, 10.2, 0); this.chest(left, 1.35, 10.2, 0, 1.3, this.red); this.plant(left, 2.3, 10.2, 0, 1.2, true);
    this.art(left, 3.6, 1.4, -0.7, 13.5, 0.1, c => this.text(c, ['LES BONNES IDÉES', 'COMMENCENT AU SOUS-SOL'], 512, c.canvas.height));
    this.plant(left, -2.8, 12.6, 0, 1.4, true);
    // Meuble bas sous la fenêtre : le mur latéral reste disponible pour l'établi.
    const right = this.shelf(11.0, -0.4, 6.3, [0.4, 3.2, 6.2], 8.6);
    this.chest(right, -1.7, 0.5, 0, 2.4); this.chest(right, 1.4, 0.5, 0, 2.2, this.red);
    this.books(right, -2.7, 3.3, 0, 7); this.radio(right, 0.5, 3.3, 0, 2.3); this.books(right, 2.2, 3.3, 0, 4);
    this.television(right, -1.0, 6.3, 0, 3.2, true); this.rocket(right, 1.25, 6.3, 0, 0.7); this.plant(right, 2.5, 6.3, 0, 1.0);
  }
  private lava(parent: THREE.Object3D, x: number, y: number, z: number) {
    this.cylinder(parent, 0.26, 0.45, x, y + 0.23, z, this.iron, 0.18);
    this.cylinder(parent, 0.2, 1.1, x, y + 1, z, new THREE.MeshStandardMaterial({ color: '#457f92', transparent: true, opacity: 0.32, roughness: 0.12, depthWrite: false }), 0.14);
    for (let i = 0; i < 4; i++) this.ball(parent, 0.11 + i % 2 * 0.03, x + Math.sin(i * 3) * 0.08, y + 0.6 + i * 0.25, z, this.cyan).scale.y = 1.6;
    this.cylinder(parent, 0.15, 0.25, x, y + 1.7, z, this.iron, 0.09);
  }
  private globe(parent: THREE.Object3D, x: number, y: number, z: number) {
    this.cylinder(parent, 0.27, 0.1, x, y + 0.05, z, this.brass); this.cylinder(parent, 0.06, 0.34, x, y + 0.25, z, this.brass);
    const map = canvasMap(256, 128, c => {
      c.fillStyle = '#619093'; c.fillRect(0, 0, 256, 128); c.fillStyle = '#bdad6b';
      for (let i = 0; i < 27; i++) { c.beginPath(); c.ellipse(random(i) * 256, random(i + 5) * 128, 6 + random(i + 6) * 19, 3 + random(i + 4) * 16, i, 0, Math.PI * 2); c.fill(); }
    });
    this.ball(parent, 0.48, x, y + 0.86, z, new THREE.MeshStandardMaterial({ map, roughness: 0.63 }));
    this.ring(parent, 0.55, 0.025, x, y + 0.86, z, this.brass).rotation.y = -0.35;
  }
  private rocket(parent: THREE.Object3D, x: number, y: number, z: number, s: number) {
    const g = this.group(x, y, z, parent); g.scale.setScalar(s);
    this.cylinder(g, 0.25, 1.5, 0, 1.05, 0, this.cream, 0.2); this.mesh(g, new THREE.ConeGeometry(0.21, 0.6, 16), this.red, 0, 2.1, 0);
    for (const sign of [-1, 1]) this.box(g, 0.15, 0.8, 0.5, sign * 0.31, 0.45, 0, this.red).rotation.z = sign * -0.25;
    this.ball(g, 0.14, 0, 1.45, 0.2, this.iron).scale.z = 0.4;
  }
  private stove() {
    const g = this.group(9.2, FLOOR, 2.0); g.rotation.y = -0.22;
    this.box(g, 2.7, 0.16, 2.6, 0, 0.15, 0, this.iron);
    for (const x of [-0.85, 0.85]) for (const z of [-0.65, 0.65]) this.box(g, 0.18, 0.5, 0.2, x, 0.47, z, this.iron);
    this.box(g, 2.25, 3.25, 1.9, 0, 2.25, 0, this.iron, 0.18);
    this.box(g, 2.5, 0.2, 2.12, 0, 3.95, 0, this.iron);
    this.box(g, 1.85, 2.3, 0.16, 0, 2.35, 1.02, this.brass, 0.07);
    this.box(g, 1.64, 2.1, 0.17, 0, 2.35, 1.12, this.iron, 0.09);
    const fire = this.art(g, 1.45, 1.85, 0, 2.35, 1.22, c => {
      const h = c.canvas.height; c.fillStyle = '#27150c'; c.fillRect(0, 0, 512, h);
      const glow = c.createRadialGradient(256, h * 0.74, 0, 256, h * 0.74, h * 0.75); glow.addColorStop(0, '#dc5a0a'); glow.addColorStop(1, '#130e0a'); c.fillStyle = glow; c.fillRect(0, 0, 512, h);
      for (let i = 0; i < 14; i++) {
        const x = 40 + i * 33, bottom = h * 0.88, tip = h * (0.15 + random(i) * 0.55);
        c.fillStyle = ['#e96510', '#fca520', '#ffcf53'][i % 3]; c.beginPath(); c.moveTo(x - 36, bottom); c.bezierCurveTo(x - 70, bottom - 50, x + 20, tip + 60, x, tip); c.bezierCurveTo(x + 70, tip + 80, x + 45, bottom - 30, x + 30, bottom); c.fill();
      }
      c.strokeStyle = '#3f261a'; c.lineWidth = 25; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(50, h * (0.85 + i * 0.035)); c.lineTo(460, h * (0.93 - i * 0.035)); c.stroke(); }
    }, false);
    const fireMap = (fire.material as THREE.MeshStandardMaterial).map;
    fire.material = new THREE.MeshStandardMaterial({ map: fireMap, emissiveMap: fireMap, emissive: '#ffb65c', emissiveIntensity: 0.4, roughness: 0.6 });
    this.rod(g, [0.92, 1.8, 1.28], [0.92, 2.45, 1.28], 0.065, this.brass);
    // Le conduit rejoint le jambage en pierre, à côté de la fenêtre et derrière la machine.
    const flue = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.5, 4.05, -0.3), new THREE.Vector3(0.5, 5.2, -0.3),
      new THREE.Vector3(-0.2, 5.8, -0.9), new THREE.Vector3(-2.8, 5.8, -2.35),
      new THREE.Vector3(-3.7, 6.7, -2.35), new THREE.Vector3(-3.7, 16.4, -2.35),
    ]);
    this.mesh(g, new THREE.TubeGeometry(flue, 40, 0.25, 12, false), this.iron, 0, 0, 0);
    for (const t of [0.04, 0.22, 0.45, 0.62, 0.82, 0.97]) {
      const point = flue.getPoint(t), ring = this.ring(g, 0.27, 0.035, point.x, point.y, point.z, this.iron);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), flue.getTangent(t));
    }
    this.cylinder(g, 0.47, 0.64, -0.35, 4.4, 0.15, this.iron); this.cylinder(g, 0.5, 0.1, -0.35, 4.77, 0.15, this.iron, 0.35);
    this.ring(g, 0.2, 0.04, -0.85, 4.5, 0.15, this.brass);
    for (let i = 0; i < 9; i++) {
      const x = -1.5 + i % 3 * 0.45, y = 0.35 + Math.floor(i / 3) * 0.43;
      const log = this.cylinder(g, 0.23, 1.3, x - 1, y, 0, this.darkWood); log.rotation.x = Math.PI / 2;
      this.cylinder(g, 0.21, 0.015, x - 1, y, 0.66, this.wood).rotation.x = Math.PI / 2;
    }
    const light = new THREE.PointLight('#ff9b45', 24, 11); light.position.set(9.2, FLOOR + 2.5, 3.4); this.scene.add(light);
  }
  private helmet(parent: THREE.Object3D, x: number, y: number, z: number) {
    this.box(parent, 0.95, 0.1, 0.8, x, y + 0.05, z, this.darkWood);
    this.ball(parent, 0.5, x, y + 0.65, z, this.iron);
    this.ball(parent, 0.37, x, y + 0.66, z + 0.32, this.brass).scale.set(1.05, 0.65, 0.45);
    this.ball(parent, 0.3, x, y + 0.66, z + 0.41, this.iron).scale.set(1.1, 0.65, 0.15);
    for (const sign of [-1, 1]) this.cylinder(parent, 0.18, 0.18, x + sign * 0.51, y + 0.57, z, this.brass).rotation.z = Math.PI / 2;
    this.rod(parent, [x - 0.3, y + 0.45, z + 0.3], [x - 0.45, y + 0.2, z + 0.55], 0.045, this.iron);
  }
  private plasma(parent: THREE.Object3D, x: number, y: number, z: number) {
    this.cylinder(parent, 0.37, 0.2, x, y + 0.1, z, this.iron);
    const glass = new THREE.MeshStandardMaterial({ color: '#756299', transparent: true, opacity: 0.15, roughness: 0.15, depthWrite: false });
    this.ball(parent, 0.5, x, y + 0.67, z, glass);
    const purple = new THREE.MeshStandardMaterial({ color: '#d198ef', emissive: '#ae42ed', emissiveIntensity: 2.4 });
    this.ball(parent, 0.07, x, y + 0.67, z, purple);
    for (let i = 0; i < 9; i++) {
      const angle = i * Math.PI * 2 / 9, dx = Math.cos(angle), dy = Math.sin(angle);
      this.rod(parent, [x, y + 0.67, z], [x + dx * 0.24, y + 0.67 + dy * 0.21, z + 0.05], 0.008, purple);
      this.rod(parent, [x + dx * 0.24, y + 0.67 + dy * 0.21, z + 0.05], [x + dx * 0.46, y + 0.67 + dy * 0.46, z + 0.06], 0.008, purple);
    }
  }
  private invention(parent = this.root, x = 16.9, y: number = FLOOR, z = -0.15, green = false) {
    const g = this.group(x, y, z, parent);
    // Prototype décoratif de Papy : aucun achat ni nouveau système de jeu.
    this.cylinder(g, 1.38, 0.3, 0, 0.2, 0, this.iron);
    this.cylinder(g, 1.12, 4, 0, 2.4, 0, this.red);
    this.cylinder(g, 1.17, 0.23, 0, 4.4, 0, this.brass);
    this.mesh(g, new THREE.CylinderGeometry(1.03, 1.03, 4.2, 24, 1, true, Math.PI * 0.35, Math.PI * 1.3), this.cream, 0, 6.6, 0);
    for (const x of [-0.84, 0.84]) this.box(g, 0.22, 4.2, 0.36, x, 6.6, 0.72, this.cream, 0.1);
    const chamberGlass = new THREE.MeshStandardMaterial({ color: green ? '#9cba4f' : '#5492b0', transparent: true, opacity: 0.17, roughness: 0.12, metalness: 0.25, depthWrite: false });
    this.cylinder(g, 0.86, 3.7, 0, 6.6, 0, chamberGlass);
    const electric = new THREE.MeshStandardMaterial({ color: green ? '#d9f77c' : '#8dd9fc', emissive: green ? '#9de44c' : '#4b9bfb', emissiveIntensity: 2.3 });
    this.cylinder(g, 0.09, 3.4, 0, 6.6, 0, this.iron);
    for (let i = 0; i < 5; i++) this.ring(g, 0.26, 0.022, 0, 5.2 + i * 0.66, 0.05, electric).rotation.y = 0.25;
    for (let i = 0; i < 21; i++) {
      const y = 4.95 + i * 0.16;
      this.rod(g, [(random(i) - 0.5) * 0.28, y, 0.25], [(random(i + 1) - 0.5) * 0.28, y + 0.16, 0.25], 0.015, electric);
    }
    this.cylinder(g, 1.18, 0.3, 0, 8.8, 0, this.brass);
    this.cylinder(g, 0.88, 0.7, 0, 9.3, 0, this.red, 0.36);
    this.cylinder(g, 0.18, 0.28, 0, 9.8, 0, this.brass);
    this.box(g, 1.65, 1.8, 0.25, 0, 2.5, 1.12, this.cream, 0.12);
    this.box(g, 0.96, 0.47, 0.08, 0, 2.85, 1.29, this.iron);
    for (let i = 0; i < 3; i++) for (const y of [2.1, 2.45]) this.ball(g, 0.08, -0.45 + i * 0.45, y, 1.32, i % 2 ? this.teal : this.red);
    for (const y of [4.8, 8.35]) for (let i = 0; i < 10; i++) {
      const a = i * Math.PI / 5; this.ball(g, 0.065, Math.sin(a) * 1.05, y, Math.cos(a) * 1.05, this.brass);
    }
    this.rod(g, [-1.2, 0.5, 0.15], [-1.2, 4.5, 0.15], 0.09, this.brass);
    this.ring(g, 0.3, 0.04, 1.15, 4.1, 0.8, this.brass);
    this.ball(g, 0.29, 1.15, 4.1, 0.82, this.cream).scale.z = 0.15;
    this.rod(g, [1.15, 4.1, 0.87], [1.28, 4.25, 0.87], 0.02, this.iron);
    const duct = new THREE.CatmullRomCurve3([new THREE.Vector3(0.6, 8.9, -0.3), new THREE.Vector3(0.6, 10.8, -0.3), new THREE.Vector3(0.9, 13, -0.4), new THREE.Vector3(1.1, 15.8, -0.5)]);
    this.mesh(g, new THREE.TubeGeometry(duct, 28, 0.28, 12, false), this.iron, 0, 0, 0);
    for (let i = 0; i < 22; i++) {
      const t = i / 21, point = duct.getPoint(t), ring = this.ring(g, 0.3, 0.035, point.x, point.y, point.z, this.brass);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), duct.getTangent(t));
    }
    this.cylinder(g, 0.23, 1.6, -1.6, 0.8, 0.4, this.red, 0.23); this.ball(g, 0.23, -1.6, 1.6, 0.4, this.red);
    this.rod(g, [-1.6, 1.8, 0.4], [-1.25, 1.85, 0.4], 0.05, this.brass);
  }
  private workshop() {
    const root = this.workshopRoot;
    this.box(root, 1.15, 5.8, 1.4, 6.9, FLOOR + 2.9, -0.2, this.sage, 0.1);
    this.box(root, 1.03, 5.5, 0.08, 6.9, FLOOR + 2.9, 0.55, this.brass);
    this.box(root, 0.14, 0.55, 0.12, 7.2, -4.1, 0.65, this.iron);
    for (let i = 0; i < 4; i++) this.box(root, 0.57, 0.035, 0.06, 6.9, -2.25 - i * 0.15, 0.63, this.iron, 0.005);
    this.box(root, 2.2, 2.9, 1.8, 8.6, -3.8, 0.05, this.darkWood);
    for (let i = 0; i < 4; i++) {
      this.box(root, 2, 0.62, 0.14, 8.6, -2.77 - i * 0.69, 1, this.darkWood);
      this.box(root, 0.56, 0.06, 0.1, 8.6, -2.77 - i * 0.69, 1.13, this.brass);
      this.box(root, 0.35, 0.11, 0.015, 8.04, -2.77 - i * 0.69, 1.08, this.paper);
    }
    // Petites fournitures de l’établi ; aucun livre ni commande d’achat dans la cave.
    for (let i = 0; i < 13; i++) {
      const x = 7.6 + i * 0.58, y = 1.45 - i % 3 * 0.17;
      this.rod(root, [x, y, -0.93], [x, y - 1.1, -0.93], 0.035, this.iron);
      if (i % 3 === 0) {
        this.ring(root, 0.12, 0.04, x, y + 0.04, -0.93, this.iron);
        this.ring(root, 0.14, 0.04, x, y - 1.12, -0.93, this.iron);
      } else {
        this.box(root, 0.13, 0.4, 0.15, x, y - 1.1, -0.92, i % 2 ? this.red : this.sage);
        if (i % 4 === 0) this.box(root, 0.43, 0.13, 0.15, x, y - 0.02, -0.93, this.iron);
      }
    }
    for (let i = 0; i < 5; i++) this.books(root, 7.5 + i * 0.48, -5.45, 0, 2, true);
    this.chest(root, 10.4, -5.7, 0, 2.3, this.darkWood);
    this.chest(root, 14.2, -5.4, 0, 1.5);
    this.box(root, 8.2, 0.22, 2.7, 11.2, -5.6, 0.05, this.darkWood);
    this.lantern(root, 15.5, 2.6, -0.4, 0.8);
    this.plant(this.root, 7.5, 3.98, -0.7, 1.25); this.plant(this.root, 13.8, 3.98, -0.7, 1.2);
    for (const x of [7.05, 15.1]) {
      this.art(root, 0.45, 0.7, x, 1.3, -0.96, c => {
        c.fillStyle = '#d0b886'; c.fillRect(0, 0, 512, c.canvas.height); c.strokeStyle = '#675c3b'; c.lineWidth = 5;
        for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(50, 90 + i * 55); c.lineTo(430 - i % 3 * 80, 90 + i * 55); c.stroke(); }
      }, false);
    }
    this.box(root, 1.3, 1.1, 0.4, 14.1, 1.15, -0.75, this.iron, 0.1);
    const oscilloscope = this.art(root, 0.95, 0.65, 14.1, 1.24, -0.51, c => {
      c.fillStyle = '#163934'; c.fillRect(0, 0, 512, c.canvas.height); c.strokeStyle = '#8dd8b5'; c.lineWidth = 5; c.beginPath();
      for (let x = 0; x < 512; x++) { const y = c.canvas.height / 2 + Math.sin(x / 25) * Math.sin(x / 140) * 85; if (x) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke();
    }, false);
    oscilloscope.material = new THREE.MeshBasicMaterial({ map: (oscilloscope.material as THREE.MeshStandardMaterial).map });
    for (const x of [13.8, 14.1, 14.4]) this.ball(root, 0.06, x, 0.75, -0.48, this.brass);
    const light = new THREE.PointLight('#ffb15a', 40, 14); light.position.set(11.2, 2.3, 1.5); root.add(light);
    // Plan de fabrication, trombones et petits composants, tous posés sur l'établi.
    const plan = this.art(root, 1.2, 0.9, 8.1, -1.38, 0.25, c => this.blueprint(c), false); plan.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 6; i++) this.cylinder(root, 0.07, 0.25, 12.85 + i * 0.19, -1.23, -0.6, this.brass).rotation.z = Math.PI / 2;
  }
  private blueprint(c: CanvasRenderingContext2D, variant = 0) {
    const h = c.canvas.height; c.fillStyle = variant % 3 ? '#c1aa7f' : '#28404a'; c.fillRect(0, 0, 512, h);
    c.strokeStyle = '#b6c4af55'; c.lineWidth = 1;
    for (let i = 0; i < 512; i += 32) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); }
    for (let i = 0; i < h; i += 32) { c.beginPath(); c.moveTo(0, i); c.lineTo(512, i); c.stroke(); }
    c.strokeStyle = variant % 3 ? '#605642' : '#dad8b6'; c.lineWidth = 3; c.beginPath(); c.moveTo(180, h * 0.78); c.lineTo(180, h * 0.35); c.quadraticCurveTo(180, h * 0.12, 256, h * 0.08); c.quadraticCurveTo(332, h * 0.12, 332, h * 0.35); c.lineTo(332, h * 0.78); c.closePath(); c.stroke();
    for (const y of [0.35, 0.5, 0.65]) { c.strokeRect(200, h * y, 112, 36); c.beginPath(); c.moveTo(332, h * y); c.lineTo(440, h * (y - 0.04)); c.stroke(); }
    c.beginPath(); c.moveTo(180, h * 0.6); c.lineTo(118, h * 0.87); c.lineTo(180, h * 0.78); c.moveTo(332, h * 0.6); c.lineTo(394, h * 0.87); c.lineTo(332, h * 0.78); c.stroke();
    if (variant % 3 === 1) { c.fillStyle = '#c1aa7f'; c.fillRect(60, 40, 390, h - 100); c.strokeStyle = '#605642'; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(130 + i % 2 * 190, 100 + i * h / 8, 44 + i * 7, 0, Math.PI * 2); c.stroke(); c.strokeRect(105 + i % 2 * 190, 80 + i * h / 8, 50, 40); } }
    if (variant % 3 === 2) { c.strokeRect(80, 90, 65, h - 200); c.strokeRect(370, 140, 70, h - 300); for (let i = 0; i < 7; i++) { c.beginPath(); c.moveTo(140, 180 + i * 55); c.lineTo(380, 205 + i * 48); c.stroke(); } }
    c.fillStyle = variant % 3 ? '#605642' : '#d4ceb1'; c.font = '20px monospace'; c.fillText('PAPY — ESSAI 047', 25, h - 30);
  }
  private wallDetails() {
    const dart = this.art(this.root, 1.55, 1.55, 6.65, 2.6, -1.07, c => {
      c.fillStyle = '#202822'; c.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 20; i++) {
        const a = i * Math.PI / 10;
        c.fillStyle = i % 2 ? '#c3ab7e' : '#29332b'; c.beginPath(); c.moveTo(256, 256); c.arc(256, 256, 225, a, a + Math.PI / 10); c.closePath(); c.fill();
        c.strokeStyle = i % 2 ? '#96472d' : '#5c7050'; c.lineWidth = 12;
        for (const r of [126, 210]) { c.beginPath(); c.arc(256, 256, r, a, a + Math.PI / 10); c.stroke(); }
      }
      c.strokeStyle = '#9b9270'; c.lineWidth = 2;
      for (const r of [126, 210, 225]) { c.beginPath(); c.arc(256, 256, r, 0, Math.PI * 2); c.stroke(); }
      c.fillStyle = '#91452b'; c.beginPath(); c.arc(256, 256, 14, 0, Math.PI * 2); c.fill();
    }, false);
    dart.geometry.dispose(); dart.geometry = new THREE.CircleGeometry(0.775, 48);
    this.ring(this.root, 0.8, 0.05, dart.position.x, dart.position.y, -1.07, this.darkWood);
    this.art(this.root, 2.6, 3.5, -7.25, 5.5, -0.95, c => this.text(c, ['RÊVER', 'BRICOLER', 'RECOMMENCER'], 512, c.canvas.height));
    // Le panneau de plans se trouve sur le retour de mur, visible de l'atelier.
    const board = this.group(18.3, 5.4, 8); board.rotation.y = -Math.PI / 2;
    this.box(board, 6.5, 6.2, 0.15, 0, 0, 0, this.darkWood);
    for (let i = 0; i < 6; i++) {
      const x = -2.15 + i % 3 * 2.1, y = 1.45 - Math.floor(i / 3) * 2.9;
      const sheet = this.art(board, 1.8, 2.5, x, y, 0.1, c => this.blueprint(c, i + 1), false); sheet.rotation.z = (random(i + 2) - 0.5) * 0.13;
      this.box(board, 0.45, 0.12, 0.03, x - 0.5, y + 1.2, 0.15, this.paper).rotation.z = -0.3;
    }
    this.plant(this.root, -6.8, 7.7, -1.1, 1.5, true);
    for (let i = 0; i < 7; i++) {
      const x = -7.4 + (i % 2) * 1.1, y = -4.7 + Math.floor(i / 2) * 1.1;
      this.art(this.root, 0.82, 0.64, x, y, -1.08, c => {
        c.fillStyle = '#c8b994'; c.fillRect(0, 0, 512, c.canvas.height); c.fillStyle = '#4e5d55'; c.fillRect(25, 25, 462, c.canvas.height - 70);
        c.fillStyle = '#2f3d39'; c.beginPath(); c.moveTo(25, 220); c.lineTo(180, 80); c.lineTo(310, 210); c.lineTo(410, 130); c.lineTo(487, 240); c.fill();
        c.fillStyle = '#b7a487'; c.beginPath(); c.arc(270, 125, 26, 0, Math.PI * 2); c.fill(); c.fillStyle = '#735642'; c.fillRect(245, 155, 50, 85);
      });
    }
    // Boîtier et conduit électrique distincts des écrans de jeu.
    // Il part du flanc extérieur de la cage d’escalier (x = -16,29) : rien ne dépasse dans la montée.
    for (const y of [7.7, 8.15]) {
      this.rod(this.root, [STAIRS.x + 2.71, y, -1.25], [17.8, y, -1.25], 0.055, this.iron);
      for (let i = 0; i < 8; i++) this.box(this.root, 0.12, 0.23, 0.12, -14 + i * 4, y, -1.22, this.brass);
    }
  }
  private lighting() {
    const pendant = this.group(-13.5, 7.1, 6.8);
    this.cylinder(pendant, 0.03, 1.6, 0, 1.25, 0, this.iron);
    this.cylinder(pendant, 0.3, 0.12, 0, 0.42, 0, this.iron, 0.21);
    this.ball(pendant, 0.22, 0, 0, 0, this.amber).scale.y = 1.35;
    for (const y of [-0.4, 0.4]) this.ring(pendant, 0.4, 0.025, 0, y, 0, this.brass).rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; this.rod(pendant, [Math.sin(a) * 0.4, -0.4, Math.cos(a) * 0.4], [Math.sin(a) * 0.4, 0.4, Math.cos(a) * 0.4], 0.02, this.brass); }
    // La guirlande part du flanc extérieur de la cage d’escalier (x = -16,29) : rien ne traverse le coffrage.
    const start = -16.1, span = 34.1;
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 25 }, (_, i) => new THREE.Vector3(start + i * span / 24, 8 - Math.sin(i / 24 * Math.PI) * 0.8, -0.8)));
    this.mesh(this.root, new THREE.TubeGeometry(curve, 50, 0.022, 5, false), this.iron, 0, 0, 0);
    for (let i = 0; i < 17; i++) {
      const x = -15.5 + i * 2, y = 8 - Math.sin((x - start) / span * Math.PI) * 0.8;
      this.cylinder(this.root, 0.055, 0.17, x, y - 0.1, -0.8, this.iron);
      this.ball(this.root, 0.09, x, y - 0.28, -0.8, this.amber).scale.y = 1.3;
    }
    // Réflecteurs au-dessus de la machine, fixés au bois.
    for (const x of [-4.35, 4.35]) {
      this.rod(this.root, [x, 7.3, -0.7], [x, 7.6, 0.7], 0.07, this.iron);
      this.cylinder(this.root, 0.43, 0.33, x, 7.23, 0.7, this.iron, 0.18);
      this.cylinder(this.root, 0.3, 0.04, x, 7.04, 0.7, this.amber);
      const light = new THREE.SpotLight('#ffcd83', 42, 18, 0.78, 0.7, 1.4); light.position.set(x, 7, 1.2); light.target.position.set(x * 0.5, -2, 0.5); this.scene.add(light, light.target);
    }
    const sign = this.art(this.root, 8.6, 0.92, 0, 7.18, -0.3, c => {
      c.clearRect(0, 0, 512, c.canvas.height); c.fillStyle = '#dab781'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 36px Georgia'; c.fillText('★ MASTER PLINKO ★', 256, c.canvas.height / 2, 500);
    }, false);
    (sign.material as THREE.MeshStandardMaterial).transparent = true;
    const leftLight = new THREE.PointLight('#ffb15a', 80, 22); leftLight.position.set(-13.5, 6.7, 6.8); this.scene.add(leftLight);
    const tableLight = new THREE.PointLight('#ffc175', 19, 12); tableLight.position.set(-13.5, FLOOR + 2.7, 10.1); this.scene.add(tableLight);
  }
  /** Face opposée au Plinko, découverte depuis les marches : aucun écran ni achat ajouté. */
  private rearWorkshop() {
    const rear = this.group(-3, FLOOR, CAVE.rearZ - 0.9); rear.rotation.y = Math.PI; rear.name = 'cave:rear-workshop';
    this.rearWindow(rear); this.rearBench(rear); this.rearShelves(rear); this.rearHangingModels(rear); this.rearSideBay(rear);
    this.invention(rear, 16, 0, 2.1, true);
    // Socle rayé, conduites de cuivre et manomètre du prototype vert.
    this.box(rear, 4.1, 0.25, 3.4, 16, 0.17, 2.1, this.iron);
    for (let i = 0; i < 10; i++) this.box(rear, 0.23, 0.3, 0.045, 14.15 + i * 0.4, 0.37, 3.83, i % 2 ? this.iron : this.brass).rotation.z = -0.35;
    for (const x of [13.9, 18.1]) {
      this.rod(rear, [x, 0.3, 1.4], [x, 5.3, 1.4], 0.11, this.brass);
      this.rod(rear, [x, 5.3, 1.4], [x < 16 ? 15.1 : 16.9, 5.3, 1.4], 0.11, this.brass);
      this.ring(rear, 0.23, 0.04, x, 3.9, 1.55, this.red);
    }
    const green = new THREE.PointLight('#b8ef5b', 18, 12); green.position.set(16, 6.6, 3.0); rear.add(green);
    const core = new THREE.MeshStandardMaterial({ color: '#d6ee72', emissive: '#a9d847', emissiveIntensity: 1.5, metalness: 0.3, roughness: 0.25 });
    this.ball(rear, 0.35, 16, 6.6, 2.2, core);
    this.ring(rear, 0.46, 0.035, 16, 6.6, 2.2, this.brass).rotation.y = 0.6;
    // Instruments et plaquettes sur le châssis, indépendants des commandes du jeu.
    this.art(rear, 0.85, 0.85, 17.15, 4.05, 3.1, c => {
      c.fillStyle = '#d0c198'; c.fillRect(0, 0, 512, 512); c.strokeStyle = '#3b3b2c'; c.lineWidth = 10;
      c.beginPath(); c.arc(256, 256, 220, 0, Math.PI * 2); c.stroke();
      for (let i = 0; i < 11; i++) { const a = Math.PI * (0.8 + i * 0.14); c.beginPath(); c.moveTo(256 + Math.cos(a) * 170, 256 + Math.sin(a) * 170); c.lineTo(256 + Math.cos(a) * 200, 256 + Math.sin(a) * 200); c.stroke(); }
      c.strokeStyle = '#a84529'; c.beginPath(); c.moveTo(256, 256); c.lineTo(365, 125); c.stroke();
    });
    this.art(rear, 1.1, 0.5, 16, 1.65, 3.3, c => { c.fillStyle = '#c2b188'; c.fillRect(0, 0, 512, c.canvas.height); c.fillStyle = '#4a3829'; c.font = 'bold 65px monospace'; c.textAlign = 'center'; c.fillText('ESSAI 047', 256, 90); }, false);
    for (let i = 0; i < 8; i++) this.ball(rear, 0.05, 15.25 + i % 4 * 0.5, 1.95 + Math.floor(i / 4) * 1.4, 3.4, this.brass);
    this.rearAquarium(rear); this.rearForeground(rear);
    const rug = this.box(rear, 23, 0.06, 13.5, 0, 0.13, 9, wovenRug(), 0.03); rug.rotation.y = 0.025;
    for (let i = 0; i < 66; i++) for (const z of [2.1, 15.9]) this.box(rear, 0.035, 0.025, 0.32, -11.3 + i * 0.35, 0.14, z, this.paper, 0.005);
    for (const [x, z, width, depth] of [[-6, 2.2, 17, 4.3], [-4.9, 6.1, 3.8, 3.8], [3.8, 1.8, 4.4, 4], [16, 2.1, 5.5, 5], [19.2, 12, 5.6, 5.3], [-9.8, 19, 10.5, 6]]) this.floorShadow(rear, x, z, width, depth);
    // Conduites, colliers et câbles sous le plafond, raccordés aux murs latéraux.
    for (const y of [14.9, 15.5, 16.1]) {
      this.rod(rear, [-21.5, y, 0.4], [21.5, y, 0.4], y === 15.5 ? 0.13 : 0.065, y === 15.5 ? this.brass : this.iron);
      for (let i = 0; i < 11; i++) this.ring(rear, 0.15, 0.035, -20 + i * 4, y, 0.4, this.iron).rotation.y = Math.PI / 2;
    }
    this.rod(rear, [-13.5, 0.5, 0.7], [-13.5, 15.5, 0.7], 0.18, this.iron);
    for (const y of [3, 7, 11, 14.4]) this.ring(rear, 0.21, 0.04, -13.5, y, 0.7, this.brass).rotation.x = Math.PI / 2;
    const pendant = this.group(-5.5, 14.5, 5.4, rear);
    this.cylinder(pendant, 0.045, 2.4, 0, 1.3, 0, this.iron);
    this.mesh(pendant, new THREE.ConeGeometry(1.05, 0.65, 20, 1, true), this.iron, 0, 0, 0);
    this.ball(pendant, 0.23, 0, -0.2, 0, this.amber);
    const warm = new THREE.PointLight('#ffbc72', 175, 45); warm.position.set(-4, 11.5, 7); rear.add(warm);
    const benchLight = new THREE.PointLight('#ffd095', 44, 19); benchLight.position.set(-6, 7.4, 4.1); rear.add(benchLight);
    const blue = new THREE.PointLight('#5b86e1', 90, 27); blue.position.set(8.2, 12, 1.7); rear.add(blue);
    const leftGlow = new THREE.PointLight('#ffad5c', 85, 22); leftGlow.position.set(-17, 10, 5); rear.add(leftGlow);
    const copperGlow = new THREE.PointLight('#ffb568', 90, 22); copperGlow.position.set(15, 10, 7); rear.add(copperGlow);
    this.lantern(rear, -19.3, 13.9, 3, 0.95); this.lantern(rear, 20, 14.6, 6, 0.8);
    const dust = new Float32Array(72 * 3);
    for (let i = 0; i < 72; i++) dust.set([-19 + random(i) * 38, 2 + random(i + 4) * 12, 2 + random(i + 8) * 12], i * 3);
    const dustGeometry = new THREE.BufferGeometry(); dustGeometry.setAttribute('position', new THREE.BufferAttribute(dust, 3));
    rear.add(new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: '#e5c88f', size: 0.022, transparent: true, opacity: 0.24, depthWrite: false })));
  }
  private rearWindow(rear: THREE.Group) {
    const window = this.group(8.2, 11.8, 0, rear); window.name = 'cave:rear-window';
    const night = this.art(window, 11.1, 5.9, 0, 0, -0.1, c => {
      const h = c.canvas.height, sky = c.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#102952'); sky.addColorStop(0.65, '#215496'); sky.addColorStop(1, '#162e46'); c.fillStyle = sky; c.fillRect(0, 0, 512, h);
      c.fillStyle = '#6886af'; c.beginPath(); c.arc(388, 44, 6, 0, Math.PI * 2); c.fill();
      for (let layer = 0; layer < 3; layer++) {
        c.fillStyle = ['#1a385a', '#183c51', '#152c37'][layer]; c.beginPath(); c.moveTo(0, h);
        for (let x = 0; x <= 512; x += 26) c.lineTo(x, h * (0.48 + layer * 0.12) + Math.sin(x * 0.03 + layer * 3) * 24);
        c.lineTo(512, h); c.fill();
      }
    }, false);
    night.material = new THREE.MeshBasicMaterial({ map: (night.material as THREE.MeshStandardMaterial).map, color: '#b7c8e8', toneMapped: false });
    for (let i = 0; i < 17; i++) {
      const tree = this.group(-5.1 + i * 0.63, -2.8, 0.03, window), h = 0.75 + random(i + 21) * 1.6;
      for (let tier = 0; tier < 3; tier++) this.mesh(tree, new THREE.ConeGeometry((0.45 - tier * 0.1) * h, h, 5), new THREE.MeshBasicMaterial({ color: i % 3 ? '#153c40' : '#1e4c53' }), 0, h * 0.32 + tier * h * 0.3, 0);
    }
    const rain: number[] = [];
    for (let i = 0; i < 80; i++) { const x = -5.3 + random(i * 3) * 10.6, y = -2.8 + random(i * 7 + 11) * 5.6; rain.push(x, y, 0.15, x + 0.035, Math.min(2.88, y + 0.24), 0.15); }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(rain, 3));
    window.add(new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: '#8dbbff', transparent: true, opacity: 0.47 })));
    for (const x of [-5.7, 0, 5.7]) this.box(window, 0.17, 6.4, 0.38, x, 0, 0.4, this.darkWood);
    for (const y of [-3.2, 3.2]) this.box(window, 11.7, 0.22, 0.42, 0, y, 0.4, this.darkWood);
    this.box(window, 12.1, 0.2, 1.25, 0, -3.35, 0.8, this.darkWood);
    for (const [x, s] of [[-4.8, 0.9], [-1.3, 0.72], [2.3, 0.9], [4.5, 1]]) this.plant(window, x, -3.25, 0.7, s);
    this.lantern(window, 0.7, -3.25, 0.7, 0.72);
    // Lunette orientée vers la baie, avec trépied et cercle de mise au point.
    const telescope = this.group(8.1, 0, 4.4, rear);
    for (const a of [0, 2.1, 4.2]) this.rod(telescope, [Math.sin(a) * 1.3, 0.2, Math.cos(a) * 1.3], [0, 6.5, 0], 0.09, this.darkWood);
    this.cylinder(telescope, 0.28, 0.3, 0, 6.7, 0, this.brass);
    this.rod(telescope, [-1.1, 7.3, 1.2], [1.2, 8.8, -1.4], 0.28, this.iron);
    this.rod(telescope, [-1.4, 7.1, 1.55], [-0.9, 7.45, 1], 0.16, this.brass);
    this.ball(telescope, 0.3, 1.2, 8.8, -1.4, this.cyan).scale.z = 0.2;
    this.ring(telescope, 0.31, 0.055, 0, 8, 0, this.brass).rotation.y = 0.7;
  }
  private rearBench(rear: THREE.Group) {
    this.art(rear, 13.4, 8.1, -6, 11, 0.25, c => this.chalkboard(c));
    this.art(rear, 3.1, 6.7, -0.75, 11.4, 0.41, c => this.text(c, ['PLAN :', '□ INVENTER', '□ TESTER', '□ RATER', '□ AMÉLIORER', '□ RÉUSSIR', '☺'], 512, c.canvas.height));
    const desk = this.group(-6, 0, 2.2, rear);
    this.box(desk, 15.5, 0.43, 3.6, 0, 5.1, 0, this.darkWood, 0.1);
    for (const x of [-6.8, 6.8]) for (const z of [-1.25, 1.25]) this.box(desk, 0.34, 5, 0.35, x, 2.5, z, this.darkWood);
    this.box(desk, 14, 0.25, 2.8, 0, 1.2, 0, this.darkWood);
    for (const x of [-5.3, 5.3]) {
      this.box(desk, 2.5, 3.6, 2.6, x, 2.8, 0, x < 0 ? this.sage : this.iron);
      for (let row = 0; row < 5; row++) {
        this.box(desk, 2.32, 0.61, 0.11, x, 1.38 + row * 0.67, 1.36, x < 0 ? this.brass : this.iron);
        this.box(desk, 0.55, 0.07, 0.12, x, 1.38 + row * 0.67, 1.48, this.brass);
        this.box(desk, 0.45, 0.18, 0.025, x - 0.65, 1.4 + row * 0.67, 1.43, this.paper, 0.01);
      }
    }
    this.chest(desk, -1.8, 1.35, 0, 2.4); this.chest(desk, 1.1, 1.35, 0, 2.3, this.darkWood); this.books(desk, 2.1, 1.35, 0, 4, true);
    const plan = this.art(desk, 3.4, 2.1, -0.4, 5.34, 0.1, c => this.blueprint(c), false); plan.rotation.x = -Math.PI / 2;
    for (let i = 0; i < 11; i++) {
      const x = -2.4 + i * 0.44, y = 5.36, z = -0.95 + i % 2 * 0.35;
      const glass = new THREE.MeshStandardMaterial({ color: '#c5dfd4', transparent: true, opacity: 0.17, metalness: 0.05, roughness: 0.09, depthWrite: false });
      const radius = 0.12 + i % 3 * 0.04, height = 0.45 + i % 4 * 0.18;
      this.mesh(desk, new THREE.CylinderGeometry(radius, radius, height, 14, 1, true), glass, x, y + height / 2, z);
      this.ring(desk, radius, 0.012, x, y + height, z, this.paper).rotation.x = Math.PI / 2;
      this.cylinder(desk, radius * 0.9, height * 0.23, x, y + height * 0.13, z, i % 3 ? this.brass : this.teal);
    }
    // Fioles, support à éprouvettes et outils oubliés entre deux essais.
    for (let i = 0; i < 6; i++) {
      const x = -4.3 + i * 0.25, z = 0.6 + i % 2 * 0.35;
      this.ball(desk, 0.13, x, 5.5, z, i % 2 ? this.teal : this.brass);
      this.cylinder(desk, 0.05, 0.35, x, 5.8, z, this.cream); this.cylinder(desk, 0.07, 0.07, x, 5.99, z, this.iron);
    }
    this.box(desk, 1.5, 0.12, 0.5, 2.6, 5.4, -0.9, this.darkWood);
    for (let i = 0; i < 5; i++) { this.cylinder(desk, 0.065, 0.75, 2.1 + i * 0.25, 5.8, -0.9, this.teal); this.ring(desk, 0.07, 0.015, 2.1 + i * 0.25, 6.18, -0.9, this.brass).rotation.x = Math.PI / 2; }
    for (let i = 0; i < 20; i++) {
      const x = -5.8 + random(i * 3) * 11.2, z = 0.3 + random(i * 5) * 1.1;
      if (i % 3) this.ring(desk, 0.055 + i % 3 * 0.025, 0.012, x, 5.34, z, this.brass).rotation.x = Math.PI / 2;
      else this.box(desk, 0.07, 0.06, 0.4, x, 5.36, z, this.iron).rotation.y = i;
    }
    const tools = this.group(3.8, 5.36, 0.5, desk); tools.rotation.y = 0.4;
    this.rod(tools, [-0.6, 0, 0], [0.7, 0, 0.3], 0.045, this.iron); this.ring(tools, 0.15, 0.04, -0.6, 0.03, 0, this.brass).rotation.x = Math.PI / 2;
    this.rod(tools, [-0.1, 0, -0.5], [0.4, 0, 0.6], 0.04, this.red);
    const apparatus = this.group(0.6, 5.4, -1.05, desk);
    this.box(apparatus, 1.7, 0.15, 0.8, 0, 0.1, 0, this.brass);
    for (const x of [-0.65, 0.65]) this.rod(apparatus, [x, 0.1, 0], [x, 1.45, 0], 0.06, this.iron);
    this.rod(apparatus, [-0.65, 1.45, 0], [0.65, 1.45, 0], 0.06, this.iron);
    for (let i = 0; i < 11; i++) this.ring(apparatus, 0.23, 0.035, -0.5 + i * 0.1, 0.65, 0, this.brass).rotation.y = Math.PI / 2;
    this.box(apparatus, 0.5, 0.38, 0.2, 0.2, 0.48, 0.45, this.teal); this.ball(apparatus, 0.045, 0.2, 0.48, 0.57, this.amber);
    this.radio(desk, 4.8, 5.34, -0.1, 1.6); this.mug(desk, 2.7, 5.34, 1); this.lantern(desk, -2.5, 5.35, -0.5, 0.67);
    const lamp = this.group(5.9, 5.35, 0, desk);
    this.cylinder(lamp, 0.42, 0.12, 0, 0.06, 0, this.brass);
    this.rod(lamp, [0, 0.1, 0], [0.3, 1.7, -0.2], 0.07, this.brass); this.rod(lamp, [0.3, 1.7, -0.2], [-0.4, 2.4, 0.2], 0.07, this.brass);
    this.mesh(lamp, new THREE.SphereGeometry(0.47, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), this.brass, -0.4, 2.3, 0.2);
    this.ball(lamp, 0.14, -0.4, 2.17, 0.2, this.amber);
    const atom = this.group(-6.8, 5.4, 0, desk); this.cylinder(atom, 0.55, 0.15, 0, 0.1, 0, this.iron);
    const blue = new THREE.MeshStandardMaterial({ color: '#7399e2', emissive: '#2646be', emissiveIntensity: 1.35 });
    this.ball(atom, 0.12, 0, 1, 0, blue);
    for (let i = 0; i < 3; i++) { const ring = this.ring(atom, 0.78, 0.018, 0, 1, 0, blue); ring.rotation.set(i * 0.9, i * 1.0, 0.4); }
    const stool = this.group(-4.9, 0, 6.1, rear);
    this.cylinder(stool, 1.1, 0.3, 0, 3.1, 0, this.red); this.cylinder(stool, 0.12, 2.6, 0, 1.7, 0, this.iron);
    for (const a of [0, 1.26, 2.51, 3.77, 5.03]) { this.rod(stool, [0, 0.5, 0], [Math.sin(a) * 1.25, 0.18, Math.cos(a) * 1.25], 0.09, this.iron); this.ball(stool, 0.14, Math.sin(a) * 1.25, 0.16, Math.cos(a) * 1.25, this.iron); }
    // Vieux réfrigérateur couvert de notes et caisse de « matière grise ».
    this.box(rear, 3.1, 5.6, 2.6, 3.8, 2.8, 1.8, this.teal, 0.18);
    this.box(rear, 2.85, 5.28, 0.14, 3.8, 2.85, 3.18, this.sage, 0.1);
    this.box(rear, 0.14, 1.3, 0.18, 5, 3.2, 3.32, this.brass);
    for (let i = 0; i < 7; i++) this.art(rear, 0.52 + i % 2 * 0.2, 0.7, 2.9 + i % 3 * 0.73, 1.2 + Math.floor(i / 3) * 1.3, 3.3, c => this.blueprint(c, i), false).rotation.z = (random(i) - 0.5) * 0.2;
    this.robot(rear, 3.8, 5.65, 1.8, 0.83);
    this.art(rear, 0.72, 0.62, 3.2, 4.7, 3.31, c => { c.fillStyle = '#c5ae85'; c.fillRect(0, 0, 512, c.canvas.height); c.fillStyle = '#4b6965'; c.beginPath(); c.moveTo(20, 320); c.lineTo(200, 50); c.lineTo(310, 220); c.lineTo(400, 110); c.lineTo(492, 320); c.fill(); }, false).rotation.z = -0.12;
    for (const x of [3, 4.2]) this.ball(rear, 0.07, x, 4.95, 3.35, this.red);
    const crate = this.group(7.3, 0, 1.9, rear); this.chest(crate, 0, 0.1, 0, 3.1, this.darkWood); crate.scale.y = 2;
    this.art(crate, 2.8, 0.85, 0, 0.6, 0.62, c => { c.clearRect(0, 0, 512, c.canvas.height); c.fillStyle = '#261e16'; c.textAlign = 'center'; c.font = 'bold 51px monospace'; c.fillText('MATIÈRE', 256, 64); c.fillText('GRISE', 256, 124); }, false).material.transparent = true;
    this.books(rear, 6.3, 2.4, 2, 4, true); this.plant(rear, 8.3, 2.4, 2, 1.1);
    for (let i = 0; i < 3; i++) this.chest(rear, 11.5 + (i % 2) * 0.15, 0.15 + i * 1.08, 1.1, 2.8 - i * 0.35, i % 2 ? this.teal : this.darkWood);
    this.plant(rear, 12.2, 3.6, 1.0, 1.2); this.books(rear, 10.7, 3.55, 1.1, 4, true);
  }
  private chalkboard(c: CanvasRenderingContext2D) {
    const h = c.canvas.height; c.fillStyle = '#17201c'; c.fillRect(0, 0, 512, h);
    for (let i = 0; i < 1800; i++) { c.fillStyle = i % 3 ? '#b6b79c06' : '#080d0a0b'; c.fillRect(random(i) * 512, random(i + 4) * h, 9, 1); }
    c.fillStyle = '#bdb69d'; c.font = 'italic 28px Georgia'; c.fillText('E = mc²', 22, 41);
    const formulae = ['∫ f(x) dx = C', 'a² + b² = c²', '∇·E = ρ/ε₀', 'F = ma', 'ΔE = hν', 'ψ = eⁱᵏˣ', 'σ = √(Σx²/n)', 'ET SI ?', 'P(⌁) ≠ 0', 'λ = h/p', '∑ n² = ?', 'V = RI', 'ω² = k/m', 'sin²θ + cos²θ = 1'];
    for (let i = 0; i < 30; i++) {
      c.font = `italic ${11 + i % 4 * 2}px Georgia`; c.globalAlpha = 0.45 + random(i + 12) * 0.5;
      c.fillText(formulae[i % formulae.length], 15 + i % 4 * 101 + random(i) * 13, 166 + Math.floor(i / 4) * 18 + random(i + 2) * 8);
    }
    c.globalAlpha = 1;
    c.strokeStyle = '#bfb99e'; c.lineWidth = 1.3;
    for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(179, 82, 39, 14, i * Math.PI / 3, 0, Math.PI * 2); c.stroke(); }
    c.beginPath(); c.arc(179, 82, 3, 0, Math.PI * 2); c.stroke();
    c.beginPath(); for (let t = 0; t < 28; t += 0.1) { const r = t * 1.2; c.lineTo(73 + Math.cos(t) * r, 111 + Math.sin(t) * r * 0.65); } c.stroke();
    c.beginPath(); c.moveTo(264, 137); c.lineTo(264, 73); c.quadraticCurveTo(283, 38, 301, 73); c.lineTo(301, 137); c.closePath(); c.moveTo(264, 112); c.lineTo(247, 143); c.lineTo(264, 136); c.moveTo(301, 112); c.lineTo(318, 143); c.lineTo(301, 136); c.stroke();
    c.beginPath(); c.arc(283, 85, 10, 0, Math.PI * 2); c.stroke();
    c.strokeRect(338, 73, 43, 43); c.strokeRect(356, 59, 43, 43);
    for (const [x, y] of [[338,73],[381,73],[381,116],[338,116]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 18, y - 14); c.stroke(); }
    for (let j = 0; j < 3; j++) {
      c.beginPath(); for (let i = 0; i <= 6; i++) { const a = i * Math.PI / 3; c.lineTo(115 + j * 31 + Math.cos(a) * 18, 136 + Math.sin(a) * 18); } c.stroke();
    }
    c.beginPath(); c.moveTo(33, 50); c.lineTo(33, 77); c.lineTo(110, 77); c.moveTo(38, 73);
    for (let i = 0; i < 70; i++) c.lineTo(38 + i, 65 - Math.sin(i * 0.2) * 8); c.stroke();
  }
  private rearShelves(rear: THREE.Group) {
    const shelf = this.shelf(-17.4, 1, 6.1, [0.5, 3, 5.5, 8, 10.5, 13.2], 15, rear, 0);
    this.chest(shelf, -1.6, 0.65, 0, 2.2); this.chest(shelf, 1.3, 0.65, 0, 2.4, this.darkWood);
    this.books(shelf, -2.6, 3.15, 0, 5); this.radio(shelf, 0.1, 3.15, 0, 2.3); this.chest(shelf, 2.2, 3.15, 0, 1.2, this.red);
    this.television(shelf, -0.2, 5.65, 0, 2.7, false); this.plasma(shelf, -2.2, 5.65, 0); this.rocket(shelf, 2.2, 5.65, 0, 0.65);
    this.robot(shelf, -1.9, 8.15, 0, 0.8); this.radio(shelf, 0.3, 8.15, 0, 1.9); this.lantern(shelf, 2.1, 8.15, 0, 0.85);
    this.chest(shelf, -1.4, 10.65, 0, 1.8, this.red); this.books(shelf, 0.2, 10.65, 0, 5); this.globe(shelf, 2, 10.65, 0);
    this.helmet(shelf, -1.8, 13.35, 0); this.chest(shelf, 0.3, 13.35, 0, 1.5); this.plant(shelf, 2.1, 13.35, 0, 1.3, true);
    const terminal = this.art(shelf, 1.8, 1.3, -0.2, 6.6, 0.6, c => {
      c.fillStyle = '#0b211b'; c.fillRect(0, 0, 512, c.canvas.height); c.fillStyle = '#8fc78d'; c.font = '20px monospace';
      for (let i = 0; i < 9; i++) c.fillText(['> PAPY_OS', 'INIT ATELIER...', 'BOBINE OK', 'THEIERE OK', 'IDEES : 047', 'ERREURS : OUI', '> PRET_'][i % 7], 20, 27 + i * 28);
    }, false); terminal.material = new THREE.MeshBasicMaterial({ map: (terminal.material as THREE.MeshStandardMaterial).map });
    const corner = this.group(-21.3, 0, 5.6, rear); corner.rotation.y = 0.35;
    this.box(corner, 2.4, 7.2, 2, 0, 3.6, 0, this.teal, 0.12);
    this.box(corner, 2.2, 6.9, 0.12, 0, 3.6, 1.06, this.sage);
    for (let i = 0; i < 5; i++) this.box(corner, 1.2, 0.055, 0.03, 0, 5.8 - i * 0.18, 1.15, this.iron, 0.005);
    this.box(corner, 0.13, 0.7, 0.14, 0.7, 3.3, 1.2, this.brass);
    this.rocket(corner, -0.1, 7.25, 0, 0.8); this.lantern(corner, 1.25, 5.3, 0, 0.8);
    this.art(rear, 3.4, 5.3, -21.6, 11.4, 0.7, c => this.text(c, ['LES GRANDES', 'IDÉES', 'COMMENCENT', 'TOUJOURS', 'PAR UN', '« ET SI ? »'], 512, c.canvas.height));
    const crate = this.group(-17.2, 0, 4.1, rear); this.chest(crate, 0, 0.2, 0, 3.7, this.darkWood); crate.scale.y = 2.2;
    this.art(crate, 3.3, 0.8, 0, 0.65, 0.63, c => { c.clearRect(0, 0, 512, c.canvas.height); c.fillStyle = '#302319'; c.textAlign = 'center'; c.font = 'bold 54px monospace'; c.fillText('PROJETS FOUS', 256, 82, 500); }, false).material.transparent = true;
    const skate = this.group(-12.8, 2.15, 4.1, rear); skate.rotation.set(0.14, 0.2, -0.2);
    this.box(skate, 0.85, 3.9, 0.13, 0, 0, 0, this.darkWood, 0.2);
    for (const y of [-1.3, 1.3]) { this.box(skate, 1.05, 0.14, 0.19, 0, y, 0.18, this.iron); for (const x of [-0.5, 0.5]) this.cylinder(skate, 0.16, 0.13, x, y, 0.18, this.brass).rotation.z = Math.PI / 2; }
    const right = this.group(21.2, 0, 7.3, rear); right.rotation.y = -Math.PI / 2;
    const storage = this.shelf(0, 0, 5.5, [0.4, 3.2, 5.8, 8.8, 11.5], 14, right, 0);
    this.chest(storage, -1.3, 0.6, 0, 2.4); this.books(storage, 1, 0.6, 0, 7);
    this.radio(storage, 1.3, 3.35, 0, 2); this.books(storage, -2.3, 3.35, 0, 8);
    this.television(storage, 0.3, 5.95, 0, 3, true); this.helmet(storage, -1.6, 9, 0); this.lava(storage, 1.5, 9, 0);
    this.plant(storage, -2.3, 11.65, 0, 1.3, true); this.chest(storage, 0.3, 11.65, 0, 2.1, this.red);
    this.art(right, 3.1, 4.4, 0, 15, 0, c => this.text(c, ['L’IMAGINATION', 'EST PLUS', 'IMPORTANTE', 'QUE LE SAVOIR'], 512, c.canvas.height));
    // Petit poêle de l'atelier, avec bûches et bouilloire.
    const stove = this.group(19.6, 0, 12.5, rear); stove.rotation.y = -0.45;
    this.box(stove, 2.3, 3.7, 2, 0, 2.2, 0, this.iron, 0.13); this.box(stove, 2.55, 0.2, 2.2, 0, 4.2, 0, this.iron);
    const fire = this.art(stove, 1.65, 2.3, 0, 2.4, 1.03, c => {
      const h = c.canvas.height; c.fillStyle = '#25130c'; c.fillRect(0, 0, 512, h);
      for (let i = 0; i < 11; i++) { const x = 35 + i * 45; c.fillStyle = ['#e26f14', '#ffbd44', '#ffdc72'][i % 3]; c.beginPath(); c.moveTo(x - 50, h); c.quadraticCurveTo(x + 30, h * 0.55, x, h * (0.1 + random(i) * 0.55)); c.quadraticCurveTo(x + 95, h * 0.65, x + 50, h); c.fill(); }
    }, false); fire.material = new THREE.MeshBasicMaterial({ map: (fire.material as THREE.MeshStandardMaterial).map });
    this.cylinder(stove, 0.23, 11, 0, 9.7, -0.5, this.iron);
    this.cylinder(stove, 0.45, 0.55, -0.4, 4.55, 0.15, this.brass); this.ring(stove, 0.22, 0.045, -0.85, 4.6, 0.15, this.brass);
    for (let i = 0; i < 9; i++) this.cylinder(stove, 0.25, 1.1, -1.8 + i % 3 * 0.44, 0.3 + Math.floor(i / 3) * 0.45, 0, this.wood).rotation.x = Math.PI / 2;
  }
  private rearAquarium(rear: THREE.Group) {
    const tank = this.group(18.7, 11.4, 1.6, rear); tank.rotation.y = -0.16;
    this.box(tank, 5.3, 0.22, 2.1, 0, 0, 0, this.darkWood); this.box(tank, 5.3, 0.22, 2.1, 0, 3.15, 0, this.darkWood);
    const waterBack = new THREE.MeshStandardMaterial({ color: '#254a43', emissive: '#355849', emissiveIntensity: 0.6, roughness: 0.8 });
    this.box(tank, 4.95, 2.9, 0.05, 0, 1.57, -0.96, waterBack);
    const water = new THREE.MeshStandardMaterial({ color: '#79a98b', transparent: true, opacity: 0.1, roughness: 0.15, depthWrite: false });
    this.box(tank, 5.0, 2.9, 1.9, 0, 1.57, 0, water, 0.01);
    for (const x of [-2.5, 2.5]) this.box(tank, 0.09, 3, 2, x, 1.57, 0, this.brass);
    this.box(tank, 4.9, 0.16, 1.85, 0, 0.22, 0, this.brass);
    const green = new THREE.MeshStandardMaterial({ color: '#7fad51', emissive: '#44672c', emissiveIntensity: 0.5, roughness: 0.8 });
    for (let i = 0; i < 13; i++) {
      const x = -2.2 + i * 0.36, h = 0.6 + random(i) * 1.9;
      this.rod(tank, [x, 0.3, -0.5], [x + Math.sin(i) * 0.3, h, -0.4], 0.025, green);
      for (let j = 0; j < 4; j++) this.ball(tank, 0.13, x + Math.sin(j * 2) * 0.19, 0.5 + j * h / 4, -0.3, green).scale.set(0.5, 2.3, 0.6);
    }
    for (let i = 0; i < 4; i++) {
      const x = -1.8 + i * 1.05, y = 0.9 + i % 2 * 0.85;
      this.ball(tank, 0.16, x, y, 0.55, this.brass).scale.set(1.7, 0.8, 0.6);
      this.mesh(tank, new THREE.ConeGeometry(0.17, 0.28, 3), this.red, x - 0.3, y, 0.55).rotation.z = -Math.PI / 2;
      this.ball(tank, 0.02, x + 0.16, y + 0.03, 0.65, this.iron);
    }
    for (let i = 0; i < 10; i++) this.ball(tank, 0.025 + i % 3 * 0.012, 1.85 + Math.sin(i * 2) * 0.08, 0.6 + i * 0.23, 0.4, this.cyan);
    this.box(tank, 4.8, 0.035, 0.06, 0, 2.95, 0, this.cyan);
  }
  private rearHangingModels(rear: THREE.Group) {
    const blimp = this.group(12, 15.2, 4.8, rear); blimp.rotation.set(0.05, -0.25, -0.05); blimp.scale.setScalar(0.8);
    const map = canvasMap(256, 128, c => { c.fillStyle = '#c5b18a'; c.fillRect(0, 0, 256, 128); c.fillStyle = '#406b69'; c.fillRect(0, 49, 256, 25); c.strokeStyle = '#675d44'; c.lineWidth = 2; for (let i = 0; i < 9; i++) c.strokeRect(i * 32, 0, 32, 128); });
    this.ball(blimp, 1, 0, 0, 0, new THREE.MeshStandardMaterial({ map, roughness: 0.65 })).scale.set(3.2, 1.05, 1.05);
    this.box(blimp, 1.9, 0.65, 0.85, 0, -1.7, 0, this.darkWood, 0.12);
    for (const x of [-0.7, 0.7]) for (const z of [-0.4, 0.4]) this.rod(blimp, [x, -0.5, z], [x, -1.4, z], 0.025, this.brass);
    for (const x of [-0.55, 0, 0.55]) this.box(blimp, 0.26, 0.3, 0.04, x, -1.65, 0.45, this.teal);
    this.box(blimp, 2.1, 0.09, 1, 0, -1.37, 0, this.brass);
    for (const x of [-0.75, -0.25, 0.25, 0.75]) this.ball(blimp, 0.035, x, -1.8, 0.45, this.brass);
    for (const x of [-0.85, 0.85]) { this.rod(blimp, [x, -1.8, 0.1], [x, -1.8, 0.85], 0.04, this.iron); this.box(blimp, 0.8, 0.09, 0.045, x, -1.8, 0.9, this.brass).rotation.z = x; }
    for (const a of [0, Math.PI / 2]) this.box(blimp, 1.3, 1.5, 0.08, -2.7, 0, 0, this.teal).rotation.x = a;
    for (const x of [-1.8, 1.8]) this.rod(blimp, [x, 0.4, 0], [x, 2.4, 0], 0.018, this.iron);
    const planets = this.group(5, 16, 4.3, rear);
    this.ball(planets, 0.68, 0, -0.1, 0, this.teal); this.ring(planets, 1, 0.04, 0, -0.1, 0, this.brass).rotation.x = 0.8;
    for (const [x, r] of [[-1.8, 0.21], [1.5, 0.35]]) { this.rod(planets, [0, 0.8, 0], [x, 0.8, 0], 0.018, this.iron); this.rod(planets, [x, 0.8, 0], [x, -0.2, 0], 0.018, this.iron); this.ball(planets, r, x, -0.35, 0, this.brass); }
    const hanging = this.group(11.7, 10.5, 1.4, rear); this.box(hanging, 5.2, 0.16, 1.7, 0, 0, 0, this.darkWood);
    for (const x of [-2.2, 2.2]) this.rod(hanging, [x, 0, 0], [x, 6.2, 0], 0.025, this.iron);
    this.plant(hanging, -1.7, 0.12, 0, 1.3, true); this.plant(hanging, 1.4, 0.12, 0, 1.2, true); this.robot(hanging, -0.1, 0.12, 0, 0.65);
  }
  private rearForeground(rear: THREE.Group) {
    const table = this.group(-9.8, 0, 19, rear); table.rotation.y = -0.1;
    this.box(table, 9.2, 0.38, 5.2, 0, 3.8, 0, this.darkWood, 0.12);
    for (const x of [-3.7, 3.7]) for (const z of [-2, 2]) this.box(table, 0.35, 3.7, 0.35, x, 1.9, z, this.darkWood);
    const map = this.art(table, 4.9, 3.2, 0, 4.01, 0, c => {
      c.fillStyle = '#c6b48c'; c.fillRect(0, 0, 512, c.canvas.height); c.fillStyle = '#567a75';
      for (let i = 0; i < 15; i++) { c.beginPath(); c.ellipse(random(i) * 512, random(i + 8) * c.canvas.height, 12 + random(i + 5) * 70, 10 + random(i + 4) * 32, i, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = '#735d43'; c.lineWidth = 2; c.beginPath(); c.moveTo(40, 260); c.bezierCurveTo(150, 10, 360, 360, 480, 30); c.stroke();
      c.strokeRect(10, 10, 492, c.canvas.height - 20);
    }, false); map.rotation.x = -Math.PI / 2;
    this.lantern(table, -2.7, 4.02, -1, 0.95); this.mug(table, -1.7, 4.02, 1.4); this.books(table, 1.8, 4.02, -1, 2, true);
    const headphones = this.ring(table, 0.48, 0.08, 1.5, 4.22, 0.8, this.iron); headphones.rotation.x = Math.PI / 2;
    for (const x of [1.05, 1.95]) this.cylinder(table, 0.23, 0.18, x, 4.16, 0.8, this.brass);
    this.box(table, 1.2, 0.15, 1.7, 2.55, 4.1, 0.8, this.darkWood, 0.04);
    this.cylinder(table, 0.3, 0.1, -0.75, 4.12, 1.3, this.brass); this.ring(table, 0.26, 0.035, -0.75, 4.2, 1.3, this.iron).rotation.x = Math.PI / 2;
    this.box(table, 0.04, 0.04, 0.4, -0.75, 4.22, 1.3, this.red).rotation.y = 0.5;
    this.cylinder(table, 0.08, 2.3, 0, 4.12, -1.5, this.paper).rotation.z = Math.PI / 2;
    const note = this.art(table, 1.4, 0.95, 3.2, 4.02, -0.8, c => this.blueprint(c, 2), false); note.rotation.set(-Math.PI / 2, 0, 0.18);
    this.ball(table, 0.035, 3.6, 4.07, -1.1, this.red);
    // Fauteuil suspendu en toile : tissu courbe et cordes, sans personnage ni interaction.
    const chair = this.group(19.2, 0, 12, rear); chair.rotation.y = -0.3; chair.scale.setScalar(0.76);
    const geometry = new THREE.PlaneGeometry(5.8, 5.4, 18, 18), positions = geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getY(i), side = Math.abs(x / 2.9);
      positions.setXYZ(i, x, 1.6 + side * side * 2.1 + Math.max(0, -z) ** 2 * 0.48, z);
    }
    geometry.computeVertexNormals(); const cloth = new THREE.MeshStandardMaterial({ color: '#4f6c52', roughness: 0.98, side: THREE.DoubleSide });
    this.mesh(chair, geometry, cloth, 0, 0, 0);
    this.ball(chair, 1, 0, 1.8, 0, this.sage).scale.set(2.4, 0.4, 1.7);
    for (const x of [-1.4, 1.4]) this.box(chair, 1.7, 0.65, 1.5, x, 2.5, -0.8, this.sage, 0.25).rotation.z = x * 0.15;
    for (const sign of [-1, 1]) this.rod(chair, [sign * 2.8, 4.1, -2.7], [sign * 1.2, 16, -2.4], 0.045, this.brass);
    const plaid = canvasMap(128, 128, c => { c.fillStyle = '#8f3828'; c.fillRect(0, 0, 128, 128); c.fillStyle = '#202825aa'; for (let i = 0; i < 8; i++) { c.fillRect(i * 16, 0, 7, 128); c.fillRect(0, i * 16, 128, 7); } });
    const blanket = new THREE.MeshStandardMaterial({ map: plaid, roughness: 1 });
    this.box(chair, 3.6, 0.1, 2.1, 0.3, 2.1, -0.2, blanket, 0.04).rotation.x = -0.1;
    this.box(chair, 3.6, 2.3, 0.12, 0.3, 4.2, -2.0, blanket, 0.04).rotation.x = -0.35;
    this.box(chair, 1.65, 0.55, 1.5, -1.2, 2.4, 1.2, this.sage, 0.2).rotation.z = 0.2;
    const panda = this.group(-20.5, 4.8, 10, rear); this.ball(panda, 0.65, 0, 0, 0, this.cream); this.ball(panda, 0.48, 0, 0.8, 0.1, this.cream);
    for (const x of [-0.32, 0.32]) { this.ball(panda, 0.2, x, 1.1, 0.1, this.iron); this.ball(panda, 0.13, x * 0.6, 0.86, 0.47, this.iron); this.ball(panda, 0.2, x, -0.25, 0.35, this.iron); }
    this.ball(panda, 0.09, 0, 0.65, 0.56, this.iron);
    const sling = this.group(-20.5, 4.7, 10, rear);
    this.mesh(sling, new THREE.SphereGeometry(1.55, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), cloth, 0, 0, 0).scale.set(1, 0.5, 0.8);
    for (const x of [-1.4, 1.4]) this.rod(sling, [x, -0.1, 0], [x * 0.6, 9.8, 0], 0.035, this.brass);
  }
  private rearSideBay(rear: THREE.Group) {
    // Le retour de mur accompagne la vue oblique depuis l'escalier, sans angle vide.
    const bay = this.group(-21.7, 0, 14.2, rear); bay.rotation.y = Math.PI / 2;
    const shelves = this.shelf(0, 0, 10.7, [0.5, 3.3, 6.2, 9.2, 12.2, 14.8], 15.5, bay, 0);
    for (let i = 0; i < 4; i++) this.chest(shelves, -3.9 + i * 2.55, 0.65, 0, 2.3, i % 2 ? this.teal : this.darkWood);
    this.radio(shelves, -3.4, 3.45, 0, 2.5); this.books(shelves, -1.4, 3.45, 0, 10); this.chest(shelves, 3.4, 3.45, 0, 2.3, this.red);
    this.television(shelves, -2.7, 6.35, 0, 2.9, true); this.plasma(shelves, 0.3, 6.35, 0); this.books(shelves, 1.5, 6.35, 0, 8); this.lantern(shelves, 4.4, 6.35, 0, 1.1);
    this.helmet(shelves, -4.2, 9.35, 0); this.radio(shelves, -1.9, 9.35, 0, 2.2); this.robot(shelves, 0.6, 9.35, 0, 0.75); this.globe(shelves, 2.2, 9.35, 0); this.rocket(shelves, 4.2, 9.35, 0, 0.7);
    this.chest(shelves, -3.8, 12.35, 0, 2); this.books(shelves, -1.4, 12.35, 0, 8); this.plant(shelves, 3.6, 12.35, 0, 1.4, true);
    this.plant(shelves, -4.3, 14.95, 0, 1.6, true); this.chest(shelves, 0.4, 14.95, 0, 2.4, this.red); this.chest(shelves, 2.8, 14.95, 0, 1.7);
    const banner = this.group(-21.8, 10, 22.5, rear); banner.rotation.y = Math.PI / 2;
    this.art(banner, 4.5, 6.7, 0, 0, 0.4, c => this.text(c, ['LES GRANDES', 'IDÉES', 'COMMENCENT', 'TOUJOURS', 'PAR UN', '« ET SI ? »'], 512, c.canvas.height));
    this.lantern(bay, -5.1, 12.6, 1.1, 1);
    const sideLight = new THREE.PointLight('#ffb260', 65, 17); sideLight.position.set(0, 11, 3); bay.add(sideLight);
    const notices = this.group(-21.75, 8.5, 7.5, rear); notices.rotation.y = Math.PI / 2;
    for (let i = 0; i < 3; i++) this.art(notices, 1.35, 1.8, -1.5 + i * 1.4, i % 2 * 0.35, 0.4, c => this.blueprint(c, i + 1), false).rotation.z = (random(i) - 0.5) * 0.15;
    for (let i = 0; i < 5; i++) this.ring(notices, 0.85 - i * 0.06, 0.035, 2.3, -2, 0.5 + i * 0.06, this.teal).rotation.y = 0.1;
    this.rod(notices, [2.3, -1.15, 0.3], [2.3, -1.15, 0.9], 0.065, this.brass);
  }
  private batch() {
    this.root.updateWorldMatrix(true, true); this.workshopRoot.updateWorldMatrix(true, true);
    const groups = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[] }>();
    const remove: THREE.Mesh[] = [];
    for (const root of [this.root, this.workshopRoot]) root.traverse(object => {
      if (!(object instanceof THREE.Mesh) || Array.isArray(object.material) || object.material.transparent) return;
      const geometry = (object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone()).applyMatrix4(object.matrixWorld);
      const position = object.getWorldPosition(new THREE.Vector3());
      // Bornes locales : le survol et les rayons de collision évitent les milliers de détails éloignés.
      const key = `${object.material.id}/${Math.floor(position.x / 6)}/${Math.floor(position.y / 6)}/${Math.floor(position.z / 6)}`;
      const group = groups.get(key) ?? { material: object.material, geometries: [] as THREE.BufferGeometry[] }; group.geometries.push(geometry); groups.set(key, group); remove.push(object);
    });
    for (const { material, geometries } of groups.values()) {
      const geometry = mergeGeometries(geometries);
      geometries.forEach(item => item.dispose());
      if (!geometry) continue;
      const mesh = new THREE.Mesh(geometry, material); mesh.name = 'cave:decor-static'; mesh.castShadow = true; mesh.receiveShadow = true; this.scene.add(mesh);
    }
    remove.forEach(mesh => mesh.removeFromParent());
  }
}

/** Textures locales : les volumes, l'éclairage et les collisions restent intégralement en 3D. */
const surfaceUrls = {
  bois: new URL('../assets/textures/bois.webp', import.meta.url).href,
  pierre: new URL('../assets/textures/pierre.webp', import.meta.url).href,
  tapis: new URL('../assets/textures/tapis.webp', import.meta.url).href,
};
/** Chargements de textures en cours : une scène peut attendre leur fin pour précompiler ses shaders. */
export const surfaceLoads = new Set<Promise<void>>();
export function finishSurface(name: keyof typeof surfaceUrls, materials: THREE.MeshStandardMaterial[]): Promise<void> {
  const loading = new Promise<void>(resolve => new THREE.TextureLoader().load(surfaceUrls[name], map => {
    map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
    const previous = new Set<THREE.Texture>();
    for (const material of materials) {
      if (material.map) previous.add(material.map);
      material.map = map; material.bumpMap = map; material.needsUpdate = true;
    }
    previous.forEach(texture => texture.dispose());
    resolve();
  }, undefined, () => resolve()));
  surfaceLoads.add(loading); void loading.then(() => surfaceLoads.delete(loading));
  return loading;
}

export function wovenRug() {
  const fallback = canvasMap(64, 64, c => {
    c.fillStyle = '#874a34'; c.fillRect(0, 0, 64, 64); c.strokeStyle = '#b89664'; c.lineWidth = 3; c.strokeRect(4, 4, 56, 56);
  });
  const material = new THREE.MeshStandardMaterial({ map: fallback, bumpMap: fallback, bumpScale: 0.035, roughness: 1 });
  finishSurface('tapis', [material]); return material;
}
