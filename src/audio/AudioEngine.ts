import * as Tone from "tone";
import type {
  SoundSource,
  Waveform,
  Modulator,
  Route,
  RoutableParam,
  LfoShape,
} from "@/types/sound";

/**
 * Tone.js node graph per source:
 *
 * Oscillator mode:
 *   Synth ──▶ Filter? ──┬──▶ Reverb ──┐
 *                        └──▶ Delay  ──┤
 *                                       ▼
 *                                    Panner ──▶ Volume ──▶ master
 *
 * Sampler mode:
 *   Player ──▶ PitchShift ──▶ Filter? ──┬──▶ Reverb ──┐
 *                                        └──▶ Delay  ──┤
 *                                                       ▼
 *                                                    Panner ──▶ Volume ──▶ master
 */

interface OscillatorNodes {
  type: "oscillator";
  synth: Tone.Synth;
  filter: Tone.Filter;
  reverb: Tone.Reverb;
  delay: Tone.FeedbackDelay;
  panner: Tone.Panner;
  volume: Tone.Volume;
  playing: boolean;
}

interface SamplerNodes {
  type: "sampler";
  player: Tone.Player;
  pitchShift: Tone.PitchShift;
  filter: Tone.Filter;
  reverb: Tone.Reverb;
  delay: Tone.FeedbackDelay;
  panner: Tone.Panner;
  volume: Tone.Volume;
  playing: boolean;
  loaded: boolean;
}

type SourceNodes = OscillatorNodes | SamplerNodes;

interface BaselineValues {
  frequency: number;
  volume: number;
  pan: number;
  reverbMix: number;
  delayMix: number;
  playbackRate: number;
  pitchShift: number;
  filterFrequency: number;
}

interface ActiveRoute {
  disconnect(): void;
}

interface EnvelopeState {
  value: number;
  phase: "idle" | "attack" | "decay" | "sustain" | "release";
  phaseStart: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  rafId: number | null;
}

export type MidiNoteCallback = (channel: number, note: number, velocity: number, isNoteOn: boolean) => void;

