// Web Audio API Sound Synthesizer for GamiBar (No external files required)

class SoundSystem {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;

  constructor() {
    // Check initial mute state from localStorage or default to true (muted by default)
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("gb_sound_enabled");
      this.isMuted = saved !== "true";
    }
  }

  private initCtx() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== "undefined") {
      localStorage.setItem("gb_sound_enabled", (!this.isMuted).toString());
    }
    if (!this.isMuted) {
      this.initCtx();
      this.playXp(); // Brief pleasant chime when unmuted
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  // Play a soft high-frequency tick for card hover
  public playHover() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.04);
      
      gain.gain.setValueAtTime(0.015, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
    } catch {
      // Ignore audio context autoplay restrictions
    }
  }

  // Play a tactile click/snap sound for puzzle pieces
  public playSnap() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // High frequency click
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = "triangle";
      osc1.frequency.setValueAtTime(320, now);
      osc1.frequency.exponentialRampToValueAtTime(80, now + 0.08);

      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.08);

      // Wood snap tone
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(1400, now);
      osc2.frequency.exponentialRampToValueAtTime(400, now + 0.05);

      gain2.gain.setValueAtTime(0.04, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.05);
    } catch {
      // Ignore audio errors
    }
  }

  // Play XP gain / success chord
  public playXp() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio
      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0, now + idx * 0.05);
        gain.gain.linearRampToValueAtTime(0.03, now + idx * 0.05 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.3);
      });
    } catch {
      // Ignore
    }
  }

  // Play magnetic pull / button hover
  public playMagnetic() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.06);

      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {
      // Ignore
    }
  }
}

export const sound = new SoundSystem();
