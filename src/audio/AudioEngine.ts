import * as Tone from "tone";
import type {
  SoundSource,
  Waveform,
  Modulator,
  Route,
  RoutableParam,
} from "@/types/sound";

/**
 * Tone.js node graph per source:
 *   Synth ──┬──▶ Reverb ──┐
 *           └──▶ Delay  ──┤
 *                          ▼
 *                       Panner ──▶ Volume ──▶ master
 *
 * Modulation:
 *   LFO ──▶ target param (frequency / volume / pan / wet)
 *   Data ──▶ setInterval loop writing values into target param
 */
interface SourceNodes {
  synth: Tone.Synth;
  reverb: Tone.Reverb;
  delay: Tone.FeedbackDelay;
  panner: Tone.Panner;
  volume: Tone.Volume;
  playing: boolean;
}

/** Anything we need to tear down when a route is removed or re-applied. */
interface ActiveRoute {
  disconnect(): void;
}

export class AudioEngine {
  private master: Tone.Volume;
  private sources: Map<string, SourceNodes> = new Map();
  private lfos: Map<string, Tone.LFO> = new Map();
  private activeRoutes: Map<string, ActiveRoute> = new Map();
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
    for (const lfo of this.lfos.values()) {
      try { lfo.dispose(); } catch { /* ok */ }
    }
    this.lfos.clear();
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
    this.disposeSourceNodes(nodes);
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

  /* ── modulator management ── */

  addModulator(mod: Modulator): void {
    if (this.lfos.has(mod.id)) return;
    if (mod.type === "lfo") {
      const lfo = new Tone.LFO(mod.rate, 0, 1);
      lfo.type = mod.shape;
      this.lfos.set(mod.id, lfo);
    }
  }

  removeModulator(id: string): void {
    const lfo = this.lfos.get(id);
    if (lfo) {
      try { lfo.stop(); lfo.dispose(); } catch { /* ok */ }
      this.lfos.delete(id);
    }
  }

  updateModulator(id: string, updates: Partial<Modulator>): void {
    const lfo = this.lfos.get(id);
    if (lfo) {
      if (updates.rate !== undefined) lfo.frequency.value = updates.rate;
      if (updates.shape !== undefined) lfo.type = updates.shape;
    }
    // If switching from lfo → data, dispose the LFO
    if (updates.type === "data" && lfo) {
      try { lfo.stop(); lfo.dispose(); } catch { /* ok */ }
      this.lfos.delete(id);
    }
    // If switching from data → lfo, create the LFO
    if (updates.type === "lfo" && !this.lfos.has(id)) {
      const newLfo = new Tone.LFO(updates.rate ?? 1, 0, 1);
      newLfo.type = (updates.shape as Waveform) ?? "sine";
      this.lfos.set(id, newLfo);
    }
  }

  /* ── route / modulation ── */

  /**
   * Apply all active routes. Call this whenever routes, modulators, or
   * playing state change — mirrors the prototype's useEffect logic.
   */
  applyRoutes(
    routes: Route[],
    modulators: Modulator[],
    sources: SoundSource[],
  ): void {
    // Tear down previous connections
    this.clearAllRoutes();

    for (const route of routes) {
      const source = sources.find((s) => s.id === route.sourceId);
      const mod = modulators.find((m) => m.id === route.modulatorId);
      if (!source || !mod) continue;

      const nodes = this.sources.get(route.sourceId);
      if (!nodes) continue;

      if (mod.type === "lfo") {
        this.applyLfoRoute(route, mod, nodes);
      } else if (mod.type === "data" && mod.data) {
        this.applyDataRoute(route, mod, nodes);
      }
    }
  }

  clearAllRoutes(): void {
    for (const active of this.activeRoutes.values()) {
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
        nodes.synth.triggerAttack(source.frequency);
        nodes.playing = true;
      }
    }
  }

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

  /* ── internal helpers ── */

  private applyLfoRoute(
    route: Route,
    mod: Modulator,
    nodes: SourceNodes,
  ): void {
    const lfo = this.lfos.get(mod.id);
    if (!lfo) return;

    // Stop so we can reconfigure
    try { lfo.stop(); } catch { /* ok */ }

    this.configureLfoRange(lfo, route);

    const target = this.getTargetParam(route.parameter, nodes);
    if (!target) return;

    try {
      lfo.connect(target);
      lfo.start();
      this.activeRoutes.set(route.id, {
        disconnect: () => {
          try { lfo.stop(); lfo.disconnect(); } catch { /* ok */ }
        },
      });
    } catch (err) {
      console.error("Error connecting LFO:", err);
    }
  }

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

    const intervalId = setInterval(() => {
      const raw = data[dataIndex];
      const normalized = (raw - dataMin) / dataRange;

      this.writeModulatedValue(route, normalized, nodes);

      dataIndex = (dataIndex + 1) % data.length;
    }, 50);

    this.activeRoutes.set(route.id, {
      disconnect: () => clearInterval(intervalId),
    });
  }

  private configureLfoRange(lfo: Tone.LFO, route: Route): void {
    const { min, max } = route;
    const range = max - min;
    const depth = route.depth;

    if (route.parameter === "volume") {
      const scaledMin = -40 + (40 * (1 - depth)) / 2;
      const scaledMax = -10 - (30 * (1 - depth)) / 2;
      lfo.min = scaledMin;
      lfo.max = scaledMax;
    } else if (route.parameter === "pan") {
      lfo.min = -depth;
      lfo.max = depth;
    } else if (
      route.parameter === "reverbMix" ||
      route.parameter === "delayMix"
    ) {
      lfo.min = 0;
      lfo.max = depth;
    } else {
      // frequency (and anything else)
      const scaledMin = min + (range * (1 - depth)) / 2;
      const scaledMax = max - (range * (1 - depth)) / 2;
      lfo.min = scaledMin;
      lfo.max = scaledMax;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getTargetParam(
    param: RoutableParam,
    nodes: SourceNodes,
  ): any {
    switch (param) {
      case "frequency":
        return nodes.synth.frequency;
      case "volume":
        return nodes.volume.volume;
      case "pan":
        return nodes.panner.pan;
      case "reverbMix":
        return nodes.reverb.wet;
      case "delayMix":
        return nodes.delay.wet;
      default:
        return null;
    }
  }

  private writeModulatedValue(
    route: Route,
    normalized: number,
    nodes: SourceNodes,
  ): void {
    const depth = route.depth;
    const { min, max } = route;

    switch (route.parameter) {
      case "frequency":
        nodes.synth.frequency.value = min + (max - min) * normalized * depth;
        break;
      case "volume":
        nodes.volume.volume.value = -40 + 30 * normalized * depth;
        break;
      case "pan":
        nodes.panner.pan.value = -1 + 2 * normalized * depth;
        break;
      case "reverbMix":
        nodes.reverb.wet.value = normalized * depth;
        break;
      case "delayMix":
        nodes.delay.wet.value = normalized * depth;
        break;
    }
  }

  private disposeSourceNodes(nodes: SourceNodes): void {
    try { nodes.synth.dispose(); } catch { /* already disposed */ }
    try { nodes.reverb.dispose(); } catch { /* already disposed */ }
    try { nodes.delay.dispose(); } catch { /* already disposed */ }
    try { nodes.panner.dispose(); } catch { /* already disposed */ }
    try { nodes.volume.dispose(); } catch { /* already disposed */ }
  }
}
