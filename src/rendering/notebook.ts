import * as THREE from 'three';
import type { WorkshopTools } from './shopWorkshop';
import { UPGRADES } from '../config';
import type { UpgradeId } from '../config';

type Plan = { title: string; status: string; effect: string; notes: string[]; aside: string };
const PLANS: Plan[] = [
  { title: 'Réparation initiale', status: 'PROCÉDURE CONNUE', effect: 'Remettre la machine en service après sa première panne.', notes: ['Attendre que toutes les billes soient arrivées.', 'Réparer la machine et ouvrir l’accès à l’atelier.', 'Vérifier les branchements avant de refermer.'], aside: 'Cette fois, ça devrait tenir.' },
  { title: 'Doigt mécanique', status: 'MODULE CONNU', effect: 'Une bille gratuite de base 1 toutes les deux secondes.', notes: ['La mise choisie reste réservée aux lancements manuels.', 'Interrupteur physique et voyant sur le module.', 'Réservoir plein ? Attendre une place libre.'], aside: 'Le doigt ne réclame pas de pause.' },
  { title: 'Bac comptable', status: 'MODULE CONNU', effect: 'Consulter les cent derniers résultats de la machine.', notes: ['Imprimer origine, mise, retour et résultat net.', 'Conserver les résultats dès le début de la partie.', 'Le ticket se consulte depuis son propre cadrage.'], aside: 'Les chiffres ont été recomptés. Une fois.' },
  { title: 'Aimants', status: 'PLAN DISPONIBLE', effect: 'Attirer une bille automatique vers une case voisine plus avantageuse.', notes: ['Recharge : 5 secondes, puis prochaine bille automatique.', 'Nécessite le Doigt mécanique installé.', 'Une seule case ; manuelles et ×40 inchangés.'], aside: 'La chance apprécie les petits coups de main.' },
  { title: 'Collecteur de ratés', status: 'PLAN DISPONIBLE', effect: 'Dix sorties sous ×1 offrent une bille gratuite de base 1.', notes: ['Les manuelles et celles du Doigt remplissent le réservoir.', 'Les billes offertes ne le rechargent pas.', 'Plateau plein : conserver une récompense en attente.'], aside: 'Un échec correctement rangé peut resservir.' },
  { title: 'Condensateur de poche', status: 'À L’ÉTUDE', effect: 'Conserver une deuxième charge de Décharge pour choisir son moment.', notes: ['Deux voyants pour deux charges stockées.', 'Règles de recharge et d’activation à préciser.', 'Le facteur de la Décharge reste ×2.'], aside: 'Poche recommandée : très grande.' },
  { title: 'Boîte de vitesses', status: 'À L’ÉTUDE', effect: 'Choisir entre rythme régulier et petites rafales du Doigt.', notes: ['Conserver la même production moyenne.', 'Prévoir un levier à deux positions.', 'Taille et intervalle des rafales à déterminer.'], aside: 'Même quantité de billes. Plus de caractère.' },
  { title: 'Module numérique', status: 'À L’ÉTUDE', effect: 'Accéder aux améliorations téléchargeables à installer sur le Plinko.', notes: ['Petit écran à pixels et boutons physiques.', 'Catalogue des améliorations logicielles à concevoir.', 'Prix, prérequis et effets restent à déterminer.'], aside: 'Installation terminée. Normalement, oui.' },
  { title: 'Duplicateur', status: 'RECHERCHE EXPÉRIMENTALE', effect: 'Étudier la duplication de certains gains et l’apparition de résidus.', notes: ['Deux bobines sous une cloche de protection.', 'Fréquence et fonctionnement à définir.', 'Le prototype de l’établi reste en observation.'], aside: 'Ne pas dupliquer le mode d’emploi.' },
  { title: 'Compteur d’instabilité', status: 'À L’ÉTUDE', effect: 'Rendre lisible la préparation du futur recalibrage.', notes: ['Relier la mesure aux anomalies de la machine.', 'Seuils et progression restent à concevoir.', 'Ne pas confondre agitation et précision.'], aside: 'Une aiguille calme n’est pas une garantie.' },
  { title: 'Billes spéciales', status: 'FAMILLE DE BILLES · À L’ÉTUDE', effect: 'Ressort de deuxième chance : un second passage possible dans le plateau.', notes: ['Le premier passage ne rapporte rien.', 'Seul le résultat final est payé.', 'Obtention et déclenchement restent à définir.'], aside: 'Une bille spéciale, un résultat final.' },
  { title: 'Autres réglages', status: 'PISTES À CONCEVOIR', effect: 'Graisse ambitieuse, Limiteur délimité et Ventilation financière.', notes: ['Cadence, mise maximale, durée de Décharge.', 'Rendement et rareté : pistes à explorer.', 'Effets, coûts et limites à définir.'], aside: 'La liste des idées dépasse celle des vis.' },
];

