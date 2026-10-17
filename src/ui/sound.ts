/** Sons synthétisés localement : aucun fichier audio ni chargement externe. */
export class Sound {
  private context?: AudioContext;
  unlock() { this.context ??= new AudioContext(); void this.context.resume(); }
  play(kind: 'launch' | 'result' | 'purchase', enabled: boolean) {
    if (!enabled || !this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator(); const gain = this.context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(kind === 'launch' ? 480 : kind === 'result' ? 740 : 620, now);
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'launch' ? 140 : 1000, now + 0.09);
    gain.gain.setValueAtTime(0.035, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    oscillator.connect(gain); gain.connect(this.context.destination); oscillator.start(); oscillator.stop(now + 0.15);
  }
}
