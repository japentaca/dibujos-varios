/**
 * AudioManager.ts — Sistema de audio retro
 * 
 * FASE 6: Sonidos retro
 * - Sintetizador simple estilo ZX Spectrum usando Web Audio API.
 * - Sonidos de disparo, bomba y explosiones.
 */

export class AudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  constructor() {
    // El contexto de audio se inicializa en init() al primer clic/interacción
  }

  /**
   * Debe llamarse tras una interacción del usuario (ej: apretar ENTER para iniciar)
   */
  public init(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = 0.3; // Volumen global
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Sonido agudo descendente para disparo de misil
   */
  public playShoot(): void {
    if (!this.ctx || !this.masterGain) return;
    
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, t); // A5
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.12); // Caída rápida
    
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.linearRampToValueAtTime(0.0, t + 0.12);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(t);
    osc.stop(t + 0.12);
  }

  /**
   * Sonido descendente pausado para bomba
   */
  public playBomb(): void {
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.3);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.linearRampToValueAtTime(0.0, t + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.3);
  }

  /**
   * Genera ruido blanco para explosiones retro
   */
  public playExplosion(size: 'SMALL' | 'LARGE'): void {
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const duration = size === 'LARGE' ? 0.6 : 0.2;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1; // Ruido blanco
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Filtro pasa bajos para hacer la explosión más "sorda" o contundente
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = size === 'LARGE' ? 800 : 1500;

    const gain = this.ctx.createGain();
    const initialVol = size === 'LARGE' ? 0.8 : 0.4;
    gain.gain.setValueAtTime(initialVol, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
  }

  /**
   * Sonido extra para "Game Over" o muerte del jugador
   */
  public playGameOver(): void {
    if (!this.ctx || !this.masterGain) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(50, t + 1.0);

    gain.gain.setValueAtTime(0.8, t);
    gain.gain.linearRampToValueAtTime(0.0, t + 1.0);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 1.0);
  }
}
