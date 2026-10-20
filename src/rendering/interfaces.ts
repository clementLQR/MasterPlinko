import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CONFIG } from '../config';
import { chargeCapacity, isBroken } from '../game/state';
import type { GameState } from '../game/state';
import type { View } from '../navigation/camera';

export type InterfaceState = {
  canWrite: boolean; canManageSave?: boolean; recovery?: boolean; confirmDelete?: boolean; importing?: boolean; autoEnabled: boolean; message: string;
  historyPage: number; downloadPage?: number; confirmRecalibration?: boolean; importWallet?: number; magnetsAvailable?: boolean; collectorAvailable?: boolean;
};
export type Register = (object: THREE.Object3D, action: string, label: () => string, views?: View[]) => void;
const money = (n: number) => (n / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const multi = (n: number) => `×${(n / 100).toLocaleString('fr-FR')}`;
const originLabel = (origin: GameState['pendingBalls'][number]['origin']) => origin === 'collector' ? 'COLLECTEUR' : origin === 'auto' ? 'GRATUIT' : 'MANUEL';
const paper = '#eee0bc', ink = '#3b493e', muted = '#615945';

/** Une page est une texture de maillage, avec des zones de clic dans le même repère 3D. */
export class Page {
  canvas = document.createElement('canvas');
  map: THREE.CanvasTexture;
  mesh: THREE.Mesh;
  ctx: CanvasRenderingContext2D;
  private key = '';
  constructor(parent: THREE.Object3D, public w: number, public h: number, x: number, y: number, z: number, private register: Register) {
    this.canvas.width = 1000; this.canvas.height = Math.round(1000 * h / w);
    this.ctx = this.canvas.getContext('2d')!;
    this.map = new THREE.CanvasTexture(this.canvas); this.map.colorSpace = THREE.SRGBColorSpace; this.map.anisotropy = 4;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: this.map, toneMapped: false }));
    this.mesh.position.set(x, y, z); parent.add(this.mesh);
  }
  zone(action: string, label: () => string, x: number, y: number, w: number, h: number, views: View[]) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w / 1000 * this.w, h / this.canvas.height * this.h), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    mesh.position.set((x + w / 2 - 500) / 1000 * this.w, (this.canvas.height / 2 - y - h / 2) / this.canvas.height * this.h, 0.012);
    this.mesh.add(mesh); this.register(mesh, action, label, views);
  }
  draw(key: string, background: string, paint: (ctx: CanvasRenderingContext2D) => void) {
    if (key === this.key) return; this.key = key;
    const c = this.ctx; c.clearRect(0, 0, 1000, this.canvas.height); c.fillStyle = background; c.fillRect(0, 0, 1000, this.canvas.height);
    c.textAlign = 'left'; c.textBaseline = 'top'; paint(c); this.map.needsUpdate = true;
  }
}
function text(c: CanvasRenderingContext2D, value: string, x: number, y: number, size = 32, color = ink, width = 910) {
  c.fillStyle = color; c.font = `${size >= 30 ? 'bold ' : ''}${size}px monospace`; c.fillText(value, x, y, width);
}
function wrap(c: CanvasRenderingContext2D, value: string, x: number, y: number, width: number, size = 28, color = ink) {
  c.font = `${size}px monospace`; let line = '', row = 0;
  for (const word of value.split(/\s+/)) { const next = `${line}${line ? ' ' : ''}${word}`; if (c.measureText(next).width > width && line) { text(c, line, x, y + row++ * size * 1.3, size, color, width); line = word; } else line = next; }
  if (line) text(c, line, x, y + row++ * size * 1.3, size, color, width);
  return row * size * 1.3;
}
function row(c: CanvasRenderingContext2D, label: string, y: number, enabled = true, height = 70) {
  c.fillStyle = enabled ? '#c8d0ac' : '#d5cdb5'; c.fillRect(38, y, 924, height);
  text(c, label, 65, y + 17, 30, enabled ? ink : muted, 865);
}
function box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, color: string) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 1, Math.min(0.1, d / 3)), new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
  mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
}

