import * as THREE from 'three';
import { CONFIG, EXITS, VIEWS } from '../config';
import type { Navigation } from '../navigation/camera';
import type { Ball, GameState } from '../game/state';
import { BOARD, pathToExit, samplePath } from './trajectory';
import type { Point } from './trajectory';

function canvasTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  paint(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function label(text: string, width: number, height: number, color = '#f5d699', background = '#1b251f', font = 'bold 64px Georgia'): THREE.Mesh {
  const pixels = Math.max(256, Math.round(192 * width / height));
  const texture = canvasTexture(pixels, 192, ctx => {
    ctx.fillStyle = background; ctx.fillRect(0, 0, pixels, 192);
    ctx.strokeStyle = '#a18755'; ctx.lineWidth = 3; ctx.strokeRect(8, 8, pixels - 16, 176);
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font;
    const fontSize = Number(font.match(/(\d+)px/)?.[1] ?? 64);
    const scale = Math.min((pixels - 40) / ctx.measureText(text).width, 125 / fontSize);
    ctx.font = font.replace(/\d+px/, `${Math.floor(fontSize * scale)}px`);
    ctx.fillText(text, pixels / 2, 102, pixels - 32);
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture }));
}

export class PlinkoScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, 0.1, 150);
  private flights = new Map<string, { mesh: THREE.Mesh; points: Point[]; elapsed: number }>();
  private ballGeometry = new THREE.SphereGeometry(0.105, 14, 10);
  private ballMaterial = new THREE.MeshStandardMaterial({ color: '#fff0bd', metalness: 0.75, roughness: 0.2, emissive: '#9d6e28', emissiveIntensity: 0.25 });
  private autoMaterial = new THREE.MeshStandardMaterial({ color: '#a4ded6', metalness: 0.65, roughness: 0.22, emissive: '#26554b', emissiveIntensity: 0.4 });
  private bonusMaterial = new THREE.MeshStandardMaterial({ color: '#ffcb67', metalness: 0.6, roughness: 0.2, emissive: '#cf7b19', emissiveIntensity: 0.6 });
  private indicator: THREE.Mesh;
  private lamps: THREE.Mesh[] = [];
  private quality = '';
  private observer: ResizeObserver;
  private clickTargets: THREE.Object3D[] = [];
  private raycaster = new THREE.Raycaster();

  constructor(private element: HTMLElement, private navigation: Navigation, onAction: (view: 'plinko' | 'azur' | 'door') => void) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.domElement.setAttribute('aria-label', 'Machine de Plinko en bois et métal, avec quinze sorties et des trajectoires de billes animées.');
    this.renderer.domElement.setAttribute('role', 'img');
    element.append(this.renderer.domElement);
    this.scene.fog = new THREE.FogExp2('#181d19', 0.013);
    this.scene.add(new THREE.HemisphereLight('#ffeed3', '#303b30', 2.8));
    const key = new THREE.DirectionalLight('#ffcc89', 4.5);
    key.position.set(-5, 9, 12); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9 });
    key.shadow.normalBias = 0.04;
    this.scene.add(key);
    const rim = new THREE.PointLight('#6eaf9e', 80, 30); rim.position.set(8, 0, 4); this.scene.add(rim);

    const woodTexture = canvasTexture(256, 512, ctx => {
      ctx.fillStyle = '#785131'; ctx.fillRect(0, 0, 256, 512);
      for (let i = 0; i < 260; i++) {
        const x = (i * 37.7) % 256;
        ctx.strokeStyle = i % 3 ? 'rgba(37,19,8,.16)' : 'rgba(228,182,106,.13)';
        ctx.lineWidth = i % 4 + 0.5; ctx.beginPath(); ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + 15, 120, x - 15, 380, x + 5, 512); ctx.stroke();
      }
    });
    const wood = new THREE.MeshStandardMaterial({ map: woodTexture, color: '#bc8852', roughness: 0.84 });
    const darkWood = new THREE.MeshStandardMaterial({ map: woodTexture, color: '#6c4527', roughness: 0.9 });
    const felt = new THREE.MeshStandardMaterial({ color: '#1f493c', roughness: 0.95 });
    const brass = new THREE.MeshStandardMaterial({ color: '#bb9456', metalness: 0.78, roughness: 0.38 });
    const iron = new THREE.MeshStandardMaterial({ color: '#28342f', metalness: 0.7, roughness: 0.45 });

    this.box(11.45, 12.1, 0.65, 0, 0, -0.53, darkWood);
    this.box(10.65, 10.45, 0.14, 0, 0.12, -0.1, felt);
    this.box(0.4, 11.8, 0.72, -5.5, 0, -0.02, wood);
    this.box(0.4, 11.8, 0.72, 5.5, 0, -0.02, wood);
    this.box(11.7, 0.54, 0.86, 0, 5.9, -0.04, wood);
    this.box(11.7, 0.6, 1.15, 0, -5.76, 0.1, wood);
    this.box(10.7, 0.08, 0.28, 0, 5.19, 0.22, brass);
    const sign = label('M A S T E R P L I N K O', 8.7, 0.86); sign.position.set(0, 5.66, 0.44); this.scene.add(sign);
    const plate = label('PAPY · AZUR · PAUL  /  CONSTRUCTION SEMI-DÉFINITIVE', 6.4, 0.28, '#c4ac7b', '#242c24', '32px monospace'); plate.position.set(0, -5.73, 0.7); this.scene.add(plate);

    // Les coordonnées des picots suivent les points de rebond de trajectory.ts.
    const pinGeometry = new THREE.CylinderGeometry(0.071, 0.088, 0.4, 10);
    const pins = new THREE.InstancedMesh(pinGeometry, brass, 105);
    const washerGeometry = new THREE.CylinderGeometry(0.13, 0.13, 0.025, 12);
    const washers = new THREE.InstancedMesh(washerGeometry, iron, 105);
    const dummy = new THREE.Object3D(); let index = 0;
    for (let row = 0; row < 14; row++) {
      for (let col = 0; col <= row; col++) {
        dummy.position.set((col - row / 2) * BOARD.spacingX, BOARD.startY - row * BOARD.spacingY, 0.2);
        dummy.rotation.set(Math.PI / 2, 0, 0); dummy.updateMatrix(); pins.setMatrixAt(index, dummy.matrix);
        dummy.position.z = 0.04; dummy.updateMatrix(); washers.setMatrixAt(index++, dummy.matrix);
      }
    }
    pins.castShadow = true; this.scene.add(washers, pins);
    for (let i = 0; i < 15; i++) {
      const x = (i - 7) * BOARD.spacingX;
      const color = i < 3 || i > 11 ? '#e8bc6d' : i < 5 || i > 9 ? '#c4dab8' : '#a4b6a5';
      const text = `×${(EXITS[i] / 100).toLocaleString('fr-FR')}`;
      const tile = label(text, 0.59, 0.36, color, '#18261f', 'bold 76px monospace'); tile.position.set(x, -4.96, 0.44); this.scene.add(tile);
      this.box(0.035, 0.75, 0.45, x + 0.33, -4.34, 0.22, brass);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.15 }));
      lamp.position.set(x, -5.28, 0.36); this.scene.add(lamp); this.lamps.push(lamp);
    }
    this.box(10.35, 0.12, 0.9, 0, -4.73, 0.27, iron);
    for (const x of [-5.48, 5.48]) for (const y of [-5.67, -3, 0, 3, 5.85]) {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.07, 10), brass);
      screw.rotation.x = Math.PI / 2; screw.position.set(x, y, 0.48); this.scene.add(screw);
      this.box(0.09, 0.015, 0.02, x, y, 0.525, iron);
    }
    // Pieds et quelques objets de cave, sans détourner l’attention du plateau.
    for (const x of [-4.5, 4.5]) this.box(0.65, 1.2, 1, x, -6.35, -0.1, darkWood);
    const floor = this.box(55, 0.2, 42, 0, -7, -5, new THREE.MeshStandardMaterial({ color: '#30352c', roughness: 1 })); floor.receiveShadow = true;
    const wall = this.box(55, 30, 0.4, 0, 4, -5, new THREE.MeshStandardMaterial({ color: '#373c31', roughness: 1 })); wall.receiveShadow = true;
    for (let i = -5; i <= 5; i++) this.box(0.1, 20, 0.5, i * 3.4, 1, -4.64, darkWood);
    this.box(2.8, 1.6, 2.1, -7.4, -6.07, -1.5, darkWood);
    this.box(2.9, 0.18, 2.2, -7.4, -5.22, -1.5, wood);
    const note = label('NE PAS APPUYER.', 1.9, 0.55, '#3b3928', '#c9b584', 'bold 70px monospace'); note.position.set(-7.25, -5.9, -0.41); note.rotation.z = -0.1; this.scene.add(note);
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 12, 14), iron); pipe.position.set(7, -0.3, -3); this.scene.add(pipe);
    // L’établi existe dans la même pièce. La navigation ne recrée ni scène ni simulation.
    this.box(5.9, 0.32, 2.7, 10, -3.7, 0, wood);
    this.box(5.6, 0.65, 2.4, 10, -4.15, -0.1, darkWood);
    for (const x of [7.55, 12.45]) for (const z of [-0.9, 0.9]) this.box(0.3, 3.15, 0.3, x, -5.4, z, iron);
    this.box(5.5, 3.1, 0.22, 10, -1.8, -1.2, darkWood);
    const azurSign = label('L’ÉTABLI D’AZUR', 4.9, 0.58); azurSign.position.set(10, 0.22, -1.03); this.scene.add(azurSign);
    for (let i = 0; i < 7; i++) {
      this.box(0.08, 0.85 + (i % 3) * 0.1, 0.11, 7.95 + i * 0.63, -1.65, -0.98, brass);
      this.box(0.3, 0.15, 0.14, 7.95 + i * 0.63, -1.18, -0.94, iron);
    }
    const plans = label('DOIGT MÉCANIQUE / NORMALEMENT, OUI.', 2.3, 1.1, '#d2dacb', '#39504a', 'bold 39px monospace');
    plans.position.set(9.7, -3.5, 0.18); plans.rotation.x = -Math.PI / 2; this.scene.add(plans);
    this.box(0.85, 0.55, 0.7, 11.9, -3.23, 0.1, iron);
    const gear = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.075, 8, 14), brass); gear.position.set(8.5, -3.4, 0.6); gear.rotation.x = -Math.PI / 3; this.scene.add(gear);
    this.box(0.12, 1.8, 0.12, 12, -2.6, -0.6, brass);
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.35, 16, 1, true), iron); shade.position.set(12, -1.5, -0.6); this.scene.add(shade);
    const deskLight = new THREE.PointLight('#ffd49b', 12, 7); deskLight.position.set(11.8, -1.8, -0.1); this.scene.add(deskLight);
    this.box(2.8, 6.8, 0.3, 15, -3.4, -3.7, darkWood);
    const doorSign = label('USINE ↗', 2.1, 0.6); doorSign.position.set(15, -2.2, -3.5); this.scene.add(doorSign);
    this.box(0.14, 0.14, 0.2, 16, -3.9, -3.4, brass);
    for (const [view, x, y, w, h, z] of [['plinko', 0, 0, 11.5, 12, 0.8], ['azur', 10, -2.8, 5.9, 7, 1.5], ['door', 15, -3.4, 2.8, 6.8, -3.3]] as const) {
      const area = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
      area.position.set(x, y, z); area.userData.action = view; this.scene.add(area); this.clickTargets.push(area);
    }
    this.renderer.domElement.addEventListener('click', event => {
      if (this.navigation.moving) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), this.camera);
      const hit = this.raycaster.intersectObjects(this.clickTargets)[0];
      if (hit) onAction(hit.object.userData.action);
    });
    this.renderer.domElement.style.cursor = 'pointer';
    this.indicator = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshStandardMaterial({ color: '#8db28d', emissive: '#6aab73', emissiveIntensity: 0.6 }));
    this.indicator.position.set(4.95, 5.65, 0.51); this.scene.add(this.indicator);
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(element); this.resize();
  }

  private box(w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; this.scene.add(mesh); return mesh;
  }

  private resize() {
    const { width, height } = this.element.getBoundingClientRect();
    this.renderer.setSize(Math.max(1, width), Math.max(1, height));
    this.camera.aspect = width / Math.max(1, height);
    this.updateCamera(); this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
  }

  private updateCamera() {
    const mix = (a: number, b: number) => THREE.MathUtils.lerp(a, b, this.navigation.value);
    const x = mix(VIEWS.plinko.x, VIEWS.azur.x), y = mix(VIEWS.plinko.y, VIEWS.azur.y);
    const distance = Math.max(mix(VIEWS.plinko.height, VIEWS.azur.height), mix(VIEWS.plinko.width, VIEWS.azur.width) / this.camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(19)));
    this.camera.position.set(x + 0.65, y + 0.75, distance); this.camera.lookAt(x, y, 0);
  }

  frame(state: GameState, delta: number, active: boolean, onArrival: (id: string) => boolean) {
    if (active) this.navigation.advance(delta, state.preferences.reducedMotion);
    this.updateCamera();
    if (this.quality !== state.preferences.quality) {
      this.quality = state.preferences.quality;
      this.renderer.setPixelRatio(this.quality === 'low' ? 1 : Math.min(devicePixelRatio, 1.75));
      this.renderer.shadowMap.enabled = this.quality !== 'low'; this.resize();
      this.renderer.shadowMap.needsUpdate = true;
    }
    const ids = new Set(state.pendingBalls.map(ball => ball.id));
    for (const [id, flight] of this.flights) if (!ids.has(id)) { this.scene.remove(flight.mesh); this.flights.delete(id); }
    for (const ball of state.pendingBalls) if (!this.flights.has(ball.id)) this.addBall(ball);
    for (const [id, flight] of this.flights) {
      if (active) flight.elapsed += delta;
      const point = samplePath(flight.points, flight.elapsed / CONFIG.flightDuration, state.preferences.reducedMotion);
      flight.mesh.position.set(point.x, point.y, point.z);
      if (active && flight.elapsed >= CONFIG.flightDuration && onArrival(id)) {
        this.scene.remove(flight.mesh); this.flights.delete(id);
        const ball = state.pendingBalls.find(ball => ball.id === id);
        if (ball) (this.lamps[ball.exit].material as THREE.MeshStandardMaterial).emissiveIntensity = 1.1;
      }
    }
    for (const lamp of this.lamps) {
      const material = lamp.material as THREE.MeshStandardMaterial;
      if (active) material.emissiveIntensity = Math.max(0.15, material.emissiveIntensity - delta / 1800);
    }
    const indicatorMaterial = this.indicator.material as THREE.MeshStandardMaterial;
    indicatorMaterial.color.set(state.repairTriggered && !state.repairPurchased ? '#e57d50' : state.bonusRemainingMs > 0 ? '#ffc75d' : '#91bd91');
    this.renderer.render(this.scene, this.camera);
    this.element.dataset.renderedView = this.navigation.moving ? 'moving' : this.navigation.target;
  }

  private addBall(ball: Ball) {
    const mesh = new THREE.Mesh(this.ballGeometry, ball.bonus === 10 ? this.bonusMaterial : ball.origin === 'auto' ? this.autoMaterial : this.ballMaterial);
    mesh.castShadow = false; this.scene.add(mesh);
    this.flights.set(ball.id, { mesh, points: pathToExit(ball.exit), elapsed: 0 });
  }
}
