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
 * Modulation approach (data-driven):
 *   We use a setInterval loop that writes values directly into the
 *   Tone.js param. When the route is torn down we restore the
 *   source's baseline value so the sound source keeps working.
 *
 * Modulation approach (LFO):
 *   We use a Tone.js LFO node that is connected to the target param
 *   via Tone's signal graph. On teardown we disconnect + restore baseline.
 */
interface SourceNodes {
  synth: Tone.Synth;
  reverb: Tone.Reverb;
  delay: Tone.FeedbackDelay;
  panner: Tone.Panner;
  volume: Tone.Volume;
  playing: boolean;
}

/** Stored baseline values for a source so we can restore after modulation. */
interface BaselineValues {
  frequency: number;
  volume: number;
  pan: number;
  reverbMix: number;
  delayMix: number;
}

/** Teardown handle for an active route. */
interface ActiveRoute {
  disconnect(): void;
}

export class AudioEngine {
  private master: Tone.Volume;
  private sources: Map<string, SourceNodes> = new Map();
  /** Baseline param values per source, captured from SoundSource state. */
  private baselines: Map<string, BaselineValues> = new Map();
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
    this.baselines.clear();
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

    // Store baseline
    this.baselines.set(source.id, {
      frequency: source.frequency,
      volume: source.volume,
      pan: source.pan,
      reverbMix: source.reverbMix,
      delayMix: source.delayMix,
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
    this.baselines.delete(id);
  }

  updateSource(id: string, updates: Partial<SoundSource>): void {
    const nodes = this.sources.get(id);
    if (!nodes) return;

    // Also update baseline so restore uses the latest user-set values
    const baseline = this.baselines.get(id);

    if (updates.waveform !== undefined) {
      nodes.synth.oscillator.type = updates.waveform as Waveform;
    }
    if (updates.frequency !== undefined) {
      nodes.synth.frequency.value = updates.frequency;
      if (baseline) baseline.frequency = updates.frequency;
    }
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
    if (updates.type === "data" && lfo) {
      try { lfo.stop(); lfo.dispose(); } catch { /* ok */ }
      this.lfos.delete(id);
    }
    if (updates.type === "lfo" && !this.lfos.has(id)) {
      const newLfo = new Tone.LFO(updates.rate ?? 1, 0, 1);
      newLfo.type = (updates.shape as Waveform) ?? "sine";
      this.lfos.set(id, newLfo);
    }
  }

  /* ── route / modulation ── */

  /**
   * Re-apply all routes. Called by the hook's useEffect whenever routes,
   * modulators, sources, or playing state change.
   * Only the *last* route per (sourceId, parameter) pair wins —
   * this prevents stacking that shifts base values.
   */
  applyRoutes(
    routes: Route[],
    modulators: Modulator[],
    sources: SoundSource[],
  ): void {
    this.clearAllRoutes();

    // Refresh baselines from current source state
    for (const source of sources) {
      this.baselines.set(source.id, {
        frequency: source.frequency,
        volume: source.volume,
        pan: source.pan,
        reverbMix: source.reverbMix,
        delayMix: source.delayMix,
      });
    }

    // De-dupe: keep only the last route per (sourceId, param) pair
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

      if (mod.type === "lfo") {
        this.applyLfoRoute(route, mod, nodes);
      } else if (mod.type === "data" && mod.data) {
        this.applyDataRoute(route, mod, nodes);
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

  /* ── internal: restore baseline ── */

  /**
   * Write the user-set value back into the Tone node for a given param.
   * Called when a route is torn down so the source returns to normal.
   */
  private restoreBaseline(sourceId: string, param: RoutableParam): void {
    const nodes = this.sources.get(sourceId);
    const baseline = this.baselines.get(sourceId);
    if (!nodes || !baseline) return;

    switch (param) {
      case "frequency":
        nodes.synth.frequency.value = baseline.frequency;
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

    // For all params: modulate between min..max, scaled by depth.
    // depth=1 → full range, depth=0 → no modulation (midpoint).
    const mid = (min + max) / 2;
    const halfRange = ((max - min) / 2) * depth;
    lfo.min = mid - halfRange;
    lfo.max = mid + halfRange;
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
      // Normalize to 0..1
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

  /* ── internal: helpers ── */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getTargetParam(param: RoutableParam, nodes: SourceNodes): any {
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

  /**
   * Write a modulated value using the route's min/max range.
   * `t` is 0..1 (already multiplied by depth).
   */
  private writeModulatedValue(
    route: Route,
    t: number,
    nodes: SourceNodes,
  ): void {
    const { min, max } = route;
    const value = min + (max - min) * t;

    switch (route.parameter) {
      case "frequency":
        // Clamp to audible range
        nodes.synth.frequency.value = Math.max(20, Math.min(20000, value));
        break;
      case "volume":
        // Clamp to reasonable dB range (avoid -Infinity or extreme values)
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
