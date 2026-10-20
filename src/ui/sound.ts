/** Sons synthétisés localement : aucun fichier audio ni chargement externe. */
export class Sound {
  private context?: AudioContext;
  private lastContact = -Infinity;
  /** Créer le contexte audio seulement si le son est activé : sa création peut prendre près d’une seconde. */
  unlock(enabled: boolean) { if (!enabled) return; this.context ??= new AudioContext(); void this.context.resume(); }
  contact(variant: number, enabled: boolean) {
    if (!enabled || !this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    // Plafonner le mixage de 50 billes ; aucun rattrapage de sons après une pause.
    if (now - this.lastContact < 0.055) return;
    this.lastContact = now;
    const oscillator = this.context.createOscillator(), gain = this.context.createGain();
    const pitch = 1450 + Math.sin(variant * 7.3) * 260;
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(pitch, now); oscillator.frequency.exponentialRampToValueAtTime(pitch * 0.55, now + 0.035);
    gain.gain.setValueAtTime(0.012, now); gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
    oscillator.connect(gain); gain.connect(this.context.destination); oscillator.start(); oscillator.stop(now + 0.05);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  play(kind: 'launch' | 'result' | 'purchase', enabled: boolean) {
    if (!enabled || !this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator(); const gain = this.context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(kind === 'launch' ? 480 : kind === 'result' ? 660 + Math.random() * 100 : 620, now);
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'launch' ? 140 : 1000, now + 0.09);
    gain.gain.setValueAtTime(0.035, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    oscillator.connect(gain); gain.connect(this.context.destination); oscillator.start(); oscillator.stop(now + 0.15);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
}
