import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CONFIG } from '../config';
import type { GameState } from '../game/state';
import type { Register } from './interfaces';

/** Réservoir, compteur et tube réellement attachés à la machine. Aucune règle de paiement. */
export class CollectorModule {
  private beads: THREE.Mesh[] = [];
  private display: THREE.CanvasTexture;
  private key = '';
  private state?: GameState;
  constructor(root: THREE.Group, register: Register) {
    const cream = new THREE.MeshStandardMaterial({ color: '#dfd0b6', roughness: 0.75 });
    const sage = new THREE.MeshStandardMaterial({ color: '#92aa99', roughness: 0.65 });
    const brass = new THREE.MeshStandardMaterial({ color: '#af8a62', metalness: 0.5, roughness: 0.5 });
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) => {
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 1, 0.04), material); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); return mesh;
    };
    const body = box(1.55, 1.3, 0.9, 0, -0.88, 0.2, cream); body.name = 'collector:controller';
    for (const y of [-1.28, 0.85]) box(0.2, 0.18, 0.5, -0.71, y, -0.12, sage);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 1.6, 20), new THREE.MeshStandardMaterial({ color: '#c2d7cb', transparent: true, opacity: 0.18, depthWrite: false, roughness: 0.2 })); glass.position.set(0, 0.64, 0.2); root.add(glass);
    for (const y of [-0.18, 1.46]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.13, 20), sage); cap.position.set(0, y, 0.2); root.add(cap);
    }
    const beadMaterial = new THREE.MeshStandardMaterial({ color: '#b9a8c9', metalness: 0.5, roughness: 0.25 });
    const beadGeometry = new THREE.SphereGeometry(0.12, 12, 8);
    for (let i = 0; i < CONFIG.collectorThreshold; i++) {
      const bead = new THREE.Mesh(beadGeometry, beadMaterial); bead.position.set((i % 2 - 0.5) * 0.2, 0.02 + i * 0.14, 0.2); root.add(bead); this.beads.push(bead);
    }
    const curve = new THREE.CatmullRomCurve3([[0.35,-0.2,-0.4],[0.4,4.9,-0.55],[-0.3,6.25,-0.55],[-5.8,6.25,-0.55],[-6.4,5.7,-0.55],[-6.4,4.55,0.2]].map(p => new THREE.Vector3(...p as [number, number, number])));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.09, 8, false), sage); tube.name = 'collector:return-tube'; root.add(tube);
    for (const x of [-0.6, 0.6]) for (const y of [-1.4, -0.35]) box(0.07, 0.07, 0.03, x, y, 0.67, brass);
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 320;
    this.display = new THREE.CanvasTexture(canvas); this.display.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 0.9), new THREE.MeshBasicMaterial({ map: this.display, toneMapped: false })); screen.position.set(0, -0.87, 0.665); screen.userData.control = body; root.add(screen);
    register(body, 'collecteur', () => `Collecteur de ratés — ${this.state?.collectorCharge === CONFIG.collectorThreshold ? 'bille gratuite en attente' : `${this.state?.collectorCharge ?? 0}/10 sorties sous ×1`} · les billes offertes ne remplissent pas le réservoir`, ['plinko', 'collecteur']);
    const back = box(0.85, 0.3, 0.15, 0, -1.72, 0.25, sage); back.name = 'collector:return';
    const arrowCanvas = document.createElement('canvas'); arrowCanvas.width = 512; arrowCanvas.height = 128;
    const c = arrowCanvas.getContext('2d')!; c.fillStyle = '#9eb5a1'; c.fillRect(0, 0, 512, 128); c.fillStyle = '#263f36'; c.font = 'bold 70px monospace'; c.fillText('← PLINKO', 20, 86);
    const arrow = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.23), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(arrowCanvas) })); arrow.position.set(0, -1.72, 0.33); arrow.userData.control = back; root.add(arrow);
    register(back, 'plinko', () => 'Revenir au Plinko', ['collecteur']);
  }
  update(state: GameState) {
    this.state = state; this.beads.forEach((bead, i) => { bead.visible = i < state.collectorCharge; });
    const full = state.collectorCharge === CONFIG.collectorThreshold, blocked = state.pendingBalls.length >= CONFIG.maxBalls;
    const key = `${state.collectorCharge}/${blocked}`; if (key === this.key) return; this.key = key;
    const c = (this.display.image as HTMLCanvasElement).getContext('2d')!;
    c.fillStyle = '#283f36'; c.fillRect(0, 0, 512, 320); c.fillStyle = '#d6dfba'; c.textAlign = 'center';
    c.font = 'bold 42px monospace'; c.fillText('COLLECTEUR', 256, 56); c.font = 'bold 77px monospace'; c.fillText(`${state.collectorCharge} / 10`, 256, 151);
    c.font = 'bold 30px monospace'; c.fillText(full ? blocked ? 'PLATEAU PLEIN' : 'BILLE PRÊTE' : 'SORTIES SOUS ×1', 256, 218);
    c.font = '26px monospace'; c.fillStyle = '#b8a3c7'; c.fillText('1 BILLE OFFERTE · BASE 1', 256, 280);
    this.display.needsUpdate = true;
  }
}
