// Simple synthesized sound effects using Web Audio API
// This avoids the need for external asset files while providing immediate feedback

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private enabled: boolean = true;
  private lastNavTime: number = 0;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window !== 'undefined' && !this.ctx) {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.masterGain.gain.value = 0.3; // Default volume
      } catch (e) {
        console.error('Web Audio API not supported', e);
      }
    }
  }

  public setVolume(val: number) {
    if (this.masterGain) {
      // val is 0-100
      this.masterGain.gain.value = (val / 100) * 0.5; // Max 0.5 to save ears
    }
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    if (this.ctx && this.ctx.state === 'suspended' && val) {
      this.ctx.resume();
    }
  }

  private createOscillator(type: OscillatorType, freq: number, duration: number, startTime: number = 0) {
    if (!this.ctx || !this.masterGain || !this.enabled) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration);
  }

  public playNav() {
    // Throttling to prevent audio buildup on rapid scrolling
    const now = Date.now();
    if (now - this.lastNavTime < 80) return;
    this.lastNavTime = now;

    // Crisp "tick" sound
    this.createOscillator('sine', 600, 0.03);
  }

  public playSelect() {
    // Positive "confirmation" sound
    this.createOscillator('sine', 600, 0.1);
    this.createOscillator('triangle', 800, 0.15, 0.05);
  }

  public playBack() {
    // Lower "cancel" sound
    this.createOscillator('sine', 300, 0.1);
    this.createOscillator('sine', 200, 0.15, 0.05);
  }

  public playStartup() {
    // Ethereal "startup" chord
    if (!this.ctx || !this.masterGain || !this.enabled) return;
    
    // Ensure context is running (browsers block autoplay)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    
    const playNote = (freq: number, delay: number, type: OscillatorType = 'sine') => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = type;
      osc.frequency.value = freq;
      
      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(0.2, now + delay + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 2.0);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start(now + delay);
      osc.stop(now + delay + 2.0);
    };

    // Major 9th chord sweep
    playNote(220.00, 0.0, 'sine'); // A3
    playNote(277.18, 0.1, 'sine'); // C#4
    playNote(329.63, 0.2, 'sine'); // E4
    playNote(415.30, 0.3, 'sine'); // G#4
    playNote(493.88, 0.4, 'triangle'); // B4
  }
}

export const soundManager = new SoundManager();
