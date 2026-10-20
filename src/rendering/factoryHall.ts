import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Page } from './interfaces';

/**
 * Salle d’usine et convoyeur de tri, entièrement procéduraux. Décor seulement : la trajectoire
 * des billes, les couloirs, le carton et les fiches gardent les coordonnées du poste.
 * Rien de décoratif ne passe devant les billes vues depuis la caméra (clics jamais bloqués).
 */
export const HALL = {
  floor: -5.65,
  table: -1.4,
  beltTop: -1.15,
  belt: { x0: -6.95, x1: 3.95, z0: -1.95, z1: 2.55 },
  beltTile: 0.65,
  box: { x: 5.3, z: 1.1, width: 2.9, depth: 3.1 },
} as const;

const C = {
  frame: '#4e6b66', darkSteel: '#39443f', galvanised: '#9aa3a0', yellow: '#e2b23c', black: '#262826',
  rackBlue: '#45627d', rackOrange: '#c9703a', cardboard: '#bc9363', pallet: '#a98458', rubber: '#2b302e',
  crate: '#7f9fb0', red: '#c4473a', green: '#5f9a6a',
} as const;

function canvasTexture(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void, repeat?: [number, number]) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  if (repeat) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(...repeat); }
  return texture;
}
const speckle = (c: CanvasRenderingContext2D, w: number, h: number, count: number, alpha: number, seed = 1) => {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < count; i++) { c.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`; c.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3); }
};

export class FactoryHall {
  /** Texture de la bande : son décalage suit l’horloge du tapis (défilement réel). */
  readonly beltTexture: THREE.CanvasTexture;
  private materials = new Map<string, THREE.MeshStandardMaterial>();
  private geometries = new Map<string, THREE.BufferGeometry>();

  constructor(private scene: THREE.Scene, eventLamp: THREE.Mesh) {
    this.lighting();
    this.room();
    this.beltTexture = this.conveyor();
    this.feeder(eventLamp);
    this.racks();
    this.props();
  }

  private mat(color: string, roughness = 0.75, metalness = 0, emissive?: string) {
    const key = `${color}/${roughness}/${metalness}/${emissive}`;
    let material = this.materials.get(key);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color, roughness, metalness });
      if (emissive) { material.emissive.set(emissive); material.emissiveIntensity = 1; }
      this.materials.set(key, material);
    }
    return material;
  }
  private box(w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material, parent: THREE.Object3D = this.scene, round = true) {
    const key = `b/${w}/${h}/${d}/${round}`;
    let geometry = this.geometries.get(key);
    if (!geometry) { geometry = round ? new RoundedBoxGeometry(w, h, d, 1, Math.min(0.04, w / 4, h / 4, d / 4)) : new THREE.BoxGeometry(w, h, d); this.geometries.set(key, geometry); }
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  private cylinder(radiusTop: number, radiusBottom: number, h: number, x: number, y: number, z: number, material: THREE.Material, axis: 'x' | 'y' | 'z' = 'y', segments = 18) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, h, segments), material);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2; else if (axis === 'z') mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; this.scene.add(mesh); return mesh;
  }
  private plane(w: number, h: number, x: number, y: number, z: number, material: THREE.Material, rotation: [number, number, number] = [0, 0, 0]) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
    mesh.position.set(x, y, z); mesh.rotation.set(...rotation); mesh.receiveShadow = true; this.scene.add(mesh); return mesh;
  }
  /** Profilé en I : deux semelles et une âme. */
  private iBeam(length: number, x: number, y: number, z: number, axis: 'x' | 'y', material: THREE.Material, size = 0.42) {
    const flange = 0.06, web = 0.07;
    if (axis === 'y') {
      for (const dx of [-size / 2, size / 2]) this.box(flange, length, size, x + dx, y, z, material, this.scene, false);
      this.box(size, length, web, x, y, z, material, this.scene, false);
    } else {
      for (const dy of [-size / 2, size / 2]) this.box(length, flange, size, x, y + dy, z, material, this.scene, false);
      this.box(length, size, web, x, y, z, material, this.scene, false);
    }
  }

  private lighting() {
    this.scene.background = new THREE.Color('#2a302d');
    this.scene.fog = new THREE.Fog('#2a302d', 26, 60);
    this.scene.add(new THREE.HemisphereLight('#c9d6d6', '#5e5242', 1.15));
    // Lumière principale, venant des verrières en haut à gauche : ombres des billes sur la bande.
    const key = new THREE.DirectionalLight('#ffe5bd', 2.6); key.position.set(-6, 13, 7); key.target.position.set(-1, HALL.table, 0.3);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.03;
    Object.assign(key.shadow.camera, { left: -14, right: 14, top: 12, bottom: -10, near: 1, far: 40 });
    this.scene.add(key, key.target);
    const cool = new THREE.DirectionalLight('#a9c3dc', 0.7); cool.position.set(4, 6, -12); this.scene.add(cool);
  }

  private room() {
    const floorY = HALL.floor;
    // Sol béton : joints de dilatation, taches, allées peintes.
    const concrete = canvasTexture(512, 512, c => {
      c.fillStyle = '#8c8a83'; c.fillRect(0, 0, 512, 512);
      speckle(c, 512, 512, 9000, 0.07, 7);
      for (let i = 0; i < 6; i++) { const g = c.createRadialGradient(80 + i * 83, 120 + (i % 3) * 140, 4, 80 + i * 83, 120 + (i % 3) * 140, 70); g.addColorStop(0, 'rgba(40,36,30,0.18)'); g.addColorStop(1, 'rgba(40,36,30,0)'); c.fillStyle = g; c.fillRect(0, 0, 512, 512); }
      c.strokeStyle = 'rgba(50,48,44,0.55)'; c.lineWidth = 2; c.strokeRect(1, 1, 510, 510);
    }, [6, 5]);
    const floor = this.plane(32, 30, 0, floorY, 4, new THREE.MeshStandardMaterial({ map: concrete, roughness: 0.92 }), [-Math.PI / 2, 0, 0]);
    floor.name = 'usine:sol';
    const paint = this.mat(C.yellow, 0.7);
    for (const z of [3.65, 7.4]) this.box(26, 0.012, 0.16, 0, floorY + 0.006, z, paint, this.scene, false);
    for (const x of [-12.2, 11.8]) this.box(0.16, 0.012, 3.75, x, floorY + 0.006, 5.52, paint, this.scene, false);
    // Zone hachurée devant l’alimentation.
    const hatch = canvasTexture(256, 64, c => { c.fillStyle = C.black; c.fillRect(0, 0, 256, 64); c.fillStyle = C.yellow; for (let x = -64; x < 256; x += 32) { c.beginPath(); c.moveTo(x, 64); c.lineTo(x + 16, 64); c.lineTo(x + 80, 0); c.lineTo(x + 64, 0); c.fill(); } }, [3, 1]);
    this.plane(3.2, 1.0, -8.4, floorY + 0.008, 3.2, new THREE.MeshStandardMaterial({ map: hatch, roughness: 0.8 }), [-Math.PI / 2, 0, 0]);

    // Mur du fond : parpaings en bas, bardage ondulé en haut, bandeau vitré.
    const blocks = canvasTexture(256, 128, c => {
      c.fillStyle = '#7b7d76'; c.fillRect(0, 0, 256, 128);
      c.fillStyle = '#a3a49b';
      for (let row = 0; row < 4; row++) for (let col = -1; col < 4; col++) c.fillRect(col * 64 + (row % 2) * 32 + 2, row * 32 + 2, 60, 28);
      speckle(c, 256, 128, 2200, 0.06, 3);
    }, [13, 3]);
    const corrugated = canvasTexture(128, 64, c => {
      for (let x = 0; x < 128; x++) { const v = 0.5 + 0.5 * Math.sin(x / 128 * Math.PI * 8); const l = Math.round(150 + v * 42); c.fillStyle = `rgb(${l - 24},${l - 8},${l - 10})`; c.fillRect(x, 0, 1, 64); }
      speckle(c, 128, 64, 300, 0.05, 11);
    }, [18, 1]);
    const blockMat = new THREE.MeshStandardMaterial({ map: blocks, roughness: 0.95 });
    const sheetMat = new THREE.MeshStandardMaterial({ map: corrugated, roughness: 0.55, metalness: 0.35 });
    this.box(26, 5.75, 0.3, 0, floorY + 2.85, -5, blockMat, this.scene, false);
    this.box(26, 8, 0.25, 0, floorY + 5.75 + 4, -5.02, sheetMat, this.scene, false);
    // Verrières : vitres légèrement lumineuses et petits bois en acier.
    const glass = new THREE.MeshStandardMaterial({ color: '#b9cdd8', emissive: '#7f9cb2', emissiveIntensity: 0.55, roughness: 0.2, metalness: 0.1 });
    for (const [x0, x1] of [[-12.4, -1.2], [1.2, 12.4]]) {
      const width = x1 - x0, cx = (x0 + x1) / 2;
      this.box(width, 1.8, 0.06, cx, 3.75, -4.86, glass, this.scene, false);
      for (let x = x0; x <= x1 + 0.01; x += width / 8) this.box(0.07, 1.86, 0.1, x, 3.75, -4.8, this.mat(C.darkSteel, 0.5, 0.6), this.scene, false);
      for (const y of [2.85, 3.75, 4.65]) this.box(width, 0.07, 0.1, cx, y, -4.8, this.mat(C.darkSteel, 0.5, 0.6), this.scene, false);
    }
    // Ossature : poteaux et poutre en I, bardage latéral.
    const steel = this.mat(C.frame, 0.55, 0.45);
    for (const x of [-11.9, -6.2, 6.2, 11.9]) this.iBeam(12, x, floorY + 6, -4.6, 'y', steel);
    this.iBeam(26, 0, 4.95, -4.6, 'x', steel, 0.5);
    for (const x of [-12.8, 12.8]) {
      this.box(0.3, 5.75, 26, x, floorY + 2.85, 5, blockMat, this.scene, false);
      this.box(0.25, 8, 26, x, floorY + 9.75, 5, sheetMat, this.scene, false);
    }
    // Porte sectionnelle à gauche, encadrée de bandes de sécurité.
    const shutter = canvasTexture(64, 256, c => { c.fillStyle = '#a7aca6'; c.fillRect(0, 0, 64, 256); for (let y = 0; y < 256; y += 21) { c.fillStyle = '#7f8580'; c.fillRect(0, y, 64, 3); c.fillStyle = '#c1c6bf'; c.fillRect(0, y + 3, 64, 2); } }, [1, 1]);
    this.plane(4.6, 5.2, -12.62, floorY + 2.6, 3.4, new THREE.MeshStandardMaterial({ map: shutter, roughness: 0.6, metalness: 0.3 }), [0, Math.PI / 2, 0]);
    const stripes = canvasTexture(64, 256, c => { c.fillStyle = C.black; c.fillRect(0, 0, 64, 256); c.fillStyle = C.yellow; for (let y = -64; y < 256; y += 48) { c.beginPath(); c.moveTo(0, y); c.lineTo(64, y + 40); c.lineTo(64, y + 64); c.lineTo(0, y + 24); c.fill(); } }, [1, 3]);
    const stripeMat = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.7 });
    for (const z of [1, 5.8]) this.box(0.2, 5.4, 0.22, -12.55, floorY + 2.7, z, stripeMat, this.scene, false);

    // Tuyauteries, vanne, manomètre et chemin de câbles le long du mur du fond.
    const pipe = this.mat('#6f7e78', 0.45, 0.6), copper = this.mat('#a8724c', 0.4, 0.7);
    for (const [y, material, r] of [[2.3, pipe, 0.11], [2.62, copper, 0.07]] as const) {
      this.cylinder(r, r, 25.4, 0, y, -4.5, material, 'x', 12);
      for (let x = -11; x <= 11; x += 2.75) this.cylinder(r * 1.45, r * 1.45, 0.08, x, y, -4.5, material, 'x', 12);
    }
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 8, 22), this.mat(C.red, 0.5, 0.3));
    wheel.position.set(-9.3, 2.3, -4.2); this.scene.add(wheel);
    this.cylinder(0.04, 0.04, 0.3, -9.3, 2.3, -4.35, pipe, 'z', 8);
    const gauge = canvasTexture(128, 128, c => { c.fillStyle = '#efe7d3'; c.beginPath(); c.arc(64, 64, 60, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#333'; c.lineWidth = 6; c.stroke(); c.lineWidth = 3; for (let i = 0; i <= 8; i++) { const a = Math.PI * (0.75 + i * 0.1875); c.beginPath(); c.moveTo(64 + Math.cos(a) * 42, 64 + Math.sin(a) * 42); c.lineTo(64 + Math.cos(a) * 52, 64 + Math.sin(a) * 52); c.stroke(); } c.strokeStyle = C.red; c.lineWidth = 5; c.beginPath(); c.moveTo(64, 64); c.lineTo(100, 40); c.stroke(); });
    this.cylinder(0.24, 0.24, 0.1, 8.9, 2.3, -4.32, this.mat(C.darkSteel, 0.4, 0.6), 'z', 20);
    this.plane(0.4, 0.4, 8.9, 2.3, -4.26, new THREE.MeshBasicMaterial({ map: gauge }));
    const tray = this.mat(C.galvanised, 0.5, 0.6);
    for (const z of [-4.62, -4.12]) this.box(25, 0.08, 0.05, 0, 4.35, z, tray, this.scene, false);
    for (let x = -12; x <= 12; x += 0.8) this.box(0.05, 0.04, 0.5, x, 4.33, -4.37, tray, this.scene, false);

    // Suspensions industrielles sur les côtés et réglette au-dessus du tapis.
    const shade = new THREE.MeshStandardMaterial({ color: '#3f5a52', roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide });
    const bulb = new THREE.MeshStandardMaterial({ color: '#fff4d6', emissive: '#ffd893', emissiveIntensity: 2.4 });
    for (const x of [-7.6, 7.6]) {
      this.cylinder(0.015, 0.015, 4.6, x, 6.8, 0.5, this.mat(C.black), 'y', 6);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.45, 24, 1, true), shade); cone.position.set(x, 4.5, 0.5); this.scene.add(cone);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), bulb); glow.position.set(x, 4.32, 0.5); this.scene.add(glow);
      const light = new THREE.PointLight('#ffd291', 26, 16, 1.6); light.position.set(x, 4.1, 0.5); this.scene.add(light);
    }
    this.box(7.2, 0.1, 0.34, -1.5, 5.45, 0.3, this.mat(C.galvanised, 0.4, 0.6), this.scene, false);
    this.box(6.9, 0.05, 0.16, -1.5, 5.39, 0.3, new THREE.MeshStandardMaterial({ color: '#f6f1df', emissive: '#efe5c7', emissiveIntensity: 1.6 }), this.scene, false);
    const strip = new THREE.PointLight('#f2ead2', 22, 14, 1.6); strip.position.set(-1.5, 4.9, 0.4); this.scene.add(strip);

    // Rais de lumière depuis les verrières : additifs, sans ombre ni interaction.
    const beam = canvasTexture(64, 256, c => { const g = c.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(255,240,210,0.9)'); g.addColorStop(1, 'rgba(255,240,210,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 256); const h = c.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, 'rgba(0,0,0,1)'); h.addColorStop(0.5, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,1)'); c.globalCompositeOperation = 'destination-out'; c.fillStyle = h; c.fillRect(0, 0, 64, 256); });
    const beamMat = new THREE.MeshBasicMaterial({ map: beam, transparent: true, opacity: 0.11, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (const x of [-10.2, -8.6, 9.4]) {
      const ray = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 9.5), beamMat);
      ray.position.set(x + 1.6, 0.4, -2.6); ray.rotation.set(-0.42, 0, -0.32); ray.raycast = () => {}; this.scene.add(ray);
    }
  }

  private conveyor(): THREE.CanvasTexture {
    const { x0, x1, z0, z1 } = HALL.belt, length = x1 - x0, width = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const top = HALL.beltTop, floorY = HALL.floor;
    // Bande caoutchouc : rainures transversales qui défilent, repères de couloirs fixes.
    const belt = canvasTexture(64, 256, c => {
      c.fillStyle = '#262a29'; c.fillRect(0, 0, 64, 256);
      speckle(c, 64, 256, 700, 0.045, 5);
      // Tasseau en relief : ombre, arête claire, puis retour au caoutchouc.
      c.fillStyle = '#121514'; c.fillRect(0, 0, 4, 256);
      c.fillStyle = '#4c5450'; c.fillRect(4, 0, 3, 256);
      c.fillStyle = '#353b38'; c.fillRect(7, 0, 4, 256);
      // Repères de couloirs peints en pointillés (ils défilent avec la bande).
      c.fillStyle = 'rgba(222,196,120,0.28)';
      for (let lane = 1; lane < 4; lane++) c.fillRect(16, Math.round(lane * 256 / 4) - 1, 36, 3);
    }, [length / HALL.beltTile, 1]);
    const beltTop = this.plane(length, width, cx, top, cz, new THREE.MeshStandardMaterial({ map: belt, roughness: 0.9 }), [-Math.PI / 2, 0, 0]);
    beltTop.name = 'usine:bande';
    this.box(length, 0.2, width, cx, top - 0.11, cz, this.mat(C.rubber, 0.9), this.scene, false);
    // Tambours d’extrémité et brin de retour sur rouleaux.
    const drum = this.mat(C.galvanised, 0.35, 0.8);
    for (const x of [x0, x1]) this.cylinder(0.22, 0.22, width + 0.1, x, top - 0.23, cz, drum, 'z', 24);
    for (let x = x0 + 0.9; x < x1 - 0.5; x += 1.25) this.cylinder(0.08, 0.08, width, x, top - 0.6, cz, drum, 'z', 12);
    this.box(length, 0.04, width - 0.1, cx, top - 0.7, cz, this.mat(C.rubber, 0.9), this.scene, false);
    // Châssis : longerons en U, bande de sécurité côté opérateur, boulons.
    const frame = this.mat(C.frame, 0.55, 0.45);
    for (const z of [z0 - 0.12, z1 + 0.12]) this.box(length + 0.5, 0.56, 0.14, cx, top - 0.02, z, frame, this.scene, false);
    const hazard = canvasTexture(256, 32, c => { c.fillStyle = C.black; c.fillRect(0, 0, 256, 32); c.fillStyle = C.yellow; for (let x = -32; x < 256; x += 32) { c.beginPath(); c.moveTo(x, 32); c.lineTo(x + 16, 32); c.lineTo(x + 48, 0); c.lineTo(x + 32, 0); c.fill(); } }, [length / 1.4, 1]);
    this.plane(length + 0.5, 0.2, cx, top + 0.15, z1 + 0.195, new THREE.MeshStandardMaterial({ map: hazard, roughness: 0.7 }));
    const bolt = this.mat(C.galvanised, 0.3, 0.8);
    for (let x = x0; x <= x1; x += 0.9) this.cylinder(0.035, 0.035, 0.03, x, top - 0.18, z1 + 0.2, bolt, 'z', 6);
    // Pieds, semelles, contreventements et longrines basses.
    for (const x of [x0 + 0.5, x0 + 3.7, x0 + 6.9, x1 - 0.4]) {
      for (const z of [z0 - 0.05, z1 + 0.05]) {
        this.box(0.18, top - 0.3 - floorY, 0.18, x, (top - 0.3 + floorY) / 2, z, frame, this.scene, false);
        this.box(0.42, 0.06, 0.42, x, floorY + 0.03, z, this.mat(C.darkSteel, 0.6, 0.5), this.scene, false);
      }
      const brace = this.box(0.08, Math.hypot(width + 0.1, 3), 0.08, x, floorY + 2.1, cz, frame, this.scene, false);
      brace.rotation.x = Math.atan2(width + 0.1, 3);
    }
    for (const z of [z0 - 0.05, z1 + 0.05]) this.box(length - 0.6, 0.12, 0.1, cx + 0.05, floorY + 0.9, z, frame, this.scene, false);
    // Moteur et réducteur derrière le tapis.
    const motor = this.mat('#5c7a8a', 0.45, 0.5);
    this.cylinder(0.36, 0.36, 1.0, x1 - 0.6, top - 0.75, z0 - 0.6, motor, 'x', 20);
    for (let i = 0; i < 6; i++) this.cylinder(0.39, 0.39, 0.03, x1 - 0.95 + i * 0.14, top - 0.75, z0 - 0.6, motor, 'x', 20);
    this.box(0.6, 0.62, 0.62, x1 - 0.05, top - 0.75, z0 - 0.6, this.mat(C.darkSteel, 0.5, 0.5));
    // Arrêt d’urgence sur le longeron avant (sous la ligne de visée des billes).
    this.box(0.36, 0.22, 0.3, x0 + 1.3, top + 0.38, z1 + 0.14, this.mat(C.yellow, 0.6));
    this.cylinder(0.11, 0.13, 0.1, x0 + 1.3, top + 0.54, z1 + 0.14, this.mat(C.red, 0.4), 'y', 18);
    // Support à rouleaux pour le carton de réception.
    const { x, z, width: bw, depth: bd } = HALL.box;
    this.box(bw + 0.5, 0.14, bd + 0.3, x, HALL.table - 0.07, z, frame, this.scene, false);
    for (let i = 0; i < 7; i++) this.cylinder(0.06, 0.06, bd + 0.2, x - bw / 2 + 0.1 + i * (bw / 6.4), HALL.table + 0.02, z, drum, 'z', 10);
    for (const dx of [-bw / 2, bw / 2]) for (const dz of [-bd / 2, bd / 2]) this.box(0.15, HALL.table - floorY, 0.15, x + dx, (HALL.table + floorY) / 2, z + dz, frame, this.scene, false);
    return belt;
  }

  private feeder(eventLamp: THREE.Mesh) {
    const { x0, z0, z1 } = HALL.belt, top = HALL.beltTop, floorY = HALL.floor;
    const body = this.mat('#5f8277', 0.6, 0.35), dark = this.mat('#1d2220', 0.9);
    const cx = x0 - 0.85, depth = z1 - z0 + 0.9, cz = (z0 + z1) / 2, height = 0.9 - floorY;
    this.box(1.6, height, depth, cx, floorY + height / 2, cz, body);
    // Ouverture de sortie fermée par des lanières de caoutchouc.
    this.box(0.04, 1.05, z1 - z0, x0 - 0.04, top + 0.45, cz, dark, this.scene, false);
    const curtain = new THREE.MeshStandardMaterial({ color: '#56676a', roughness: 0.5, transparent: true, opacity: 0.82 });
    for (let i = 0; i < 10; i++) this.box(0.02, 0.92, 0.42, x0 + 0.01, top + 0.5, z0 + 0.22 + i * 0.44, curtain, this.scene, false);
    // Bandes de sécurité, grille d’aération, plaque.
    const hazard = canvasTexture(256, 32, c => { c.fillStyle = C.black; c.fillRect(0, 0, 256, 32); c.fillStyle = C.yellow; for (let x = -32; x < 256; x += 32) { c.beginPath(); c.moveTo(x, 32); c.lineTo(x + 16, 32); c.lineTo(x + 48, 0); c.lineTo(x + 32, 0); c.fill(); } }, [3, 1]);
    this.plane(depth, 0.3, cx + 0.81, floorY + 0.4, cz, new THREE.MeshStandardMaterial({ map: hazard, roughness: 0.7 }), [0, Math.PI / 2, 0]);
    for (let i = 0; i < 7; i++) this.box(0.02, 0.05, 1.4, cx + 0.81, floorY + 1.3 + i * 0.13, cz + 0.9, dark, this.scene, false);
    // Plaque en façade, face à l’opérateur.
    const label = new Page(this.scene, 1.4, 0.34, cx, top + 1.2, cz + depth / 2 + 0.03, () => {});
    label.draw('alim', '#e2b23c', c => { c.font = 'bold 150px monospace'; c.fillStyle = '#262826'; c.fillText('ALIMENTATION', 30, 60, 940); });
    // Trémie pleine de billes et conduite vers le plafond.
    const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.38, 1.25, 4, 1, true), new THREE.MeshStandardMaterial({ color: '#6c8a7f', roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide }));
    hopper.rotation.y = Math.PI / 4; hopper.position.set(cx, 1.55, cz); hopper.castShadow = true; this.scene.add(hopper);
    const grey = this.mat('#cfd3cf', 0.25, 0.8), red = this.mat(C.red, 0.5);
    for (let i = 0; i < 9; i++) {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), i % 4 === 0 ? red : grey);
      ball.position.set(cx - 0.4 + (i % 3) * 0.4, 2.02 + Math.floor(i / 3) * 0.06, cz - 0.4 + Math.floor(i / 3) * 0.4); this.scene.add(ball);
    }
    this.cylinder(0.22, 0.22, 4.8, cx, 4.6, cz - 0.9, this.mat('#6f7e78', 0.45, 0.6), 'y', 14);
    // Colonne lumineuse : le voyant du haut signale les événements du service.
    const pole = this.mat(C.darkSteel, 0.5, 0.5);
    const sx = x0 - 0.3, sz = z0 - 0.15;
    this.cylinder(0.05, 0.05, 0.9, sx, 1.35, sz, pole, 'y', 10);
    this.cylinder(0.2, 0.2, 0.28, sx, 1.95, sz, this.mat(C.red, 0.4, 0, '#3a0d08'), 'y', 18);
    this.cylinder(0.2, 0.2, 0.28, sx, 2.25, sz, this.mat('#e3a23c', 0.4, 0, '#3a2408'), 'y', 18);
    eventLamp.geometry.dispose(); eventLamp.geometry = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 18);
    eventLamp.position.set(sx, 2.56, sz); this.scene.add(eventLamp);
    this.cylinder(0.21, 0.21, 0.05, sx, 2.74, sz, pole, 'y', 18);
  }

  private racks() {
    const floorY = HALL.floor, blue = this.mat(C.rackBlue, 0.55, 0.4), orange = this.mat(C.rackOrange, 0.55, 0.3);
    const wood = this.mat(C.pallet, 0.85), card = this.mat(C.cardboard, 0.85), crate = this.mat(C.crate, 0.6), tape = this.mat('#d8c39a', 0.7);
    for (const x of [-10.2, 10.2]) {
      const z = -3.65, w = 3.6, d = 1.9;
      for (const dx of [-w / 2, w / 2]) for (const dz of [-d / 2, d / 2]) this.box(0.12, 7.2, 0.12, x + dx, floorY + 3.6, z + dz, blue, this.scene, false);
      for (const dx of [-w / 2, w / 2]) for (let i = 0; i < 6; i++) { const lace = this.box(0.05, 1.5, 0.05, x + dx, floorY + 0.8 + i * 1.15, z, blue, this.scene, false); lace.rotation.x = i % 2 ? 0.95 : -0.95; }
      for (const [level, y] of [-4.35, -1.75, 0.85].entries()) {
        for (const dz of [-d / 2, d / 2]) this.box(w, 0.16, 0.1, x, y, z + dz, orange, this.scene, false);
        // Palette, puis cartons cerclés ou caisses selon le niveau.
        this.box(w - 0.3, 0.14, d - 0.1, x, y + 0.15, z, wood, this.scene, false);
        for (let i = 0; i < 3; i++) for (let j = 0; j < (level === 1 ? 1 : 2); j++) {
          const material = level === 1 ? crate : card;
          const bx = x - 1.05 + i * 1.05, bz = z - 0.42 + j * 0.84, size = level === 1 ? 0.95 : 0.8;
          this.box(size, size * 0.85, level === 1 ? 1.6 : 0.78, bx, y + 0.22 + size * 0.425, level === 1 ? z : bz, material);
          if (level !== 1) this.box(0.06, size * 0.86, 0.79, bx, y + 0.22 + size * 0.425, bz, tape, this.scene, false);
        }
      }
    }
  }

  private props() {
    const floorY = HALL.floor;
    // Fûts au pied du rayonnage gauche, palette vide et pile de cartons à droite.
    const drum = this.mat('#486f8a', 0.45, 0.4), drumRed = this.mat('#a24a3c', 0.45, 0.4);
    for (const [x, z, m] of [[-11.2, 1.6, drum], [-10.3, 2.2, drumRed], [-11.4, 2.75, drum]] as const) {
      this.cylinder(0.42, 0.42, 1.25, x, floorY + 0.63, z, m, 'y', 22);
      for (const dy of [0.32, 0.93]) this.cylinder(0.44, 0.44, 0.05, x, floorY + dy, z, m, 'y', 22);
    }
    const wood = this.mat(C.pallet, 0.85);
    for (let i = 0; i < 4; i++) this.box(1.9, 0.14, 1.3, 9.9, floorY + 0.08 + i * 0.16, 2.6, wood, this.scene, false);
    const card = this.mat(C.cardboard, 0.85);
    for (const [x, y, z] of [[9.5, 0.95, 2.4], [10.35, 0.95, 2.5], [9.9, 1.75, 2.45]] as const) this.box(0.78, 0.72, 0.72, x, floorY + y, z, card);
    // Extincteur et panneau, poubelle de rebut à droite du carton.
    this.cylinder(0.17, 0.17, 0.75, 7.35, floorY + 4.4, -4.6, this.mat(C.red, 0.4, 0.2), 'y', 16);
    const sign = new Page(this.scene, 0.9, 0.9, 7.35, floorY + 5.45, -4.82, () => {});
    sign.draw('feu', '#c4473a', c => { c.fillStyle = '#fff'; c.font = 'bold 200px monospace'; c.fillText('⚠', 330, 260); c.font = 'bold 110px monospace'; c.fillText('FEU', 380, 760); });
    const warning = new Page(this.scene, 1.5, 1.08, 7.35, 1.35, -4.83, () => {});
    warning.draw('rouges', '#e2b23c', c => {
      c.fillStyle = '#262826'; c.beginPath(); c.moveTo(500, 60); c.lineTo(760, 420); c.lineTo(240, 420); c.closePath(); c.fill();
      c.fillStyle = '#e2b23c'; c.font = 'bold 210px monospace'; c.fillText('!', 440, 390);
      c.fillStyle = '#262826'; c.font = 'bold 76px monospace'; c.fillText('BILLES ROUGES', 205, 470, 620); c.fillText('NE PAS TOUCHER', 190, 570, 640);
    });
    const exit = new Page(this.scene, 1.4, 0.5, 12.6, 1.6, 2.4, () => {});
    exit.mesh.rotation.y = -Math.PI / 2;
    exit.draw('sortie', '#3f8a55', c => { c.fillStyle = '#f2f2e6'; c.font = 'bold 190px monospace'; c.fillText('SORTIE →', 90, 120, 840); });
    // Armoire électrique sur le mur droit.
    this.box(0.5, 2.6, 1.7, 12.4, floorY + 2.1, -1.4, this.mat('#9aa59c', 0.5, 0.4));
    for (const y of [1.4, 2.2]) this.box(0.04, 0.05, 1.5, 12.14, floorY + y, -1.4, this.mat(C.darkSteel), this.scene, false);
  }
}