/** Les commandes, les pages et leurs indications restent attachées à des objets réels. */
export class DiegeticInterface {
  private state!: GameState;
  private ui: InterfaceState = { canWrite: false, autoEnabled: false, message: '', historyPage: 0 };
  private bet: Page;
  private result: Page;
  private status: Page;
  private heat: Page;
  private settings: Page;
  private ticket: Page;
  private ticketRoot = new THREE.Group();
  private segments: THREE.Mesh[] = [];
  private discharge: THREE.Mesh;
  private autoSwitch: THREE.Mesh;
  private autoLed: THREE.Mesh;
  constructor(scene: THREE.Scene, machine: THREE.Group, modules: Map<string, THREE.Group>, register: Register) {
    const controls: View[] = ['plinko', 'commandes'];
    this.bet = new Page(machine, 1.5, 0.75, -0.65, -5.73, 1.26, register);
    for (const [action, symbol, x] of [['bet-down', '−', -1.85], ['bet-up', '+', 0.57]] as const) {
      const button = box(machine, 0.52, 0.62, 0.22, x, -5.73, 1.17, '#a9bba1');
      const face = new Page(machine, 0.4, 0.45, x, -5.73, 1.29, register); face.draw('label', '#a9bba1', c => text(c, symbol, 160, 40, 650));
      face.mesh.userData.control = button;
      register(button, action, () => `Modifier la mise — ${symbol} 1 pièce${this.available() ? '' : ' · indisponible'}`, controls);
    }
    this.result = new Page(machine, 9.5, 0.42, 0, -6.8, 1.09, register);
    this.status = new Page(machine, 3.4, 0.83, -3.55, 6.02, 0.5, register);
    this.heat = new Page(machine, 3.1, 0.83, 3.4, 6.02, 0.5, register);
    for (let i = 0; i < 10; i++) this.segments.push(box(machine, 0.2, 0.35, 0.17, 5.33, -2.7 + i * 0.5, 0.68, '#585c48'));
    this.discharge = box(machine, 0.62, 0.62, 0.3, -4.96, -5.73, 1.18, '#be8b8e');
    const dischargeLabel = new Page(machine, 0.5, 0.36, -4.96, -5.73, 1.34, register); dischargeLabel.draw('label', '#be8b8e', c => text(c, `×${CONFIG.bonusFactor}`, 60, 40, 400));
    dischargeLabel.mesh.userData.control = this.discharge;
    register(this.discharge, 'discharge', () => this.state?.factoryRemainingMs ? 'Décharge indisponible pendant le service' : this.state?.bonusRemainingMs ? `Décharge ×${CONFIG.bonusFactor} — ${(this.state.bonusRemainingMs / 1000).toFixed(1)} s restantes` : this.state?.charges ? `Activer la Décharge — retours ×${CONFIG.bonusFactor} pendant 10 s${this.state.charges > 1 ? ' · 2 charges en réserve' : ''}` : `Surchauffe — ${this.state?.heatCount ?? 0}/100 billes`, controls);
    register(this.bet.mesh, 'commandes', () => 'Modifier la mise — rapprocher les commandes', ['plinko']);
    register(this.result.mesh, 'commandes', () => 'Lire le dernier résultat et les commandes', ['plinko']);
    register(this.heat.mesh, 'commandes', () => this.state?.bonusRemainingMs ? `Décharge ×${CONFIG.bonusFactor} — ${(this.state.bonusRemainingMs / 1000).toFixed(1)} s` : 'Surchauffe — une charge après 100 règlements', controls);
    const auto = modules.get('auto_launcher')!;
    this.autoSwitch = box(auto, 0.5, 0.35, 0.25, -0.1, -0.47, 0.87, '#a4b69b');
    this.autoLed = box(auto, 0.14, 0.14, 0.12, 0.43, -0.47, 0.86, '#567253');
    register(this.autoSwitch, 'auto', () => !this.available() || (this.state && isBroken(this.state)) ? 'Doigt mécanique indisponible — consulter l’état de la machine' : this.ui.autoEnabled ? 'Arrêter le Doigt mécanique' : 'Activer le Doigt mécanique — bille gratuite toutes les 2 s', ['plinko', 'commandes']);

    const device = new THREE.Group(); device.name = 'support:reglages'; device.position.set(-7.15, 0, 1.3); scene.add(device);
    box(device, 2.95, 4.5, 0.55, 0, 0, -0.28, '#8d9c8a');
    this.settings = new Page(device, 2.7, 4.2, 0, 0, 0.015, register);
    register(this.settings.mesh, 'reglages', () => 'Réglages et sauvegarde — boîtier mural', ['plinko', 'azur', 'commandes']);
    const settingsActions = [
      ['sound', 450, 'Activer ou couper le son'],
      ['motion', 570, 'Activer ou désactiver les mouvements réduits'],
      ['quality', 690, 'Changer la qualité du rendu'],
      ['export', 850, 'Exporter les données disponibles'],
      ['import', 970, 'Choisir un fichier de sauvegarde'],
      ['delete-save', 1090, 'Supprimer la sauvegarde — confirmation avant de recommencer'],
      ['retry', 1210, 'Réessayer après l’erreur de sauvegarde'],
      ['plinko', 1370, 'Fermer les réglages — revenir à la machine'],
      ['confirm-import', 550, 'Remplacer la partie par le fichier validé'],
      ['cancel-import', 670, 'Annuler l’import — conserver la partie actuelle'],
      ['confirm-delete', 550, 'Confirmer la suppression — nouvelle partie à 19 pièces'],
      ['cancel-delete', 670, 'Annuler la suppression — conserver la partie actuelle'],
    ] as const;
    for (const [action, y, label] of settingsActions) this.settings.zone(action, () => label, 38, y, 924, 88, ['reglages']);

    this.ticketRoot.name = 'support:ticket'; this.ticketRoot.position.set(6.2, -5.35, 2.1); machine.add(this.ticketRoot);
    // Papier déroulé depuis la fente : un pli horizontal relie le ticket à l’imprimante.
    box(this.ticketRoot, 2.1, 0.025, 1.05, 0, 1.65, -0.5, '#d4c5a1');
    box(this.ticketRoot, 2.17, 3.37, 0.035, 0, 0, -0.035, '#d4c5a1');
    this.ticket = new Page(this.ticketRoot, 2.1, 3.3, 0, 0, 0, register);
    this.ticket.zone('history-prev', () => 'Résultats plus récents', 35, 1430, 425, 92, ['historique']);
    this.ticket.zone('history-next', () => 'Résultats plus anciens', 530, 1430, 425, 92, ['historique']);
    this.ticket.zone('plinko', () => 'Ranger le ticket — revenir à la machine', 35, 1530, 920, 38, ['historique']);
  }
  private available() { return this.ui.canWrite && !this.state?.factoryRemainingMs; }
  update(s: GameState, ui: InterfaceState, view: View) {
    this.state = s; this.ui = ui;
    this.ticketRoot.visible = view === 'historique' && s.upgrades.includes('azur.accounting_tray');
    this.bet.draw(String(s.selectedBetCents), '#1a2f29', c => { text(c, 'MISE', 60, 35, 100, '#a7c5a4'); text(c, money(s.selectedBetCents), 60, 165, 225, '#e1edbb'); });
    const result = s.history[0];
    this.result.draw(JSON.stringify(result ?? null), '#213930', c => text(c, result ? `DERNIER : ${originLabel(result.origin)}${result.magnetFrom !== undefined ? ' AIMANT' : ''}  ${multi(result.multiplier)}${result.bonus > 1 ? ` · BONUS ×${result.bonus}` : ''}  RETOUR ${money(result.returnCents)}  NET ${result.netCents >= 0 ? '+' : ''}${money(result.netCents)}` : 'DERNIER RÉSULTAT : AUCUNE BILLE RÉGLÉE', 15, 7, 27, '#cbe1af', 970));
    const status = !ui.canWrite ? 'PARTIE SUSPENDUE' : s.factoryRemainingMs ? 'SERVICE À L’USINE' : isBroken(s) ? 'PANNE · VOIR AZUR' : 'MACHINE EN SERVICE';
    this.status.draw(status + ui.message + s.pendingBalls.length, '#233a31', c => { text(c, status, 30, 20, 66, '#d2dfad'); text(c, `${s.pendingBalls.length}/50 BILLES`, 30, 100, 49, '#d2dfad'); wrap(c, ui.message, 30, 157, 940, 30, '#d2dfad'); });
    const capacity = chargeCapacity(s), full = s.charges === capacity;
    const heat = s.bonusRemainingMs ? `×${CONFIG.bonusFactor} · ${(s.bonusRemainingMs / 1000).toFixed(1)} s` : s.charges ? `DÉCHARGE PRÊTE${capacity > 1 ? ` ${s.charges}/${capacity}` : ''}` : `SURCHAUFFE ${s.heatCount}/100`;
    // Avec le Condensateur, la jauge continue vers la charge suivante tant qu’une place reste libre.
    const detail = capacity > 1 && !full && (s.charges || s.bonusRemainingMs) ? `CHARGE SUIVANTE ${s.heatCount}/100` : `100 BILLES → ×${CONFIG.bonusFactor} / 10 s`;
    this.heat.draw(heat + detail, '#233a31', c => { text(c, heat, 35, 35, 80, '#d8d6ae'); text(c, detail, 35, 165, 47, '#bbc6a0'); });
    this.segments.forEach((segment, i) => { const material = segment.material as THREE.MeshStandardMaterial, lit = full || (s.bonusRemainingMs > 0 && capacity === 1) || s.heatCount >= (i + 1) * 10; material.color.set(lit ? '#dfba79' : '#585c48'); material.emissive.set(lit ? '#a16527' : '#000000'); material.emissiveIntensity = lit ? 0.65 : 0; });
    const dischargeMat = this.discharge.material as THREE.MeshStandardMaterial; dischargeMat.emissive.set(s.charges && !s.bonusRemainingMs ? '#ffc477' : '#000000'); dischargeMat.emissiveIntensity = s.charges && !s.bonusRemainingMs ? 0.8 : 0;
    this.autoSwitch.rotation.x = ui.autoEnabled ? -0.3 : 0.3;
    const autoMat = this.autoLed.material as THREE.MeshStandardMaterial; autoMat.color.set(ui.autoEnabled ? '#c9ebaf' : '#56634f'); autoMat.emissive.set(ui.autoEnabled ? '#8eb86b' : '#000000'); autoMat.emissiveIntensity = ui.autoEnabled ? 1 : 0;
    const prefs = s.preferences;
    this.settings.draw(JSON.stringify([prefs, ui.message, ui.importWallet, ui.canWrite, ui.canManageSave, ui.recovery, ui.confirmDelete, ui.importing, view === 'reglages']), '#243d35', c => {
      text(c, 'BOÎTIER DE PAPY', 45, 35, 60, '#d8e6b6');
      if (ui.confirmDelete) {
        text(c, 'SUPPRIMER LA SAUVEGARDE ?', 45, 160, 47, '#efc6a7');
        wrap(c, 'Effacer toutes les pièces, améliorations et résultats, puis recommencer à 19,00 pièces. Les réglages sont conservés. Exportez d’abord la partie pour pouvoir la retrouver.', 45, 260, 910, 35, '#d8e6b6');
        row(c, 'Oui, supprimer et recommencer', 550);
        row(c, 'Annuler · garder ma partie', 670);
        row(c, 'Exporter avant de supprimer', 850);
        if (ui.recovery) wrap(c, ui.message, 45, 1030, 910, 34, '#efc6a7');
      } else if (ui.importWallet !== undefined || ui.importing) {
        wrap(c, ui.importWallet === undefined ? 'Lecture du fichier… Vous pouvez annuler.' : `Fichier validé : ${money(ui.importWallet)} pièces. Remplacer la partie actuelle ? Exportez-la d’abord pour la conserver.`, 45, 160, 910, 36, '#d8e6b6');
        if (ui.importWallet !== undefined) row(c, 'Remplacer la partie', 550);
        row(c, 'Annuler · garder ma partie', 670);
        row(c, 'Exporter la partie actuelle', 850);
      } else {
        wrap(c, ui.message || (view === 'reglages' ? 'Sauvegarde automatique. Réglages ouverts : temps actif en pause.' : 'Réglages · sauvegarde automatique.'), 45, 140, 910, 34, '#d8e6b6');
        const rows = [
          ['sound', `Son : ${prefs.sound ? 'activé' : 'coupé'}`, 450],
          ['motion', `Mouvements réduits : ${prefs.reducedMotion ? 'oui' : 'non'}`, 570],
          ['quality', `Qualité : ${prefs.quality === 'low' ? 'légère' : 'normale'}`, 690],
          ['export', 'Exporter la partie', 850],
          ['import', 'Importer une partie…', 970],
          ['delete-save', 'Supprimer la sauvegarde…', 1090],
          ['plinko', 'Fermer · retour machine', 1370],
        ] as const;
        for (const [action, label, y] of rows) row(c, label, y, this.actionAvailable(action), 88);
        if (ui.recovery) row(c, 'Réessayer après l’erreur', 1210, this.actionAvailable('retry'), 88);
      }
      if (view === 'reglages') text(c, 'TEMPS ACTIF EN PAUSE', 45, 1500, 30, '#d8e6b6');
    });
    const historyPage = Math.min(ui.historyPage, Math.max(0, Math.ceil(s.history.length / 7) - 1));
    this.ticket.draw(JSON.stringify([s.history, historyPage]), paper, c => {
      text(c, 'BAC COMPTABLE', 40, 35, 62); text(c, `${s.history.length} résultats · page ${historyPage + 1}/${Math.max(1, Math.ceil(s.history.length / 7))}`, 40, 120, 33);
      if (!s.history.length) text(c, 'Le premier gain attend sa ligne.', 40, 230, 32);
      s.history.slice(historyPage * 7, historyPage * 7 + 7).forEach((r, i) => { const y = 215 + i * 169; text(c, `#${r.sequence} · ${originLabel(r.origin)} · ${multi(r.multiplier)} · bonus ×${r.bonus}${r.magnetFrom !== undefined ? ' · AIMANT' : ''}`, 40, y, 32); text(c, `Mise ${money(r.betCents)} · base ${money(r.baseCents)}`, 40, y + 48, 30); text(c, `Retour ${money(r.returnCents)} · net ${r.netCents >= 0 ? '+' : ''}${money(r.netCents)}`, 40, y + 92, 32); });
      row(c, '← Récents', 1430); text(c, 'Anciens →', 570, 1450, 32); text(c, 'Ranger le ticket · retour machine', 50, 1530, 30);
    });
  }
  setInteractionState(ui: InterfaceState) { this.ui = ui; }
  actionAvailable(action: string) {
    if (this.ui.confirmDelete) return ['export', 'confirm-delete', 'cancel-delete'].includes(action);
    if (this.ui.importWallet !== undefined || this.ui.importing) return ['export', 'cancel-import'].includes(action) || (action === 'confirm-import' && this.ui.importWallet !== undefined);
    if (['confirm-import', 'cancel-import', 'confirm-delete', 'cancel-delete'].includes(action)) return false;
    if (['sound', 'motion', 'quality'].includes(action)) return this.ui.canWrite;
    if (['export', 'import', 'delete-save'].includes(action)) return this.ui.canManageSave ?? this.ui.canWrite;
    if (action === 'retry') return !!this.ui.recovery && (this.ui.canManageSave ?? this.ui.canWrite);
    return true;
  }
}