/** Convert a MIDI note number to frequency in Hz */
export function midiNoteToFrequency(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/** Note names for display */
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export function midiNoteToName(note: number): string {
  const octave = Math.floor(note / 12) - 1;
  return `${NOTE_NAMES[note % 12]}${octave}`;
}

/** Keyboard key to MIDI note mapping (computer keyboard as piano) */
const KEYBOARD_NOTE_MAP: Record<string, number> = {
  // Lower row: C3-B3
  "z": 48, "s": 49, "x": 50, "d": 51, "c": 52, "v": 53, "g": 54,
  "b": 55, "h": 56, "n": 57, "j": 58, "m": 59,
  // Upper row: C4-E5
  "q": 60, "2": 61, "w": 62, "3": 63, "e": 64, "r": 65, "5": 66,
  "t": 67, "6": 68, "y": 69, "7": 70, "u": 71, "i": 72, "9": 73,
  "o": 74, "0": 75, "p": 76,
};

export { KEYBOARD_NOTE_MAP };

export class AudioEngine {
  private master: Tone.Volume;
  private sources: Map<string, SourceNodes> = new Map();
  private baselines: Map<string, BaselineValues> = new Map();
  private lfos: Map<string, Tone.LFO> = new Map();
  private randomIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private activeRoutes: Map<string, ActiveRoute> = new Map();
  private envelopes: Map<string, EnvelopeState> = new Map();
  private midiAccess: MIDIAccess | null = null;
  private midiListeners: Map<string, MidiNoteCallback> = new Map();
  private midiInputHandler: ((e: Event) => void) | null = null;
  private started = false;

  constructor(masterVolumeDb: number) {
    this.master = new Tone.Volume(masterVolumeDb).toDestination();
  }

  /* ── lifecycle ── */

  async ensureContext(): Promise<void> {
    if (!this.started) {
      await Tone.start();
      this.started = true;
    }
  }

  dispose(): void {
    this.clearAllRoutes();
    this.stopAll();
    for (const nodes of this.sources.values()) {
      this.disposeSourceNodes(nodes);
    }
    this.sources.clear();
    this.baselines.clear();
    for (const lfo of this.lfos.values()) {
      try { lfo.dispose(); } catch { /* ok */ }
    }
    this.lfos.clear();
    for (const id of this.randomIntervals.keys()) {
      clearInterval(this.randomIntervals.get(id)!);
    }
    this.randomIntervals.clear();
    for (const env of this.envelopes.values()) {
      if (env.rafId) cancelAnimationFrame(env.rafId);
    }
    this.envelopes.clear();
    this.midiListeners.clear();
    if (this.midiAccess && this.midiInputHandler) {
      for (const input of this.midiAccess.inputs.values()) {
        input.removeEventListener("midimessage", this.midiInputHandler);
      }
    }
    this.midiAccess = null;
    this.master.dispose();
  }

  /* ── master ── */

  setMasterVolume(db: number): void {
    this.master.volume.value = db;
  }

  /* ── mute / solo ── */

  updateMuteSolo(sources: SoundSource[]): void {
    const anySolo = sources.some((s) => s.solo);
    for (const source of sources) {
      const nodes = this.sources.get(source.id);
      if (!nodes) continue;
      const shouldMute = source.muted || (anySolo && !source.solo);
      nodes.volume.mute = shouldMute;
    }
  }

  /* ── MIDI ── */

  async initMidi(): Promise<boolean> {
    if (this.midiAccess) return true;
    if (!navigator.requestMIDIAccess) return false;
    try {
      this.midiAccess = await navigator.requestMIDIAccess();
      this.midiInputHandler = (e: Event) => {
        const msg = e as MIDIMessageEvent;
        const data = msg.data;
        if (!data || data.length < 3) return;
        const status = data[0] & 0xf0;
        const channel = (data[0] & 0x0f) + 1;
        const note = data[1];
        const velocity = data[2];

        if (status === 0x90 || status === 0x80) {
          const isNoteOn = status === 0x90 && velocity > 0;
          for (const cb of this.midiListeners.values()) {
            cb(channel, note, velocity, isNoteOn);
          }
        }
      };
      for (const input of this.midiAccess.inputs.values()) {
        input.addEventListener("midimessage", this.midiInputHandler);
      }
      this.midiAccess.addEventListener("statechange", () => {
        if (!this.midiAccess || !this.midiInputHandler) return;
        for (const input of this.midiAccess.inputs.values()) {
          input.removeEventListener("midimessage", this.midiInputHandler);
          input.addEventListener("midimessage", this.midiInputHandler);
        }
      });
      return true;
    } catch {
      return false;
    }
  }

  onMidiNote(id: string, callback: MidiNoteCallback): void {
    this.midiListeners.set(id, callback);
  }

  offMidiNote(id: string): void {
    this.midiListeners.delete(id);
  }

  /* ── envelope helpers ── */

  triggerEnvelopeAttack(modId: string, attack: number, decay: number, sustain: number, release: number): void {
    const existing = this.envelopes.get(modId);
    if (existing?.rafId) cancelAnimationFrame(existing.rafId);

    this.envelopes.set(modId, {
      value: 0,
      phase: "attack",
      phaseStart: performance.now() / 1000,
      attack,
      decay,
      sustain,
      release,
      rafId: null,
    });
  }

  triggerEnvelopeRelease(modId: string): void {
    const env = this.envelopes.get(modId);
    if (!env || env.phase === "idle" || env.phase === "release") return;
    env.phase = "release";
    env.phaseStart = performance.now() / 1000;
  }

  getEnvelopeValue(modId: string): number {
    const env = this.envelopes.get(modId);
    if (!env || env.phase === "idle") return 0;

    const now = performance.now() / 1000;
    const elapsed = now - env.phaseStart;

    switch (env.phase) {
      case "attack": {
        if (env.attack <= 0) {
          env.value = 1;
          env.phase = "decay";
          env.phaseStart = now;
          return 1;
        }
        const t = elapsed / env.attack;
        if (t >= 1) {
          env.value = 1;
          env.phase = "decay";
          env.phaseStart = now;
          return 1;
        }
        env.value = t;
        return t;
      }
      case "decay": {
        if (env.decay <= 0) {
          env.value = env.sustain;
          env.phase = "sustain";
          env.phaseStart = now;
          return env.sustain;
        }
        const t = elapsed / env.decay;
        if (t >= 1) {
          env.value = env.sustain;
          env.phase = "sustain";
          env.phaseStart = now;
          return env.sustain;
        }
        env.value = 1 - (1 - env.sustain) * t;
        return env.value;
      }
      case "sustain":
        env.value = env.sustain;
        return env.sustain;
      case "release": {
        if (env.release <= 0) {
          env.value = 0;
          env.phase = "idle";
          return 0;
        }
        const startVal = env.value;
        const t = elapsed / env.release;
        if (t >= 1) {
          env.value = 0;
          env.phase = "idle";
          return 0;
        }
        env.value = startVal * (1 - t);
        return env.value;
      }
      default:
        return 0;
    }
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

    // Filter is always in the chain; when disabled, pass-through (20kHz lowpass)
    const filter = new Tone.Filter({
      frequency: source.filterEnabled ? source.filterFrequency : 20000,
      type: source.filterEnabled ? source.filterType : "lowpass",
      Q: source.filterEnabled ? source.filterQ : 0.1,
    });

    // Chain: source -> filter -> reverb + delay -> panner -> volume -> master
    filter.connect(reverb);
    filter.connect(delay);
    reverb.connect(panner);
    delay.connect(panner);
    panner.connect(volume);
    volume.connect(this.master);

    if (source.sourceType === "sampler") {
      const pitchShiftNode = new Tone.PitchShift({
        pitch: source.pitchShift,
      });
      const player = new Tone.Player({
        loop: source.loopMode !== "none",
        playbackRate: source.playbackRate,
      });

      player.connect(pitchShiftNode);
      pitchShiftNode.connect(filter);

      this.sources.set(source.id, {
        type: "sampler",
        player,
        pitchShift: pitchShiftNode,
        filter,
        reverb,
        delay,
        panner,
        volume,
        playing: false,
        loaded: false,
      });
    } else {
      // Build oscillator type, handling custom partials
      const oscType = source.waveform === "custom" ? "sine" : source.waveform;
      const synth = new Tone.Synth({
        oscillator: { type: oscType },
        envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 1 },
      });
      if (source.waveform === "custom" && source.customPartials.length > 0) {
        (synth.oscillator as Tone.OmniOscillator<Tone.Oscillator>).partials = source.customPartials;
      }
      synth.frequency.value = source.frequency;
      synth.connect(filter);

      this.sources.set(source.id, {
        type: "oscillator",
        synth,
        filter,
        reverb,
        delay,
        panner,
        volume,
        playing: false,
      });
    }

    this.baselines.set(source.id, {
      frequency: source.frequency,
      volume: source.volume,
      pan: source.pan,
      reverbMix: source.reverbMix,
      delayMix: source.delayMix,
      playbackRate: source.playbackRate,
      pitchShift: source.pitchShift,
      filterFrequency: source.filterFrequency,
    });
  }

  removeSource(id: string): void {
    const nodes = this.sources.get(id);
    if (!nodes) return;
    if (nodes.playing) {
      if (nodes.type === "oscillator") {
        nodes.synth.triggerRelease();
      } else {
        nodes.player.stop();
      }
    }
    this.disposeSourceNodes(nodes);
    this.sources.delete(id);
    this.baselines.delete(id);
  }

  updateSource(id: string, updates: Partial<SoundSource>): void {
    const nodes = this.sources.get(id);
    if (!nodes) return;

    const baseline = this.baselines.get(id);

    // Shared params
    if (updates.volume !== undefined) {
      nodes.volume.volume.value = updates.volume;
      if (baseline) baseline.volume = updates.volume;
    }
    if (updates.pan !== undefined) {
      nodes.panner.pan.value = updates.pan;
      if (baseline) baseline.pan = updates.pan;
    }
    if (updates.reverbMix !== undefined) {
      nodes.reverb.wet.value = updates.reverbMix;
      if (baseline) baseline.reverbMix = updates.reverbMix;
    }
    if (updates.delayMix !== undefined) {
      nodes.delay.wet.value = updates.delayMix;
      if (baseline) baseline.delayMix = updates.delayMix;
    }
    if (updates.delayTime !== undefined) {
      nodes.delay.delayTime.value = updates.delayTime;
    }

    // Filter params — filter node is always present
    if (updates.filterEnabled !== undefined) {
      if (updates.filterEnabled) {
        // Re-apply the real filter settings
        nodes.filter.frequency.value = updates.filterFrequency ?? 1000;
        nodes.filter.type = updates.filterType ?? "lowpass";
        nodes.filter.Q.value = updates.filterQ ?? 1;
      } else {
        // Bypass: set to pass-through
        nodes.filter.frequency.value = 20000;
        nodes.filter.type = "lowpass";
        nodes.filter.Q.value = 0.1;
      }
    }
    if (updates.filterFrequency !== undefined) {
      nodes.filter.frequency.value = updates.filterFrequency;
      if (baseline) baseline.filterFrequency = updates.filterFrequency;
    }
    if (updates.filterQ !== undefined) {
      nodes.filter.Q.value = updates.filterQ;
    }
    if (updates.filterType !== undefined) {
      nodes.filter.type = updates.filterType;
    }

    // Oscillator-specific
    if (nodes.type === "oscillator") {
      if (updates.waveform !== undefined) {
        if (updates.waveform === "custom") {
          // Setting partials will be handled by customPartials update
        } else {
          nodes.synth.oscillator.type = updates.waveform as Waveform;
        }
      }
      if (updates.customPartials !== undefined && updates.customPartials.length > 0) {
        try {
          (nodes.synth.oscillator as Tone.OmniOscillator<Tone.Oscillator>).partials = updates.customPartials;
        } catch { /* ok - may not be supported in current state */ }
      }
      if (updates.frequency !== undefined) {
        nodes.synth.frequency.value = updates.frequency;
        if (baseline) baseline.frequency = updates.frequency;
      }
    }

    // Sampler-specific
    if (nodes.type === "sampler") {
      if (updates.playbackRate !== undefined) {
        nodes.player.playbackRate = updates.playbackRate;
        if (baseline) baseline.playbackRate = updates.playbackRate;
      }
      if (updates.pitchShift !== undefined) {
        nodes.pitchShift.pitch = updates.pitchShift;
        if (baseline) baseline.pitchShift = updates.pitchShift;
      }
      if (updates.loopMode !== undefined) {
        nodes.player.loop = updates.loopMode !== "none";
        if (updates.loopMode === "pingpong") {
          nodes.player.reverse = false;
        }
      }
      if (updates.sampleStart !== undefined && nodes.loaded) {
        nodes.player.loopStart = updates.sampleStart * nodes.player.buffer.duration;
      }
      if (updates.sampleEnd !== undefined && nodes.loaded) {
        nodes.player.loopEnd = updates.sampleEnd * nodes.player.buffer.duration;
      }
    }
  }

  async loadSampleBuffer(id: string, url: string): Promise<number> {
    const nodes = this.sources.get(id);
    if (!nodes || nodes.type !== "sampler") return 0;

    const buffer = await Tone.ToneAudioBuffer.fromUrl(url);
    nodes.player.buffer = buffer;
    nodes.loaded = true;
    return buffer.duration;
  }

  /* ── modulator management ── */

  addModulator(mod: Modulator): void {
    if (mod.type === "lfo") {
      if (this.lfos.has(mod.id)) return;
      if (mod.shape === "random") {
        // Random/S&H: use a regular LFO internally but we'll override via interval
        const lfo = new Tone.LFO(mod.rate, 0, 1);
        lfo.type = "square";
        this.lfos.set(mod.id, lfo);
      } else {
        const lfo = new Tone.LFO(mod.rate, 0, 1);
        lfo.type = mod.shape as OscillatorType;
        this.lfos.set(mod.id, lfo);
      }
    } else if (mod.type === "envelope") {
      this.envelopes.set(mod.id, {
        value: 0,
        phase: "idle",
        phaseStart: 0,
        attack: mod.attack,
        decay: mod.decay,
        sustain: mod.sustain,
        release: mod.release,
        rafId: null,
      });
    }
  }

  removeModulator(id: string): void {
    const lfo = this.lfos.get(id);
    if (lfo) {
      try { lfo.stop(); lfo.dispose(); } catch { /* ok */ }
      this.lfos.delete(id);
    }
    const ri = this.randomIntervals.get(id);
    if (ri) {
      clearInterval(ri);
      this.randomIntervals.delete(id);
    }
    const env = this.envelopes.get(id);
    if (env) {
      if (env.rafId) cancelAnimationFrame(env.rafId);
      this.envelopes.delete(id);
    }
    this.offMidiNote(id);
  }

  updateModulator(id: string, updates: Partial<Modulator>): void {
    const lfo = this.lfos.get(id);
    if (lfo) {
      if (updates.rate !== undefined) lfo.frequency.value = updates.rate;
      if (updates.shape !== undefined && updates.shape !== "random") {
        lfo.type = updates.shape as OscillatorType;
      }
    }
    // Switching away from LFO
    if (updates.type && updates.type !== "lfo" && lfo) {
      try { lfo.stop(); lfo.dispose(); } catch { /* ok */ }
      this.lfos.delete(id);
      const ri = this.randomIntervals.get(id);
      if (ri) { clearInterval(ri); this.randomIntervals.delete(id); }
    }
    // Switching away from envelope
    if (updates.type && updates.type !== "envelope") {
      const env = this.envelopes.get(id);
      if (env) {
        if (env.rafId) cancelAnimationFrame(env.rafId);
        this.envelopes.delete(id);
      }
      this.offMidiNote(id);
    }
    // Switching to LFO
    if (updates.type === "lfo" && !this.lfos.has(id)) {
      const shape = (updates.shape as LfoShape) ?? "sine";
      const newLfo = new Tone.LFO(updates.rate ?? 1, 0, 1);
      newLfo.type = (shape === "random" ? "square" : shape) as OscillatorType;
      this.lfos.set(id, newLfo);
    }
    // Switching to envelope
    if (updates.type === "envelope" && !this.envelopes.has(id)) {
      this.envelopes.set(id, {
        value: 0,
        phase: "idle",
        phaseStart: 0,
        attack: updates.attack ?? 0.1,
        decay: updates.decay ?? 0.2,
        sustain: updates.sustain ?? 0.7,
        release: updates.release ?? 0.5,
        rafId: null,
      });
    }
    // Update envelope ADSR params
    const env = this.envelopes.get(id);
    if (env) {
      if (updates.attack !== undefined) env.attack = updates.attack;
      if (updates.decay !== undefined) env.decay = updates.decay;
      if (updates.sustain !== undefined) env.sustain = updates.sustain;
      if (updates.release !== undefined) env.release = updates.release;
    }
  }

  /* ── route / modulation ── */

  applyRoutes(
    routes: Route[],
    modulators: Modulator[],
    sources: SoundSource[],
  ): void {
    this.clearAllRoutes();

    for (const source of sources) {
      this.baselines.set(source.id, {
        frequency: source.frequency,
        volume: source.volume,
        pan: source.pan,
        reverbMix: source.reverbMix,
        delayMix: source.delayMix,
        playbackRate: source.playbackRate,
        pitchShift: source.pitchShift,
        filterFrequency: source.filterFrequency,
      });
    }

    const effective = new Map<string, Route>();
    for (const route of routes) {
      const key = `${route.sourceId}:${route.parameter}`;
      effective.set(key, route);
    }

    for (const route of effective.values()) {
      const source = sources.find((s) => s.id === route.sourceId);
      const mod = modulators.find((m) => m.id === route.modulatorId);
      if (!source || !mod) continue;

      const nodes = this.sources.get(route.sourceId);
      if (!nodes) continue;

      // Skip invalid param/source combinations
      if (nodes.type === "sampler" && route.parameter === "frequency") continue;
      if (nodes.type === "oscillator" && (route.parameter === "playbackRate" || route.parameter === "pitchShift")) continue;
      // filterFrequency is always available since filter is always in the chain

      if (mod.type === "lfo") {
        if (mod.shape === "random") {
          this.applyRandomRoute(route, mod, nodes);
        } else {
          this.applyLfoRoute(route, mod, nodes);
        }
      } else if (mod.type === "data" && mod.data) {
        this.applyDataRoute(route, mod, nodes);
      } else if (mod.type === "envelope") {
        this.applyEnvelopeRoute(route, mod, nodes);
      }
    }
  }

  clearAllRoutes(): void {
    for (const [, active] of this.activeRoutes) {
      try { active.disconnect(); } catch { /* ok */ }
    }
    this.activeRoutes.clear();
  }

  removeRoute(id: string): void {
    const active = this.activeRoutes.get(id);
    if (active) {
      try { active.disconnect(); } catch { /* ok */ }
      this.activeRoutes.delete(id);
    }
  }

  /* ── transport ── */

  async playAll(sources: SoundSource[]): Promise<void> {
    await this.ensureContext();

    for (const source of sources) {
      if (!this.sources.has(source.id)) {
        this.addSource(source);
      }
      const nodes = this.sources.get(source.id)!;
      if (!nodes.playing) {
        if (nodes.type === "oscillator") {
          nodes.synth.triggerAttack(source.frequency);
        } else if (nodes.loaded) {
          const startOffset = source.sampleStart * nodes.player.buffer.duration;
          nodes.player.start(undefined, startOffset);
        }
        nodes.playing = true;
      }
    }

    this.updateMuteSolo(sources);
  }

  async startSource(source: SoundSource): Promise<void> {
    await this.ensureContext();
    if (!this.sources.has(source.id)) {
      this.addSource(source);
    }
    const nodes = this.sources.get(source.id)!;
    if (!nodes.playing) {
      if (nodes.type === "oscillator") {
        nodes.synth.triggerAttack(source.frequency);
      } else if (nodes.loaded) {
        const startOffset = source.sampleStart * nodes.player.buffer.duration;
        nodes.player.start(undefined, startOffset);
      }
      nodes.playing = true;
    }
  }

  stopAll(): void {
    for (const nodes of this.sources.values()) {
      if (nodes.playing) {
        if (nodes.type === "oscillator") {
          nodes.synth.triggerRelease();
        } else {
          nodes.player.stop();
        }
        nodes.playing = false;
      }
    }
  }

  /** Set oscillator frequency directly (e.g. from keyboard/MIDI note) */
  setSourceFrequency(id: string, freq: number): void {
    const nodes = this.sources.get(id);
    if (!nodes || nodes.type !== "oscillator") return;
    nodes.synth.frequency.value = freq;
  }

  /* ── internal: restore baseline ── */

  private restoreBaseline(sourceId: string, param: RoutableParam): void {
    const nodes = this.sources.get(sourceId);
    const baseline = this.baselines.get(sourceId);
    if (!nodes || !baseline) return;

    switch (param) {
      case "frequency":
        if (nodes.type === "oscillator") {
          nodes.synth.frequency.value = baseline.frequency;
        }
        break;
      case "volume":
        nodes.volume.volume.value = baseline.volume;
        break;
      case "pan":
        nodes.panner.pan.value = baseline.pan;
        break;
      case "reverbMix":
        nodes.reverb.wet.value = baseline.reverbMix;
        break;
      case "delayMix":
        nodes.delay.wet.value = baseline.delayMix;
        break;
      case "playbackRate":
        if (nodes.type === "sampler") {
          nodes.player.playbackRate = baseline.playbackRate;
        }
        break;
      case "pitchShift":
        if (nodes.type === "sampler") {
          nodes.pitchShift.pitch = baseline.pitchShift;
        }
        break;
      case "filterFrequency":
        nodes.filter.frequency.value = baseline.filterFrequency;
        break;
    }
  }

  /* ── internal: LFO route ── */

  private applyLfoRoute(
    route: Route,
    mod: Modulator,
    nodes: SourceNodes,
  ): void {
    const lfo = this.lfos.get(mod.id);
    if (!lfo) return;

    try { lfo.stop(); lfo.disconnect(); } catch { /* ok */ }

    this.configureLfoRange(lfo, route);

    const target = this.getTargetParam(route.parameter, nodes);
    if (!target) return;

    const sourceId = route.sourceId;
    const param = route.parameter;

    try {
      lfo.connect(target);
      lfo.start();
      this.activeRoutes.set(route.id, {
        disconnect: () => {
          try { lfo.stop(); lfo.disconnect(); } catch { /* ok */ }
          this.restoreBaseline(sourceId, param);
        },
      });
    } catch (err) {
      console.error("Error connecting LFO:", err);
    }
  }

  private configureLfoRange(lfo: Tone.LFO, route: Route): void {
    const depth = route.depth;
    const { min, max } = route;

    const mid = (min + max) / 2;
    const halfRange = ((max - min) / 2) * depth;
    lfo.min = mid - halfRange;
    lfo.max = mid + halfRange;
  }

  /* ── internal: random (S&H) route ── */

  private applyRandomRoute(
    route: Route,
    mod: Modulator,
    nodes: SourceNodes,
  ): void {
    const sourceId = route.sourceId;
    const param = route.parameter;
    const intervalMs = Math.max(20, 1000 / mod.rate);

    const intervalId = setInterval(() => {
      const randomVal = Math.random() * route.depth;
      this.writeModulatedValue(route, randomVal, nodes);
    }, intervalMs);

    this.activeRoutes.set(route.id, {
      disconnect: () => {
        clearInterval(intervalId);
        this.restoreBaseline(sourceId, param);
      },
    });
  }

  /* ── internal: data route ── */

  private applyDataRoute(
    route: Route,
    mod: Modulator,
    nodes: SourceNodes,
  ): void {
    if (!mod.data || mod.data.length === 0) return;

    let dataIndex = 0;
    const data = mod.data;
    const dataMin = mod.dataMin;
    const dataRange = mod.dataMax - dataMin || 1;
    const sourceId = route.sourceId;
    const param = route.parameter;

    const intervalId = setInterval(() => {
      const raw = data[dataIndex];
      const normalized = (raw - dataMin) / dataRange;

      this.writeModulatedValue(route, normalized * route.depth, nodes);

      dataIndex = (dataIndex + 1) % data.length;
    }, 50);

    this.activeRoutes.set(route.id, {
      disconnect: () => {
        clearInterval(intervalId);
        this.restoreBaseline(sourceId, param);
      },
    });
  }

  /* ── internal: envelope route ── */

  private applyEnvelopeRoute(
    route: Route,
    mod: Modulator,
    nodes: SourceNodes,
  ): void {
    const sourceId = route.sourceId;
    const param = route.parameter;
    const modId = mod.id;

    const midiChannel = mod.midiChannel;
    this.onMidiNote(modId, (channel, _note, _velocity, isNoteOn) => {
      if (midiChannel !== 0 && channel !== midiChannel) return;
      if (isNoteOn) {
        this.triggerEnvelopeAttack(modId, mod.attack, mod.decay, mod.sustain, mod.release);
      } else {
        this.triggerEnvelopeRelease(modId);
      }
    });

    let running = true;
    const tick = () => {
      if (!running) return;
      const envValue = this.getEnvelopeValue(modId);
      this.writeModulatedValue(route, envValue * route.depth, nodes);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    this.activeRoutes.set(route.id, {
      disconnect: () => {
        running = false;
        this.offMidiNote(modId);
        this.restoreBaseline(sourceId, param);
      },
    });
  }

  /* ── internal: helpers ── */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getTargetParam(param: RoutableParam, nodes: SourceNodes): any {
    switch (param) {
      case "frequency":
        return nodes.type === "oscillator" ? nodes.synth.frequency : null;
      case "volume":
        return nodes.volume.volume;
      case "pan":
        return nodes.panner.pan;
      case "reverbMix":
        return nodes.reverb.wet;
      case "delayMix":
        return nodes.delay.wet;
      case "playbackRate":
        return null;
      case "pitchShift":
        return nodes.type === "sampler" ? nodes.pitchShift.pitch : null;
      case "filterFrequency":
        return nodes.filter.frequency;
      default:
        return null;
    }
  }

  private writeModulatedValue(
    route: Route,
    t: number,
    nodes: SourceNodes,
  ): void {
    const { min, max } = route;
    const value = min + (max - min) * t;

    switch (route.parameter) {
      case "frequency":
        if (nodes.type === "oscillator") {
          nodes.synth.frequency.value = Math.max(20, Math.min(20000, value));
        }
        break;
      case "volume":
        nodes.volume.volume.value = Math.max(-60, Math.min(0, value));
        break;
      case "pan":
        nodes.panner.pan.value = Math.max(-1, Math.min(1, value));
        break;
      case "reverbMix":
        nodes.reverb.wet.value = Math.max(0, Math.min(1, value));
        break;
      case "delayMix":
        nodes.delay.wet.value = Math.max(0, Math.min(1, value));
        break;
      case "playbackRate":
        if (nodes.type === "sampler") {
          nodes.player.playbackRate = Math.max(0.1, Math.min(4, value));
        }
        break;
      case "pitchShift":
        if (nodes.type === "sampler") {
          nodes.pitchShift.pitch = Math.max(-24, Math.min(24, value));
        }
        break;
      case "filterFrequency":
        nodes.filter.frequency.value = Math.max(20, Math.min(20000, value));
        break;
    }
  }

  private disposeSourceNodes(nodes: SourceNodes): void {
    if (nodes.type === "oscillator") {
      try { nodes.synth.dispose(); } catch { /* already disposed */ }
    } else {
      try { nodes.player.dispose(); } catch { /* already disposed */ }
      try { nodes.pitchShift.dispose(); } catch { /* already disposed */ }
    }
    try { nodes.filter.dispose(); } catch { /* already disposed */ }
    try { nodes.reverb.dispose(); } catch { /* already disposed */ }
    try { nodes.delay.dispose(); } catch { /* already disposed */ }
    try { nodes.panner.dispose(); } catch { /* already disposed */ }
    try { nodes.volume.dispose(); } catch { /* already disposed */ }
  }
}