/** Le carnet présente les plans ; les transactions restent dans le moteur. */
export class PlanNotebook {
  readonly root: THREE.Group;
  private left: THREE.Mesh;
  private right: THREE.Mesh;
  private leaf = new THREE.Group();
  private front: THREE.Mesh;
  private back: THREE.Mesh;
  private previous: THREE.Group;
  private next: THREE.Group;
  private order: THREE.Group;
  private orderFace: THREE.Mesh;
  private orderKey = '';
  private textures = new Map<number, [THREE.CanvasTexture, THREE.CanvasTexture]>();
  private index = 0;
  private transition?: { target: number; direction: number; elapsed: number };
  readonly duration = 560;
  get page() { return this.index + 1; }
  get count() { return PLANS.length; }
  get title() { return PLANS[this.index].title; }
  get description() { const plan = PLANS[this.index]; return `${plan.title}. ${plan.status}. ${plan.effect} ${plan.notes.join(' ')}`; }
  get turning() { return !!this.transition; }
  get planId(): UpgradeId | undefined { return (Object.keys(UPGRADES) as UpgradeId[])[this.index]; }

  constructor(b: WorkshopTools, desk: THREE.Group) {
    const book = this.root = b.group(0, 1.015, 0, desk); book.name = 'azur:upgrade-plans';
    book.rotation.x = -Math.PI / 2; book.userData.dynamic = true;
    const cover = b.material('#486056', 0.9), paper = b.material('#cfc6ac', 1), brass = b.material('#a88b5d', 0.6, 0.4);
    for (const side of [-1, 1]) {
      b.box(book, 0.75, 1.0, 0.025, side * 0.377, 0, -0.014, cover, 0.015);
      b.box(book, 0.703, 0.936, 0.026, side * 0.363, 0, 0.008, paper, 0.004);
      for (let i = 0; i < 4; i++) b.box(book, 0.704, 0.934, 0.0015, side * 0.363, 0, -0.002 + i * 0.006, b.material(i % 2 ? '#d4cdb6' : '#bdb59f', 1), 0.001);
      b.box(book, 0.7, 0.008, 0.003, side * 0.377, 0.476, 0.001, brass);
    }
    b.cylinder(book, 0.022, 0.985, 0, 0, -0.005, cover);
    for (let i = 0; i < 8; i++) b.ring(book, 0.024, 0.003, 0, -0.39 + i * 0.11, 0.007, brass).rotation.x = Math.PI / 2;
    const pageMaterial = () => new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0 });
    this.left = new THREE.Mesh(new THREE.PlaneGeometry(0.69, 0.92), pageMaterial()); this.left.position.set(-0.363, 0, 0.024);
    this.right = new THREE.Mesh(new THREE.PlaneGeometry(0.69, 0.92), pageMaterial()); this.right.position.set(0.363, 0, 0.024);
    for (const mesh of [this.left, this.right]) { mesh.receiveShadow = true; mesh.userData.dynamic = true; book.add(mesh); }
    this.leaf.name = 'azur:turning-page'; this.leaf.position.z = 0.03; this.leaf.userData.dynamic = true; this.leaf.visible = false; book.add(this.leaf);
    const frontGeometry = new THREE.PlaneGeometry(0.708, 0.92, 24, 8); frontGeometry.translate(0.354, 0, 0);
    const backGeometry = frontGeometry.clone(), uv = backGeometry.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
    const backMaterial = pageMaterial(); backMaterial.side = THREE.BackSide;
    this.front = new THREE.Mesh(frontGeometry, pageMaterial()); this.back = new THREE.Mesh(backGeometry, backMaterial);
    this.front.castShadow = this.front.receiveShadow = this.back.castShadow = this.back.receiveShadow = true; this.leaf.add(this.front, this.back);
    this.previous = this.corner(b, -1); this.next = this.corner(b, 1);
    const close = b.group(0.733, 0.29, 0.019, book); close.name = 'azur:notebook-close';
    b.box(close, 0.12, 0.22, 0.007, 0, 0, 0, b.material('#b27f66'), 0.008);
    b.art(close, 0.09, 0.13, 0, 0, 0.006, c => {
      c.fillStyle = '#c8a987'; c.fillRect(0, 0, 1024, c.canvas.height); c.fillStyle = '#3e4d43'; c.font = 'bold 760px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('↶', 512, c.canvas.height / 2);
    });
    this.register(b, close, 'plans-close', 'Revenir à l’atelier');
    this.order = b.group(-0.363, -0.30, 0.032, book); this.order.name = 'azur:plan-order';
    b.box(this.order, 0.57, 0.17, 0.008, 0, 0, 0, b.material('#c7aa85'), 0.005);
    this.orderFace = b.art(this.order, 0.55, 0.15, 0, 0, 0.005, () => {});
    this.register(b, this.order, 'plans-buy', 'Acheter le plan');
    this.show(); b.batch(book);
  }
  setOrder(label: string, enabled: boolean) {
    this.order.visible = !!this.planId && !this.turning;
    if (!this.planId) return;
    this.order.userData.label = label;
    const key = `${this.index}/${label}/${enabled}`; if (key === this.orderKey) return;
    this.orderKey = key;
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 280;
    const c = canvas.getContext('2d')!; c.fillStyle = enabled ? '#c1cba4' : '#d3c5a5'; c.fillRect(0, 0, 1024, 280);
    c.strokeStyle = '#6f7961'; c.lineWidth = 5; c.strokeRect(12, 12, 1000, 256);
    c.fillStyle = '#354c43'; c.textAlign = 'center'; c.font = 'bold 64px monospace';
    c.fillText(`${(UPGRADES[this.planId!].price / 100).toFixed(2).replace('.', ',')} pièces`, 512, 101, 960);
    c.font = '50px monospace'; c.fillText(enabled ? 'Acheter le plan' : label, 512, 209, 960);
    const material = this.orderFace.material as THREE.MeshStandardMaterial; material.map?.dispose();
    material.map = new THREE.CanvasTexture(canvas); material.map.colorSpace = THREE.SRGBColorSpace; material.map.anisotropy = 8; material.needsUpdate = true;
  }
  private register(b: WorkshopTools, object: THREE.Group, action: string, label: string) {
    this.root.updateWorldMatrix(true, true);
    const p = object.getWorldPosition(new THREE.Vector3()); p.y += 0.09;
    b.register(object, action, label, p.toArray(), ['plans']);
  }
  private corner(b: WorkshopTools, side: number) {
    const g = b.group(side * 0.629, -0.368, 0.029, this.root); g.name = side < 0 ? 'azur:notebook-previous' : 'azur:notebook-next';
    const geometry = new THREE.BufferGeometry();
    const points = side < 0 ? [-0.09, -0.08, 0, 0.08, -0.08, 0, -0.09, 0.09, 0.006] : [-0.08, -0.08, 0, 0.09, -0.08, 0, 0.09, 0.09, 0.006];
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); geometry.computeVertexNormals();
    g.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#e6dcc2', roughness: 1, side: THREE.DoubleSide })));
    const ink = b.material('#65796d', 1);
    b.rod(g, [-0.04, -0.03, 0.01], [0.04, -0.03, 0.01], 0.003, ink);
    for (const y of [-0.005, -0.055]) b.rod(g, [side * 0.04, -0.03, 0.01], [side * 0.01, y, 0.01], 0.003, ink);
    // Surface de sélection sur le coin physique de la page, sans bouton à l'écran.
    const hit = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.18), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })); hit.position.z = 0.012; g.add(hit);
    this.register(b, g, side < 0 ? 'plans-previous' : 'plans-next', side < 0 ? 'Page précédente' : 'Page suivante');
    return g;
  }
  canTurn(direction: number) { return !this.turning && this.index + direction >= 0 && this.index + direction < this.count; }
  turn(direction: number, reduced: boolean) {
    if (!this.canTurn(direction)) return false;
    const target = this.index + direction, current = this.maps(this.index), following = this.maps(target);
    this.transition = { target, direction, elapsed: 0 };
    this.bend(0);
    this.bind(this.front, direction > 0 ? current[1] : following[1]); this.bind(this.back, direction > 0 ? following[0] : current[0]);
    if (direction > 0) this.bind(this.right, following[1]); else this.bind(this.left, following[0]);
    this.leaf.rotation.y = direction > 0 ? 0 : -Math.PI; this.leaf.visible = true; this.previous.visible = this.next.visible = this.order.visible = false;
    if (reduced) this.finish();
    return true;
  }
  advance(ms: number, reduced: boolean) {
    const t = this.transition; if (!t) return false;
    t.elapsed += Math.max(0, ms);
    if (reduced || t.elapsed >= this.duration) { this.finish(); return true; }
    const p = t.elapsed / this.duration, eased = p * p * (3 - 2 * p);
    this.leaf.rotation.y = -Math.PI * (t.direction > 0 ? eased : 1 - eased);
    this.bend(p);
    return false;
  }
  private bend(progress: number) {
    for (const mesh of [this.front, this.back]) {
      const position = mesh.geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) position.setZ(i, Math.sin(position.getX(i) / 0.708 * Math.PI) * Math.sin(progress * Math.PI) * 0.045);
      position.needsUpdate = true; mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingSphere();
    }
  }
  finish() {
    if (!this.transition) return;
    this.index = this.transition.target; this.transition = undefined; this.show();
  }
  reset() { this.transition = undefined; this.index = 0; this.show(); }
  private show() {
    const pages = this.maps(this.index); this.bind(this.left, pages[0]); this.bind(this.right, pages[1]);
    this.leaf.visible = false; this.previous.visible = this.index > 0; this.next.visible = this.index < this.count - 1;
    this.order.visible = !!this.planId;
    // Trois doubles pages au maximum en mémoire, y compris celles utilisées par le feuilletage.
    for (const [index, maps] of this.textures) if (Math.abs(index - this.index) > 1) { maps.forEach(texture => texture.dispose()); this.textures.delete(index); }
  }
  private bind(mesh: THREE.Mesh, map: THREE.CanvasTexture) { const material = mesh.material as THREE.MeshStandardMaterial; material.map = map; material.needsUpdate = true; }
  private maps(index: number) {
    if (!this.textures.has(index)) {
      const draw = (right: boolean) => {
        const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 1024;
        drawPage(canvas.getContext('2d')!, PLANS[index], index, right);
        const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8; return map;
      };
      this.textures.set(index, [draw(false), draw(true)]);
    }
    return this.textures.get(index)!;
  }
}

