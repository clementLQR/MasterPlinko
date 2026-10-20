import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CONFIG, DOWNLOADS, UPGRADES } from '../config';
import type { DownloadId } from '../config';
import { downloadIssue, recalibrationIssue } from '../game/plans';
import { digitalModule, instabilityCents, riftOpen } from '../game/state';
import type { GameState } from '../game/state';
import { Page } from './interfaces';
import type { InterfaceState, Register } from './interfaces';

const money = (n: number) => (n / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const DOWNLOAD_IDS = Object.keys(DOWNLOADS) as DownloadId[];

function text(c: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color: string, width = 920, align: CanvasTextAlign = 'left') {
  c.font = `bold ${size}px monospace`; c.fillStyle = color; c.textAlign = align; c.fillText(value, x, y, width); c.textAlign = 'left';
}
function wrap(c: CanvasRenderingContext2D, value: string, x: number, y: number, width: number, size: number, color: string) {
  c.font = `${size}px monospace`; c.fillStyle = color; let line = '', row = 0;
  for (const word of value.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (c.measureText(next).width > width && line) { c.fillText(line, x, y + row++ * size * 1.3); line = word; } else line = next;
  }
  if (line) c.fillText(line, x, y + row * size * 1.3);
}
function button(c: CanvasRenderingContext2D, label: string, x: number, y: number, w: number, h: number, enabled: boolean, accent = '#b9a4d6') {
  c.fillStyle = enabled ? accent : '#3d4545'; c.fillRect(x, y, w, h);
  text(c, label, x + w / 2, y + h / 2 - 20, 38, enabled ? '#1e1b26' : '#8a9390', w - 30, 'center');
}

/**
 * Compteur d’instabilité (faille ouverte par le Duplicateur, bouton RECALIBRER et récapitulatif à
 * confirmer) et terminal du module numérique (catalogue des téléchargements). Supports 3D, aucun HUD :
 * les décisions restent dans le moteur.
 */
export class RiftModules {
  private counter: Page;
  private terminal: Page;
  private recalButton: THREE.MeshStandardMaterial;
  private riftGlow: THREE.MeshStandardMaterial;
  private state?: GameState;
  private ui?: InterfaceState;

  constructor(counterGroup: THREE.Group, terminalGroup: THREE.Group, duplicatorGroup: THREE.Group, register: Register) {
    const casing = new THREE.MeshStandardMaterial({ color: '#4b4458', roughness: 0.55, metalness: 0.2 });
    const steel = new THREE.MeshStandardMaterial({ color: '#2d3533', roughness: 0.5, metalness: 0.5 });
    const box = (parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) => {
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, Math.min(0.08, d / 3)), material); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh;
    };

    // Compteur d’instabilité : écran, jauge et bouton physique RECALIBRER.
    box(counterGroup, 1.85, 2.35, 0.45, 0, 0, 0, casing);
    this.counter = new Page(counterGroup, 1.65, 1.35, 0, 0.36, 0.235, register);
    register(this.counter.mesh, 'instabilite', () => this.counterLabel(), ['plinko', 'commandes']);
    this.counter.zone('recalibrate-confirm', () => 'Confirmer le recalibrage', 40, 600, 440, 110, ['instabilite']);
    this.counter.zone('recalibrate-cancel', () => 'Annuler — garder la partie (Échap)', 520, 600, 440, 110, ['instabilite']);
    this.counter.zone('plinko', () => 'Revenir à la machine', 40, 720, 920, 80, ['instabilite']);
    this.recalButton = new THREE.MeshStandardMaterial({ color: '#8f6fb8', emissive: '#a77cf0', emissiveIntensity: 0, roughness: 0.4 });
    const plate = box(counterGroup, 1.2, 0.42, 0.12, 0, -0.78, 0.25, steel);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.14, 24), this.recalButton); knob.rotation.x = Math.PI / 2; knob.position.set(-0.32, -0.78, 0.36); counterGroup.add(knob);
    const label = new Page(counterGroup, 0.62, 0.2, 0.22, -0.78, 0.315, register);
    label.draw('recal', '#2d3533', c => text(c, 'RECALIBRER', 500, 60, 150, '#d9cdee', 960, 'center'));
    const action = () => { const issue = this.state && recalibrationIssue(this.state); return issue ? `Recalibrer — ${issue}` : 'Recalibrer — voir ce qui sera perdu, conservé et gagné'; };
    for (const object of [plate, knob, label.mesh]) register(object, 'recalibrate', action, ['plinko', 'commandes', 'instabilite']);

    // Terminal mural du module numérique.
    box(terminalGroup, 2.7, 2.55, 0.3, 0, 0, 0, new THREE.MeshStandardMaterial({ color: '#33494a', roughness: 0.5, metalness: 0.3 }));
    box(terminalGroup, 0.12, 0.9, 0.12, 0.95, 1.65, -0.02, steel);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), new THREE.MeshStandardMaterial({ color: '#9ff0c9', emissive: '#59d69a', emissiveIntensity: 1.2 })); led.position.set(0.95, 2.13, -0.02); terminalGroup.add(led);
    this.terminal = new Page(terminalGroup, 2.4, 2.1, 0, 0.05, 0.16, register);
    register(this.terminal.mesh, 'numerique', () => 'Module numérique — améliorations téléchargeables', ['plinko', 'commandes']);
    this.terminal.zone('dl-prev', () => 'Téléchargement précédent', 30, 700, 220, 110, ['numerique']);
    this.terminal.zone('dl-next', () => 'Téléchargement suivant', 750, 700, 220, 110, ['numerique']);
    this.terminal.zone('dl-buy', () => this.buyLabel(), 270, 700, 460, 110, ['numerique']);
    this.terminal.zone('plinko', () => 'Revenir à la machine', 30, 830, 940, 50, ['numerique']);

    // Faille visible dans la chambre du Duplicateur : lueur qui grandit avec l’instabilité.
    this.riftGlow = new THREE.MeshStandardMaterial({ color: '#2a1f3a', emissive: '#b07cff', emissiveIntensity: 0.1, transparent: true, opacity: 0.85 });
    const rift = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.1), this.riftGlow); rift.position.set(0, 0.15, 0.64); duplicatorGroup.add(rift);
    register(rift, 'instabilite', () => `Duplicateur — faille ${this.percent()} %`, ['plinko']);
  }

  private percent() { return this.state ? Math.min(100, Math.floor(instabilityCents(this.state) * 100 / CONFIG.instabilityThreshold)) : 0; }
  private counterLabel() { return this.state && riftOpen(this.state) ? 'Faille ouverte — le recalibrage est possible' : `Compteur d’instabilité — faille ${this.percent()} %`; }
  private current(): DownloadId { return DOWNLOAD_IDS[Math.min(this.ui?.downloadPage ?? 0, DOWNLOAD_IDS.length - 1)]; }
  private buyLabel() {
    if (!this.state) return 'Télécharger';
    const id = this.current(), issue = downloadIssue(this.state, id);
    return issue ? `${DOWNLOADS[id].name} — ${issue}` : `Télécharger ${DOWNLOADS[id].name} — ${money(DOWNLOADS[id].price)} pièces`;
  }
  /** Bouton disponible ? Utilisé par le filtre des actions de la scène. */
  actionAvailable(action: string): boolean {
    const page = this.ui?.downloadPage ?? 0;
    if (action === 'dl-prev') return page > 0;
    if (action === 'dl-next') return page < DOWNLOAD_IDS.length - 1;
    if (action === 'dl-buy') return !!this.state && !downloadIssue(this.state, this.current()) && !!this.ui?.canWrite;
    if (action === 'recalibrate-confirm' || action === 'recalibrate-cancel') return !!this.ui?.confirmRecalibration;
    return true;
  }

  update(state: GameState, ui: InterfaceState, elapsed: number) {
    this.state = state; this.ui = ui;
    const percent = this.percent(), open = riftOpen(state), ready = !recalibrationIssue(state);
    this.recalButton.emissiveIntensity = ready ? 0.6 + 0.4 * Math.sin(elapsed / 300) : 0;
    this.riftGlow.emissiveIntensity = 0.15 + percent / 100 * 1.4 + (open ? 0.4 * Math.sin(elapsed / 220) : 0);
    const confirming = !!ui.confirmRecalibration;
    this.counter.draw(JSON.stringify([percent, open, ready, confirming, confirming && [state.walletCents, state.upgrades, state.recalibrations]]), '#1d1a26', c => {
      if (confirming) {
        text(c, 'RECALIBRER LA MACHINE ?', 40, 25, 52, '#e3d6ff');
        const lost = state.upgrades.filter(id => id !== 'azur.initial_repair').map(id => UPGRADES[id].name).join(', ') || 'aucune';
        text(c, 'PERDU', 40, 105, 36, '#f0a7a0'); wrap(c, `Solde ${money(state.walletCents)} → ${money(CONFIG.initialWallet)} · améliorations : ${lost}`, 200, 108, 760, 28, '#e9e2f5');
        text(c, 'CONSERVÉ', 40, 265, 36, '#a9e3c4'); wrap(c, 'Réparation et accès à Azur, historique du Bac, réglages, téléchargements', 260, 268, 700, 28, '#e9e2f5');
        text(c, 'GAGNÉ', 40, 400, 36, '#f1d48c'); wrap(c, state.recalibrations === 0 ? 'Module numérique offert : améliorations téléchargeables' : 'Faille refermée ; le Duplicateur pourra la rouvrir', 200, 403, 760, 28, '#e9e2f5');
        button(c, 'CONFIRMER', 40, 600, 440, 110, true, '#c9a8f0');
        button(c, 'ANNULER', 520, 600, 440, 110, true, '#b8c4bf');
        return;
      }
      text(c, 'FAILLE SPATIO-TEMPORELLE', 40, 30, 46, '#c9b8ea');
      text(c, `${percent} %`, 40, 110, 170, open ? '#f1d48c' : '#e3d6ff');
      c.fillStyle = '#3a3150'; c.fillRect(40, 340, 920, 70); c.fillStyle = open ? '#f1d48c' : '#a77cf0'; c.fillRect(40, 340, 920 * percent / 100, 70);
      const remaining = Math.max(0, CONFIG.instabilityThreshold - instabilityCents(state));
      wrap(c, open ? (ready ? 'Faille ouverte. Bouton RECALIBRER : voir le détail avant de confirmer.' : `Faille ouverte. ${recalibrationIssue(state)}.`) : `Encore ${money(remaining)} pièces de retours du Plinko.`, 40, 450, 920, 40, '#e9e2f5');
    });
    const id = this.current(), page = ui.downloadPage ?? 0, issue = downloadIssue(state, id), owned = state.downloads.includes(id);
    this.terminal.draw(JSON.stringify([id, page, issue, owned, state.walletCents, digitalModule(state)]), '#0f1f1c', c => {
      text(c, 'MODULE NUMÉRIQUE', 40, 30, 54, '#8ff0bf');
      text(c, `TÉLÉCHARGEMENT ${page + 1}/${DOWNLOAD_IDS.length}`, 40, 100, 34, '#5fae89');
      text(c, DOWNLOADS[id].name.toUpperCase(), 40, 175, 64, '#d8ffe9');
      text(c, `${money(DOWNLOADS[id].price)} PIÈCES`, 40, 265, 44, '#f1d48c');
      wrap(c, DOWNLOADS[id].description, 40, 345, 920, 38, '#bfe8d3');
      text(c, owned ? 'INSTALLÉ ✓' : issue ? issue.toUpperCase() : 'PRÊT À TÉLÉCHARGER', 40, 600, 36, owned ? '#8ff0bf' : issue ? '#e7b29a' : '#f1d48c', 920);
      button(c, '◀', 30, 700, 220, 110, page > 0, '#7fc9a5');
      button(c, owned ? 'INSTALLÉ' : 'TÉLÉCHARGER', 270, 700, 460, 110, !owned && !issue, '#f1d48c');
      button(c, '▶', 750, 700, 220, 110, page < DOWNLOAD_IDS.length - 1, '#7fc9a5');
      text(c, 'Échap · retour machine', 500, 835, 30, '#5fae89', 900, 'center');
    });
  }
}
