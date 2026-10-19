import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Ball, GameState } from '../game/state';
import type { Register } from './interfaces';
import { BOARD } from './trajectory';
import type { Point } from './trajectory';

/** Rail et commande des aimants ; le rendu ne change jamais la sortie ou le paiement. */
export class MagnetModule {
  private poles: THREE.MeshStandardMaterial[] = [];
  private screen: THREE.CanvasTexture;
  private screenKey = '';
  private field: THREE.Line;
  private state?: GameState;
  private auto = false;

  constructor(private root: THREE.Group, register: Register) {
    const sage = new THREE.MeshStandardMaterial({ color: '#97ab94', roughness: 0.65 });
    const cream = new THREE.MeshStandardMaterial({ color: '#ddd1b5', roughness: 0.7 });
    const copper = new THREE.MeshStandardMaterial({ color: '#b68a6d', metalness: 0.5, roughness: 0.5 });
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) => {
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 1, Math.min(0.035, h / 3)), material);
      mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); return mesh;
    };
    box(10.16, 0.19, 0.3, 0, 0, 0.03, sage);
    const windings = new THREE.InstancedMesh(new THREE.TorusGeometry(0.064, 0.014, 5, 10), copper, 90);
    const winding = new THREE.Object3D(); winding.rotation.x = Math.PI / 2; let windingIndex = 0; root.add(windings);
    for (let i = 0; i < 15; i++) {
      const x = (i - 7) * BOARD.spacingX;
      const tip = new THREE.MeshStandardMaterial({ color: '#b8c5ae', emissive: '#85b5a4', emissiveIntensity: 0.06, roughness: 0.4 }); this.poles.push(tip);
      box(0.32, 0.09, 0.12, x, 0.1, 0.18, copper);
      for (const dx of [-0.115, 0.115]) {
        box(0.09, 0.2, 0.12, x + dx, 0.19, 0.18, tip);
        for (let j = 0; j < 3; j++) {
          winding.position.set(x + dx, 0.11 + j * 0.034, 0.18); winding.updateMatrix(); windings.setMatrixAt(windingIndex++, winding.matrix);
        }
      }
    }
    windings.computeBoundingSphere();
    // Le boîtier vertical occupe l’espace entre le compteur et le montant droit,
    // sous le rail : ni la trappe de montage ni les boutons ne le recouvrent.
    const control = box(0.95, 1.3, 0.38, 4.65, -0.75, 0.55, cream); control.name = 'magnets:controller';
    for (const x of [4.29, 5.01]) for (const y of [-1.32, -0.18]) box(0.05, 0.05, 0.035, x, y, 0.76, copper);
    const canvas = document.createElement('canvas'); canvas.width = 384; canvas.height = 480;
    this.screen = new THREE.CanvasTexture(canvas); this.screen.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.99), new THREE.MeshBasicMaterial({ map: this.screen, toneMapped: false })); face.position.set(4.65, -0.75, 0.75); root.add(face);
    register(control, 'magnets-inspect', () => `${this.state?.upgrades.includes('azur.magnets') ? 'Aimants' : 'Aimants d’essai'} — ${!this.auto ? 'Doigt arrêté, recharge en pause' : this.state?.magnetCooldownMs ? `recharge ${(this.state.magnetCooldownMs / 1000).toFixed(1)} s` : 'prêts pour la prochaine bille automatique hors ×40'} · une case vers un meilleur multiplicateur`, ['plinko', 'commandes']);
    face.userData.control = control;
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(32 * 3), 3));
    this.field = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#acd8c3', transparent: true, opacity: 0.32, depthWrite: false }));
    this.field.name = 'magnets:attraction'; this.field.frustumCulled = false; this.field.visible = false; root.add(this.field);
  }

  update(state: GameState, auto: boolean) {
    this.state = state; this.auto = auto; this.field.visible = false;
    const ready = state.magnetCooldownMs === 0;
    this.poles.forEach(material => { material.emissiveIntensity = ready && auto ? 0.32 : 0.06; });
    const label = !auto ? 'PAUSE' : ready ? 'PRÊTS' : `${Math.ceil(state.magnetCooldownMs / 1000)} s`;
    const installed = state.upgrades.includes('azur.magnets'), key = `${installed}/${label}`;
    if (key === this.screenKey) return;
    this.screenKey = key;
    const c = (this.screen.image as HTMLCanvasElement).getContext('2d')!;
    c.fillStyle = '#243c35'; c.fillRect(0, 0, 384, 480); c.fillStyle = '#c8d9b0'; c.textAlign = 'center';
    c.font = 'bold 50px monospace'; c.fillText('AIMANTS', 192, 80, 365); c.font = 'bold 72px monospace'; c.fillText(label, 192, 224, 365);
    c.font = '44px monospace'; c.fillStyle = '#c3aa84'; c.fillText(installed ? 'AUTO' : 'ESSAI', 192, 352); c.fillText('1 CASE', 192, 423); this.screen.needsUpdate = true;
  }

  attraction(ball: Ball, point: Point, progress: number, reduced: boolean) {
    if (ball.magnetFrom === undefined || progress < 0.8 || progress >= 1) return;
    this.poles[ball.exit].emissiveIntensity = 1.1;
    if (reduced) return;
    this.field.visible = true;
    const x = (ball.exit - 7) * BOARD.spacingX, position = this.field.geometry.getAttribute('position');
    const from = new THREE.Vector3(x, 0.3, 0.18), to = new THREE.Vector3(point.x, point.y, point.z).sub(this.root.position);
    for (let i = 0; i < position.count; i++) {
      const t = i / (position.count - 1);
      position.setXYZ(i, THREE.MathUtils.lerp(from.x, to.x, t) + Math.sin(t * Math.PI) * (point.x - x) * 0.16, THREE.MathUtils.lerp(from.y, to.y, t), THREE.MathUtils.lerp(from.z, to.z, t));
    }
    position.needsUpdate = true;
  }
}