function paragraph(c: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number) {
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && c.measureText(next).width > width) { c.fillText(line, x, y); y += lineHeight; line = word; } else line = next;
  }
  if (line) c.fillText(line, x, y);
  return y + lineHeight;
}
function drawPage(c: CanvasRenderingContext2D, plan: Plan, index: number, right: boolean) {
  const w = c.canvas.width, h = c.canvas.height;
  c.fillStyle = '#e1d6b8'; c.fillRect(0, 0, w, h);
  const shade = c.createLinearGradient(0, 0, w, 0); shade.addColorStop(right ? 0 : 1, '#76695355'); shade.addColorStop(0.12, '#a28b5f08'); shade.addColorStop(0.88, '#f4e9ca00'); shade.addColorStop(right ? 1 : 0, '#8f7a4a18'); c.fillStyle = shade; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#708a8a20'; c.lineWidth = 1;
  for (let x = 34; x < w; x += 28) { c.beginPath(); c.moveTo(x, 56); c.lineTo(x, h - 64); c.stroke(); }
  for (let y = 64; y < h - 60; y += 28) { c.beginPath(); c.moveTo(35, y); c.lineTo(w - 35, y); c.stroke(); }
  c.strokeStyle = '#9e705b55'; c.lineWidth = 2; c.beginPath(); c.moveTo(55, 64); c.lineTo(55, h - 65); c.stroke();
  c.fillStyle = '#5b706b'; c.font = 'bold 21px monospace'; c.fillText('CARNET D’AZUR / RECHERCHES', 77, 59);
  c.fillStyle = '#354c50'; c.font = 'bold 43px Georgia';
  const titleEnd = paragraph(c, right ? 'Notes d’atelier' : plan.title, 77, 125, 620, 48);
  c.fillStyle = '#8e6048'; c.font = 'bold 22px monospace'; c.fillText(plan.status, 77, titleEnd + 8, 620);
  if (!right) {
    c.save(); c.translate(72, Math.max(250, titleEnd + 70)); c.scale(1.45, 2.1); drawDiagram(c, index); c.restore();
    c.fillStyle = '#486060'; c.font = 'italic 29px Georgia'; paragraph(c, 'Schéma de principe · cotes à vérifier', 79, 763, 590, 38);
    if (index >= Object.keys(UPGRADES).length) { c.font = '30px Georgia'; c.fillStyle = '#6b6050'; paragraph(c, 'Fixations, câblage et petites surprises : voir les notes en regard.', 79, 825, 595, 38); }
  } else {
    c.font = 'bold 28px monospace'; c.fillStyle = '#3a5958'; c.fillText('EFFET PRÉVU', 77, 241);
    c.fillStyle = '#394948'; c.font = '36px Georgia'; let y = paragraph(c, plan.effect, 77, 288, 610, 44) + 35;
    c.strokeStyle = '#8c9c8d'; c.beginPath(); c.moveTo(77, y - 16); c.lineTo(680, y - 16); c.stroke();
    c.font = '34px Georgia';
    for (const note of plan.notes) { c.fillStyle = '#6b7161'; c.strokeRect(80, y - 20, 14, 14); c.fillStyle = '#43514b'; y = paragraph(c, note, 111, y, 568, 42) + 24; }
    c.fillStyle = '#8a5a46'; c.font = 'italic 30px Georgia'; paragraph(c, `«\u00a0${plan.aside}\u00a0»`, 80, Math.max(820, y + 15), 600, 37);
  }
  c.strokeStyle = '#a39376'; c.beginPath(); c.moveTo(77, 941); c.lineTo(690, 941); c.stroke();
  c.fillStyle = '#6a7062'; c.font = '22px monospace'; c.textAlign = 'center'; c.fillText(`${index * 2 + (right ? 2 : 1)} / ${PLANS.length * 2}`, w / 2, 977); c.textAlign = 'left';
}
function drawDiagram(c: CanvasRenderingContext2D, i: number) {
  c.strokeStyle = '#3b656c'; c.lineWidth = 2.4; c.fillStyle = '#65745e';
  const line = (points: number[][]) => { c.beginPath(); points.forEach(([x, y], n) => n ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); };
  const circle = (x: number, y: number, r: number) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); };
  if (i === 0) {
    c.strokeRect(105, 20, 190, 190); c.strokeRect(123, 50, 154, 105);
    for (let y = 65; y < 150; y += 20) for (let x = 139; x < 270; x += 23) circle(x + y % 2 * 8, y, 2);
    line([[125, 184], [191, 153], [275, 184]]); circle(200, 33, 7); line([[295, 85], [350, 85], [350, 144]]); c.font = '16px monospace'; c.fillText('E-07', 317, 169);
  } else if (i === 1) {
    c.strokeRect(35, 43, 52, 126); for (let j = 0; j < 4; j++) circle(61, 63 + j * 28, 9);
    line([[87, 161], [145, 161], [182, 69], [270, 104], [294, 160]]); circle(182, 69, 13); circle(270, 104, 10); line([[280, 160], [294, 172], [311, 160]]); c.strokeRect(128, 185, 194, 15);
  } else if (i === 2) {
    c.strokeRect(48, 100, 262, 94); circle(85, 154, 16); circle(277, 154, 16); c.strokeRect(118, 43, 120, 151);
    for (let j = 0; j < 6; j++) line([[136, 62 + j * 18], [221, 62 + j * 18]]); line([[310, 143], [363, 143], [363, 83]]);
  } else if (i === 3) {
    for (const x of [57, 259]) { line([[x, 74], [x, 169], [x + 65, 169], [x + 65, 74]]); c.strokeRect(x - 8, 56, 81, 20); }
    circle(189, 69, 12); line([[181, 93], [149, 135], [219, 135], [252, 101]]); line([[232, 101], [252, 101], [249, 122]]); c.font = '20px monospace'; c.fillText('×0,3', 158, 191); c.fillText('×0,5', 278, 136);
  } else if (i === 4) {
    line([[29, 58], [112, 58], [91, 99], [91, 185], [55, 185], [55, 99], [29, 58]]); c.strokeRect(153, 53, 83, 140);
    for (let j = 0; j < 5; j++) line([[154, 175 - j * 22], [201, 175 - j * 22]]);
    line([[91, 164], [130, 164], [130, 79], [153, 79]]); line([[236, 166], [291, 166], [291, 67], [334, 67]]); circle(355, 67, 16);
  } else if (i === 5) {
    for (const x of [67, 229]) { line([[x, 48], [x, 190], [x + 71, 190], [x + 71, 48]]); circle(x + 35, 117, 18); line([[x + 8, 66], [x + 62, 66]]); }
    line([[138, 150], [180, 150], [180, 84], [229, 84]]); line([[300, 117], [356, 117], [356, 190]]);
  } else if (i === 6) {
    for (const [x, r] of [[104, 44], [184, 33], [242, 22]]) {
      circle(x, 122, r); circle(x, 122, 10); for (let j = 0; j < 12; j++) { const a = j * Math.PI / 6; line([[x + Math.cos(a) * r, 122 + Math.sin(a) * r], [x + Math.cos(a) * (r + 8), 122 + Math.sin(a) * (r + 8)]]); }
    }
    line([[302, 183], [302, 105], [344, 62]]); circle(348, 58, 11);
  } else if (i === 7) {
    c.strokeRect(74, 32, 241, 173); c.strokeRect(94, 52, 199, 100); for (let j = 0; j < 4; j++) circle(115 + j * 54, 179, 9);
    line([[160, 85], [160, 102], [145, 102], [192, 135], [239, 102], [224, 102], [224, 85]]); line([[315, 130], [361, 130], [361, 199]]);
  } else if (i === 8) {
    c.strokeRect(54, 190, 286, 22); c.beginPath(); c.ellipse(197, 190, 143, 18, 0, Math.PI, Math.PI * 2); c.stroke();
    c.beginPath(); c.ellipse(197, 100, 143, 80, 0, Math.PI, Math.PI * 2); c.stroke(); line([[54, 100], [54, 190]]); line([[340, 100], [340, 190]]);
    for (const x of [146, 248]) { c.strokeRect(x - 10, 89, 20, 91); for (let j = 0; j < 6; j++) line([[x - 26, 97 + j * 14], [x + 26, 97 + j * 14]]); }
  } else if (i === 9) {
    c.strokeRect(57, 65, 284, 133); c.beginPath(); c.arc(196, 139, 84, Math.PI, 0); c.stroke(); line([[196, 139], [244, 88]]); circle(196, 139, 8);
    for (let j = 0; j < 9; j++) { const a = Math.PI + j * Math.PI / 8; line([[196 + Math.cos(a) * 69, 139 + Math.sin(a) * 69], [196 + Math.cos(a) * 79, 139 + Math.sin(a) * 79]]); }
  } else if (i === 10) {
    circle(115, 77, 30); c.strokeRect(91, 132, 91, 69); line([[116, 132], [107, 143], [137, 152], [107, 161], [137, 170], [116, 183]]);
    line([[182, 184], [304, 184], [344, 135], [344, 53], [204, 53], [182, 77]]); line([[185, 60], [182, 77], [202, 79]]); circle(301, 104, 15);
  } else {
    c.strokeRect(51, 41, 292, 170);
    for (const x of [109, 197, 285]) { circle(x, 111, 25); line([[x, 111], [x + 16, 95]]); c.strokeRect(x - 24, 161, 48, 17); }
  }
  c.strokeStyle = '#aa7058'; c.lineWidth = 1.5; line([[42, 232], [355, 232]]); line([[42, 224], [42, 240]]); line([[355, 224], [355, 240]]);
}
