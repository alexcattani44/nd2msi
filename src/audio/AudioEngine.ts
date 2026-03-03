import * as Tone from "tone";
import type { SoundSource, Waveform } from "@/types/sound";

/**
 * Tone.js node graph per source:
 *   Synth ──┬──▶ Reverb ──┐
 *           └──▶ Delay  ──┤
 *                          ▼
 *                       Panner ──▶ Volume ──▶ master
 */
interface SourceNodes {
  synth: Tone.Synth;
  reverb: Tone.Reverb;
  delay: Tone.FeedbackDelay;
  panner: Tone.Panner;
  volume: Tone.Volume;
  playing: boolean;
}

export class AudioEngine {
  private master: Tone.Volume;
  private sources: Map<string, SourceNodes> = new Map();
  private started = false;

  constructor(masterVolumeDb: number) {
    this.master = new Tone.Volume(masterVolumeDb).toDestination();
  }

  /* ── lifecycle ── */

  /** Call once before first playback (required by browser autoplay policy). */
  async ensureContext(): Promise<void> {
    if (!this.started) {
      await Tone.start();
      this.started = true;
    }
  }

  dispose(): void {
    this.stopAll();
    for (const nodes of this.sources.values()) {
      this.disposeNodes(nodes);
    }
    this.sources.clear();
    this.master.dispose();
  }

  /* ── master ── */

  setMasterVolume(db: number): void {
    this.master.volume.value = db;
  }

  /* ── source management ── */

  addSource(source: SoundSource): void {
    if (this.sources.has(source.id)) return;

    const reverb = new Tone.Reverb({ decay: 2, wet: source.reverbMix });
    const delay = new Tone.FeedbackDelay({
      delayTime: source.delayTime,
      wet: source.delayMix,
    });
    const panner = new Tone.Panner(source.pan);
    const volume = new Tone.Volume(source.volume);

    reverb.connect(panner);
    delay.connect(panner);
    panner.connect(volume);
    volume.connect(this.master);

    const synth = new Tone.Synth({
      oscillator: { type: source.waveform },
      envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 1 },
    });
    synth.frequency.value = source.frequency;
    synth.connect(reverb);
    synth.connect(delay);

    this.sources.set(source.id, {
      synth,
      reverb,
      delay,
      panner,
      volume,
      playing: false,
    });
  }

  removeSource(id: string): void {
    const nodes = this.sources.get(id);
    if (!nodes) return;
    if (nodes.playing) {
      nodes.synth.triggerRelease();
    }
    this.disposeNodes(nodes);
    this.sources.delete(id);
  }

  updateSource(id: string, updates: Partial<SoundSource>): void {
    const nodes = this.sources.get(id);
    if (!nodes) return;

    if (updates.waveform !== undefined) {
      nodes.synth.oscillator.type = updates.waveform as Waveform;
    }
    if (updates.frequency !== undefined) {
      nodes.synth.frequency.value = updates.frequency;
    }
    if (updates.volume !== undefined) {
      nodes.volume.volume.value = updates.volume;
    }
    if (updates.pan !== undefined) {
      nodes.panner.pan.value = updates.pan;
    }
    if (updates.reverbMix !== undefined) {
      nodes.reverb.wet.value = updates.reverbMix;
    }
    if (updates.delayMix !== undefined) {
      nodes.delay.wet.value = updates.delayMix;
    }
    if (updates.delayTime !== undefined) {
      nodes.delay.delayTime.value = updates.delayTime;
    }
  }

  /* ── transport ── */

  async playAll(sources: SoundSource[]): Promise<void> {
    await this.ensureContext();

    for (const source of sources) {
      // Ensure the node graph exists (handles sources added while stopped)
      if (!this.sources.has(source.id)) {
        this.addSource(source);
      }
      const nodes = this.sources.get(source.id)!;
      if (!nodes.playing) {
        nodes.synth.triggerAttack(source.frequency);
        nodes.playing = true;
      }
    }
  }

  /** Start a single source (used when adding a source while already playing). */
  async startSource(source: SoundSource): Promise<void> {
    await this.ensureContext();
    if (!this.sources.has(source.id)) {
      this.addSource(source);
    }
    const nodes = this.sources.get(source.id)!;
    if (!nodes.playing) {
      nodes.synth.triggerAttack(source.frequency);
      nodes.playing = true;
    }
  }

  stopAll(): void {
    for (const nodes of this.sources.values()) {
      if (nodes.playing) {
        nodes.synth.triggerRelease();
        nodes.playing = false;
      }
    }
  }

  /* ── internal ── */

  private disposeNodes(nodes: SourceNodes): void {
    try { nodes.synth.dispose(); } catch { /* already disposed */ }
    try { nodes.reverb.dispose(); } catch { /* already disposed */ }
    try { nodes.delay.dispose(); } catch { /* already disposed */ }
    try { nodes.panner.dispose(); } catch { /* already disposed */ }
    try { nodes.volume.dispose(); } catch { /* already disposed */ }
  }
}
