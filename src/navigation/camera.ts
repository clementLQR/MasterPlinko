import { CONFIG } from '../config';

export type View = 'plinko' | 'azur';

/** État visuel indépendant de l’économie. La dernière commande remplace la précédente. */
export class Navigation {
  target: View = 'plinko';
  value = 0;
  private from = 0;
  private elapsed = CONFIG.cameraTransition as number;
  get moving() { return this.elapsed < CONFIG.cameraTransition; }
  get atMachine() { return this.target === 'plinko' && !this.moving; }
  go(view: View, reduced = false) {
    this.target = view;
    this.from = this.value;
    const destination = view === 'plinko' ? 0 : 1;
    this.elapsed = reduced || this.value === destination ? CONFIG.cameraTransition : 0;
    if (!this.moving) this.value = destination;
  }
  advance(ms: number, reduced = false) {
    if (!this.moving) return;
    this.elapsed = reduced ? CONFIG.cameraTransition : Math.min(CONFIG.cameraTransition, this.elapsed + ms);
    const t = this.elapsed / CONFIG.cameraTransition;
    const smooth = t * t * (3 - 2 * t);
    this.value = this.from + ((this.target === 'plinko' ? 0 : 1) - this.from) * smooth;
  }
}
