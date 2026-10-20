import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CONFIG, FACTORY_EVENTS } from '../config';
import type { GameState } from '../game/state';
import type { FactoryBall } from '../game/packing';
import { factoryClock, factoryEventAt, factoryReward } from '../game/packing';
import { Page } from './interfaces';
import { FactoryHall, HALL } from './factoryHall';

const TABLE = -1.4;
const BOX = { x: 5.3, z: 1.1, width: 2.9, depth: 3.1 };

/** Salle d’origine ; les clics passent toujours par la transaction du moteur. */
export class FactoryWork {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(39, 1, 0.1, 70);
  private renderer: THREE.WebGLRenderer;
  private ray = new THREE.Raycaster();
  private balls = new Map<number, THREE.Mesh>();
  private sphere = new THREE.SphereGeometry(0.39, 20, 14);
  private silver = new THREE.MeshStandardMaterial({ color: '#d5d9d6', metalness: 0.8, roughness: 0.26 });
  private red = new THREE.MeshStandardMaterial({ color: '#d94735', roughness: 0.5 });
  private marks = new Map<FactoryBall['kind'], THREE.SpriteMaterial>();
  private drops: { mesh: THREE.Mesh; from: THREE.Vector3; ms: number }[] = [];
  private puffs: THREE.Mesh[] = [];
  private explosionMs = 0;
  private exploded = false;
  private counter: Page;
  private card: Page;
  private focused?: THREE.Object3D;
  private keyboardFocus = false;
  private pointer?: { x: number; y: number };
  private hint = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: true, transparent: true }));
  private highlight = new THREE.Box3Helper(new THREE.Box3(), '#eadab3');
  private hintText = '';
  private enabled = false;
  private state?: GameState;
  private observer: ResizeObserver;
  private hall: FactoryHall;
  private eventLamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshStandardMaterial({ color: '#91ad96', emissive: '#49684f', emissiveIntensity: 0.4 }));
  private lastEvent = '';
  get explosionFinished() { return this.explosionMs >= 1100; }
  constructor(private element: HTMLElement, private announce: (text: string) => void, private hitBall: (id: number) => boolean) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const canvas = this.renderer.domElement;
    canvas.tabIndex = 0; canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-label', 'Usine : cliquer les billes grises, éviter les rouges marquées X');
    canvas.setAttribute('aria-describedby', 'factory-help'); element.append(canvas);
    const register = () => {};
    // Salle d’usine et convoyeur procéduraux ; mêmes coordonnées de poste pour billes, carton et fiches.
    this.hall = new FactoryHall(this.scene, this.eventLamp);
    const metal = '#4e6b66', cardboard = '#bc9363';
    const plaque = new Page(this.scene, 7.8, 0.9, 0, 3.9, -4.6, register);
    plaque.draw('title', '#e2b23c', c => { this.text(c, 'L’USINE DU COIN', 40, 22, 76, '#262826'); });
    this.box(8.1, 1.1, 0.12, 0, 3.9, -4.68, metal);
    this.box(BOX.width, 0.12, BOX.depth, BOX.x, TABLE + 0.12, BOX.z, cardboard);
    for (const x of [BOX.x - BOX.width / 2, BOX.x + BOX.width / 2]) this.box(0.13, 1.55, BOX.depth, x, TABLE + 0.86, BOX.z, cardboard);
    for (const z of [BOX.z - BOX.depth / 2, BOX.z + BOX.depth / 2]) this.box(BOX.width, 1.55, 0.13, BOX.x, TABLE + 0.86, z, cardboard);
    for (const side of [-1, 1]) { const flap = this.box(0.95, 0.08, BOX.depth, BOX.x + side * (BOX.width / 2 + 0.45), TABLE + 1.54, BOX.z, cardboard); flap.rotation.z = side * 0.28; }
    this.box(BOX.width - 0.16, 0.03, BOX.depth - 0.16, BOX.x, TABLE + 0.22, BOX.z, '#cba570');
    const label = new Page(this.scene, 2.9, 0.65, BOX.x, TABLE + 0.87, BOX.z + BOX.depth / 2 + 0.08, register);
    label.draw('box', '#e5d5b2', c => this.text(c, 'BILLES · PLINKO', 65, 60, 92));
    // Fiches du service sur des tableaux fixés à des montants d’acier.
    this.box(4.5, 2.4, 0.2, -3.7, 1.55, -2.5, metal);
    for (const x of [-5.75, -1.65]) this.box(0.12, 2.6 - HALL.floor, 0.12, x, (2.6 + HALL.floor) / 2, -2.62, metal);
    this.counter = new Page(this.scene, 4.2, 2.1, -3.7, 1.55, -2.38, register);
    this.box(4.3, 3, 0.12, 3.4, 2, -2.4, metal);
    for (const x of [1.45, 5.35]) this.box(0.12, 3.4 - HALL.floor, 0.12, x, (3.4 + HALL.floor) / 2, -2.52, metal);
    this.card = new Page(this.scene, 4.05, 2.75, 3.4, 2, -2.3, register);
    for (let i = 0; i < 18; i++) {
      const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 1), new THREE.MeshBasicMaterial({ color: i < 5 ? '#f3b65a' : '#8e9184', transparent: true, opacity: 0, depthWrite: false }));
      puff.visible = false; this.scene.add(puff); this.puffs.push(puff);
    }
    this.hint.visible = this.highlight.visible = false;
    (this.highlight.material as THREE.LineBasicMaterial).transparent = true;
    (this.highlight.material as THREE.LineBasicMaterial).opacity = 0.45;
    this.scene.add(this.hint, this.highlight); this.bind();
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(element); this.resize();
  }
  private box(w: number, h: number, d: number, x: number, y: number, z: number, color: string) {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 1, Math.min(0.06, h / 3, d / 3)), new THREE.MeshStandardMaterial({ color, roughness: 0.8 }));
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; this.scene.add(mesh); return mesh;
  }
  private text(c: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color = '#304b3d') {
    c.font = `bold ${size}px monospace`; c.fillStyle = color; c.fillText(value, x, y, 900);
  }
  reset() {
    this.focus(); this.pointer = undefined; this.exploded = false; this.explosionMs = 0; this.lastEvent = '';
    for (const ball of this.balls.values()) this.scene.remove(ball);
    for (const drop of this.drops) this.scene.remove(drop.mesh);
    this.balls.clear(); this.drops = []; this.puffs.forEach(puff => { puff.visible = false; });
  }
  setActive(active: boolean) { this.enabled = active; if (!active) this.focus(); }
  focusCanvas() { this.renderer.domElement.focus({ preventScroll: true }); }
  private mark(mesh: THREE.Mesh, kind: FactoryBall['kind']) {
    let material = this.marks.get(kind);
    if (!material) {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
      const c = canvas.getContext('2d')!;
      c.fillStyle = kind === 'red' ? '#321b17' : '#233a30'; c.beginPath(); c.arc(32, 32, 29, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff2cd'; c.font = 'bold 46px monospace'; c.textAlign = 'center'; c.fillText(kind === 'red' ? '×' : '+', 32, 48);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      material = new THREE.SpriteMaterial({ map: texture, depthTest: true }); this.marks.set(kind, material);
    }
    const mark = new THREE.Sprite(material);
    mark.position.set(0, 0.27, 0.46); mark.scale.set(0.43, 0.43, 1); mesh.add(mark);
  }
  private act(target: THREE.Object3D) {
    if (!this.enabled || document.hidden || this.state?.factory.status !== 'active') return;
    const id = target.userData.id as number, kind = target.userData.kind;
    if (!this.hitBall(id)) return;
    const mesh = this.balls.get(id);
    if (mesh) {
      this.balls.delete(id);
      if (kind === 'grey') this.drops.push({ mesh, from: mesh.position.clone(), ms: 0 });
      else this.scene.remove(mesh);
    }
    this.focus();
    this.announce(kind === 'red' ? 'Explosion ! Service terminé, aucun gain.' : 'Bille grise : 0,50 pièce en attente.');
  }
  private focus(object?: THREE.Object3D) {
    this.focused = object; this.hint.visible = this.highlight.visible = !!object;
    this.element.dataset.focusedAction = object ? `hit:${object.userData.id}` : '';
    if (!object) { this.hintText = ''; return; }
    const text = object.userData.kind === 'red' ? 'Danger — explosion, tous les gains perdus' : 'Bille grise — +0,50 pièce en fin de service';
    if (this.hintText !== text) {
      this.hintText = text; this.announce(text); this.renderer.domElement.setAttribute('aria-label', text);
      const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 112;
      const c = canvas.getContext('2d')!; c.fillStyle = '#21382fee'; c.fillRect(0, 0, 1024, 112); c.fillStyle = '#f1e2bd'; c.font = '34px monospace'; c.textAlign = 'center'; c.fillText(text, 512, 67, 980);
      const material = this.hint.material as THREE.SpriteMaterial; material.map?.dispose(); material.map = new THREE.CanvasTexture(canvas); material.map.colorSpace = THREE.SRGBColorSpace; material.needsUpdate = true;
    }
    this.highlight.box.setFromObject(object).expandByScalar(0.05);
    object.getWorldPosition(this.hint.position); this.hint.position.y += 0.9; this.hint.scale.set(6, 0.65, 1);
  }
  private hit(x: number, y: number) {
    if (!this.enabled || this.state?.factory.status !== 'active') return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.scene.updateMatrixWorld(true);
    this.ray.setFromCamera(new THREE.Vector2((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2), this.camera);
    const target = this.ray.intersectObjects([...this.balls.values()], false)[0];
    if (!target) return;
    const blocked = this.ray.intersectObjects(this.scene.children, true).some(other => other.distance < target.distance - 0.04 && other.object instanceof THREE.Mesh && other.object.visible && other.object !== target.object);
    return blocked ? undefined : target.object;
  }
  private bind() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointermove', event => {
      this.keyboardFocus = false; this.pointer = { x: event.clientX, y: event.clientY };
      const target = this.hit(event.clientX, event.clientY); this.focus(target); canvas.style.cursor = target ? 'pointer' : 'default';
    });
    canvas.addEventListener('click', event => { this.focusCanvas(); const target = this.hit(event.clientX, event.clientY); if (target) this.act(target); });
    canvas.addEventListener('pointerleave', () => { this.pointer = undefined; this.focus(); });
    canvas.addEventListener('blur', () => { this.keyboardFocus = false; this.focus(); });
    canvas.addEventListener('keydown', event => {
      if (!this.enabled) return;
      if (event.key === 'Tab') {
        event.preventDefault(); this.keyboardFocus = true; this.pointer = undefined;
        const list = [...this.balls.values()], index = this.focused ? list.indexOf(this.focused as THREE.Mesh) : -1;
        this.focus(list[index < 0 ? (event.shiftKey ? list.length - 1 : 0) : (index + (event.shiftKey ? -1 : 1) + list.length) % list.length]);
      } else if ((event.key === 'Enter' || event.code === 'Space') && this.focused) { event.preventDefault(); if (!event.repeat) this.act(this.focused); }
    });
  }
  private resize() {
    const { width, height } = this.element.getBoundingClientRect();
    if (!width || !height) return;
    this.camera.aspect = width / height;
    const distance = Math.max(10.5, 16.8 / this.camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(19.5)));
    this.camera.position.set(0.6, 7.9, 0.8 + distance); this.camera.lookAt(0, -0.1, 0.8);
    this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld(true); this.renderer.setSize(width, height);
  }
  frame(state: GameState, delta: number, reduced = false, animate = true) {
    this.state = state;
    const f = state.factory;
    const elapsed = CONFIG.factoryDuration - state.factoryRemainingMs;
    const event = factoryEventAt(f, elapsed), definition = event && FACTORY_EVENTS[event.kind];
    const eventKey = event ? `${event.kind}:${event.warning ? 'warning' : 'active'}` : 'normal';
    const eventSeconds = event ? Math.ceil(event.remainingMs / 1000) : 0;
    this.element.dataset.event = eventKey;
    if (eventKey !== this.lastEvent) {
      if (definition) this.announce(`${event.warning ? 'Attention, dans deux secondes : ' : ''}${definition.name}. ${definition.detail}.`);
      else if (this.lastEvent && f.status === 'active') this.announce('Fin de l’événement. Cadence normale.');
      this.lastEvent = eventKey;
    }
    const lampColor = event?.warning ? '#efbc67' : definition?.color ?? '#91ad96';
    this.eventLamp.material.color.set(lampColor); this.eventLamp.material.emissive.set(lampColor);
    const beltTravel = reduced || f.legacy ? 0 : factoryClock(f.events, elapsed, 'belt') * 9.2 / CONFIG.factoryTravelDuration;
    // La bande défile avec l’horloge du tapis (même vitesse que les billes), figée en mouvement réduit.
    this.hall.beltTexture.offset.x = -beltTravel / HALL.beltTile;
    for (const [id, mesh] of this.balls) if (!f.balls.some(ball => ball.id === id)) {
      this.scene.remove(mesh); this.balls.delete(id);
    }
    for (const ball of f.balls) {
      let mesh = this.balls.get(ball.id);
      if (!mesh) {
        mesh = new THREE.Mesh(this.sphere, ball.kind === 'red' ? this.red : this.silver); mesh.castShadow = true;
        mesh.userData = { id: ball.id, kind: ball.kind }; mesh.name = `factory:${ball.kind}:${ball.id}`;
        this.mark(mesh, ball.kind); this.balls.set(ball.id, mesh); this.scene.add(mesh);
      }
      mesh.position.set(-6.1 + 9.2 * ball.ageMs / CONFIG.factoryTravelDuration, TABLE + 0.66, -1.3 + ball.lane * 1.07);
    }
    for (const drop of this.drops) {
      if (animate) drop.ms += delta;
      const t = reduced ? 1 : Math.min(1, drop.ms / 320);
      drop.mesh.position.lerpVectors(drop.from, new THREE.Vector3(BOX.x, TABLE + 0.65, BOX.z), t);
      drop.mesh.position.y += Math.sin(t * Math.PI) * 2.4;
      if (t === 1) this.scene.remove(drop.mesh);
    }
    this.drops = this.drops.filter(drop => drop.ms < 320 && !reduced);
    if (f.status === 'exploded') {
      if (!this.exploded) { this.exploded = true; this.explosionMs = 0; this.focus(); }
      if (animate) this.explosionMs += delta;
      const t = Math.min(1, this.explosionMs / 1100);
      this.puffs.forEach((puff, i) => {
        puff.visible = !reduced && t < 1;
        const angle = i * 2.4, spread = 1 + t * 6;
        puff.position.set(Math.cos(angle) * spread, 0.6 + Math.sin(angle * 1.7) * spread * 0.6, 4 + t * 4 + Math.sin(angle) * spread * 0.3);
        puff.scale.setScalar(0.5 + t * 2.3); (puff.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.85;
      });
    }
    if (this.enabled) {
      if (this.keyboardFocus) this.focus(this.focused && this.balls.get(this.focused.userData.id) === this.focused ? this.focused : undefined);
      else if (this.pointer) this.focus(this.hit(this.pointer.x, this.pointer.y));
    }
    this.element.dataset.hits = String(f.greyHits); this.element.dataset.round = f.status;
    this.counter.draw(`${f.greyHits}/${f.status}/${f.legacy}/${eventKey}/${eventSeconds}`, event ? '#eddfbf' : '#e8dbb7', c => {
      this.text(c, f.status === 'exploded' ? 'EXPLOSION !' : 'TRI DES BILLES', 45, 35, 70);
      this.text(c, `${f.greyHits} GRISE(S) VALIDÉE(S)`, 45, 135, 53);
      const amount = (factoryReward(f) / 100).toFixed(2).replace('.', ',');
      this.text(c, `${amount} PIÈCES EN ATTENTE`, 45, 225, 53);
      if (event && definition) {
        this.text(c, definition.name, 45, 320, 55, '#76502e');
        this.text(c, definition.detail, 45, 390, 38);
        this.text(c, event.warning ? `DÉMARRAGE DANS ${eventSeconds} s` : `RETOUR NORMAL DANS ${eventSeconds} s`, 45, 445, 34);
      } else {
        this.text(c, f.status === 'exploded' ? 'SERVICE PERDU · 0,00' : 'CADENCE NORMALE', 45, 330, 46);
        this.text(c, 'VERSEMENT EN FIN DE SERVICE', 45, 415, 35);
      }
    });
    const seconds = Math.ceil(state.factoryRemainingMs / 1000);
    this.card.draw(`${seconds}/${this.enabled}/${f.legacy}`, '#e8dbb7', c => {
      this.text(c, 'FICHE DU SERVICE', 45, 40, 67);
      this.text(c, `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} RESTANTES`, 45, 158, 86);
      if (f.legacy) {
        this.text(c, 'ANCIEN SERVICE EN COURS', 45, 290, 48);
        this.text(c, 'SALAIRE CONSERVÉ : 15,00', 45, 360, 44);
      } else {
        this.text(c, '+ GRISE : +0,50 PIÈCE', 45, 290, 52);
        this.text(c, '× ROUGE : EXPLOSION', 45, 365, 52, '#963c2e');
      }
      this.text(c, this.enabled ? 'SERVICE EN COURS' : 'POSTE EN PAUSE', 45, 445, 46);
    });
    this.renderer.render(this.scene, this.camera);
  }
}
