/* global fetch */

export function initAudioSystem({ window }) {
  const state = {
    enabled: true,
    unlocked: false,
    volume: 0.8,
    ctx: null,
    masterGain: null,
    sfxGain: null,
    musicGain: null,
    musicNodes: [],
    currentMusicSource: null,
    musicBuffers: {},
    musicTrackLoading: {},
    currentMusicTheme: null,
    pendingMusicTheme: 'Start Screen',
    musicTimer: null,
    musicRequestId: 0,
  };

  const sfxPresets = {
    paddle: { freq: 540, freqEnd: 420, attack: 0.01, release: 0.18, gain: 0.35, type: 'triangle' },
    block: { freq: 500, freqEnd: 360, attack: 0.015, release: 0.22, gain: 0.32, type: 'sine' },
    powerup: { freq: 660, freqEnd: 880, attack: 0.02, release: 0.45, gain: 0.28, type: 'sine' },
    lifeLost: { freq: 220, freqEnd: 120, attack: 0.03, release: 0.8, gain: 0.35, type: 'sawtooth' },
    levelUp: { freq: 520, freqEnd: 780, attack: 0.02, release: 0.5, gain: 0.32, type: 'triangle' },
    gameOver: { freq: 150, freqEnd: 70, attack: 0.04, release: 1.2, gain: 0.38, type: 'triangle' },
    magicFire: { freq: 420, freqEnd: 920, attack: 0.01, release: 0.6, gain: 0.5, type: 'sawtooth' },
    magicIce: { freq: 540, freqEnd: 260, attack: 0.02, release: 0.8, gain: 0.42, type: 'triangle' },
    magicSlow: { freq: 320, freqEnd: 240, attack: 0.05, release: 1.1, gain: 0.38, type: 'sine' },
  };

  const musicPresets = {
    'Synthwave Nebula': {
      volume: 0.26,
      waveform: 'sine',
      noteGain: 0.08,
      filter: { type: 'lowpass', freq: 780, Q: 0.7 },
      chords: [
        { notes: [220, 330, 440], duration: 4.5, attack: 1.2, release: 1.6, pause: 1.3 },
        { notes: [247, 370, 494], duration: 4.6, attack: 1.4, release: 1.7, pause: 1.4 },
        { notes: [196, 294, 392], duration: 5.2, attack: 1.3, release: 1.9, pause: 1.6 },
      ],
    },
    'Cosmic Garden': {
      volume: 0.23,
      waveform: 'triangle',
      noteGain: 0.07,
      filter: { type: 'lowpass', freq: 560, Q: 0.9 },
      chords: [
        { notes: [261.63, 329.63, 392.0], duration: 6.0, attack: 1.8, release: 2.2, pause: 1.8 },
        { notes: [293.66, 369.99, 440.0], duration: 5.6, attack: 1.6, release: 2.0, pause: 1.5 },
      ],
    },
    'Orbital Station': {
      volume: 0.25,
      waveform: 'sawtooth',
      noteGain: 0.065,
      filter: { type: 'lowpass', freq: 980, Q: 0.6 },
      chords: [
        { notes: [207.65, 311.13, 415.3], duration: 5.2, attack: 1.2, release: 1.8, pause: 1.2 },
        { notes: [233.08, 349.23, 466.16], duration: 4.8, attack: 1.1, release: 1.7, pause: 1.1 },
        { notes: [185.0, 277.18, 369.99], duration: 5.4, attack: 1.4, release: 2.0, pause: 1.3 },
      ],
    },
    default: {
      volume: 0.2,
      waveform: 'sine',
      noteGain: 0.07,
      filter: { type: 'lowpass', freq: 650, Q: 0.8 },
      chords: [
        { notes: [220, 330, 440], duration: 5.4, attack: 1.3, release: 1.9, pause: 1.5 },
      ],
    },
  };

  const musicTracks = {
    'Start Screen': { url: 'resources/start.mp3', volume: 0.2, loop: true },
    'Synthwave Nebula': { url: 'resources/background1.mp3', volume: 0.26, loop: true },
    'Cosmic Garden': { url: 'resources/background2.mp3', volume: 0.24, loop: true },
    'Orbital Station': { url: 'resources/background3.mp3', volume: 0.25, loop: true },
    'Aurora Peaks': { url: 'resources/background1.mp3', volume: 0.22, loop: true },
    'Desert Mirage': { url: 'resources/background2.mp3', volume: 0.27, loop: true },
    'Neon Shards': { url: 'resources/background3.mp3', volume: 0.28, loop: true },
    default: { url: 'resources/background1.mp3', volume: 0.23, loop: true },
  };

  function applyAudioVolume() {
    if (!state.masterGain) return;
    const target = state.enabled ? state.volume : 0;
    if (state.ctx) {
      state.masterGain.gain.setTargetAtTime(target, state.ctx.currentTime, 0.08);
    } else {
      state.masterGain.gain.value = target;
    }
  }

  function initAudioEngine() {
    if (state.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      console.warn('AudioContext not supported in this browser.');
      state.enabled = false;
      return;
    }
    state.ctx = new AudioCtx();
    state.masterGain = state.ctx.createGain();
    state.masterGain.connect(state.ctx.destination);
    state.sfxGain = state.ctx.createGain();
    state.sfxGain.connect(state.masterGain);
    state.musicGain = state.ctx.createGain();
    state.musicGain.gain.value = 0;
    state.musicGain.connect(state.masterGain);
    applyAudioVolume();
  }

  function setMasterVolume(value) {
    state.volume = Math.max(0, Math.min(1, value));
    applyAudioVolume();
  }

  function triggerTone(spec) {
    if (!state.ctx || state.ctx.state === 'suspended') return null;
    const osc = state.ctx.createOscillator();
    const gain = state.ctx.createGain();
    osc.type = spec.type || 'sine';
    osc.frequency.value = spec.freq;
    if (spec.detune) osc.detune.value = spec.detune;
    const now = state.ctx.currentTime;
    const attack = spec.attack !== undefined ? spec.attack : 0.02;
    const release = spec.release !== undefined ? spec.release : (spec.decay || 0.3);
    const peak = spec.gain || 0.4;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + release);
    if (spec.freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(spec.freqEnd, now + attack + release);
    }
    osc.connect(gain);
    gain.connect(spec.targetGain || state.sfxGain);
    osc.start(now);
    osc.stop(now + attack + release + 0.05);
    osc.onended = () => {
      try { osc.disconnect(); } catch (err) {}
      try { gain.disconnect(); } catch (err) {}
    };
    return { osc, gain };
  }

  function playSfx(key) {
    if (!state.enabled || !state.unlocked) return;
    if (!state.ctx) return;
    const spec = sfxPresets[key];
    if (!spec) return;
    if (state.ctx.state === 'suspended') {
      state.ctx.resume().then(() => triggerTone(spec)).catch(() => {});
    } else {
      triggerTone(spec);
    }
  }

  function stopThemeMusic() {
    if (state.musicTimer) {
      clearTimeout(state.musicTimer);
      state.musicTimer = null;
    }
    if (state.ctx && state.musicGain) {
      try {
        state.musicGain.gain.cancelScheduledValues(state.ctx.currentTime);
        state.musicGain.gain.setTargetAtTime(0.0001, state.ctx.currentTime, 0.4);
      } catch (err) {}
    }
    if (state.currentMusicSource) {
      try { state.currentMusicSource.stop(); } catch (err) {}
      try { state.currentMusicSource.disconnect(); } catch (err) {}
      state.currentMusicSource = null;
    }
    if (state.musicNodes.length) {
      const now = state.ctx ? state.ctx.currentTime : 0;
      state.musicNodes.forEach((node) => {
        try {
          node.gain.gain.cancelScheduledValues(now);
          node.gain.gain.setTargetAtTime(0.0001, now, 0.5);
          node.osc.stop(now + 0.8);
        } catch (err) {}
        if (node.lfo) {
          try { node.lfo.stop(now + 0.8); } catch (err) {}
          try { node.lfo.disconnect(); } catch (err) {}
        }
        if (node.lfoGain) {
          try { node.lfoGain.disconnect(); } catch (err) {}
        }
        if (node.filter) {
          try { node.filter.disconnect(); } catch (err) {}
        }
        try { node.gain.disconnect(); } catch (err) {}
        try { node.osc.disconnect(); } catch (err) {}
      });
      state.musicNodes.length = 0;
    }
    state.currentMusicTheme = null;
    state.pendingMusicTheme = null;
    state.musicRequestId += 1;
  }

  function loadMusicBuffer(url) {
    if (state.musicBuffers[url]) return Promise.resolve(state.musicBuffers[url]);
    if (state.musicTrackLoading[url]) return state.musicTrackLoading[url];
    if (!state.ctx) return Promise.reject(new Error('Audio context not ready'));

    const pending = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Music request failed with status ' + response.status);
        }
        return response.arrayBuffer();
      })
      .then((data) => new Promise((resolve, reject) => {
        state.ctx.decodeAudioData(
          data,
          (buffer) => {
            state.musicBuffers[url] = buffer;
            resolve(buffer);
          },
          (err) => reject(err),
        );
      }));

    state.musicTrackLoading[url] = pending.then((buffer) => {
      delete state.musicTrackLoading[url];
      return buffer;
    }, (err) => {
      delete state.musicTrackLoading[url];
      throw err;
    });

    return state.musicTrackLoading[url];
  }

  function playProceduralMusic(themeName) {
    // Ensure any currently playing theme (buffer or nodes) is stopped
    stopThemeMusic();
    // Bump request id to cancel any in-flight buffer load callbacks
    state.musicRequestId += 1;

    const preset = musicPresets[themeName] || musicPresets.default;
    if (!preset || !preset.chords || !preset.chords.length) {
      state.currentMusicTheme = themeName;
      state.pendingMusicTheme = null;
      return;
    }

    if (state.musicGain) {
      const targetVol = preset.volume !== undefined ? preset.volume : 0.3;
      state.musicGain.gain.setTargetAtTime(targetVol, state.ctx.currentTime, 0.6);
    }

    let chordIndex = 0;
    const waveform = preset.waveform || 'sine';
    const noteGain = preset.noteGain || 0.12;

    const playChord = () => {
      if (!state.ctx || state.ctx.state === 'closed') return;
      if (state.musicTimer) {
        clearTimeout(state.musicTimer);
        state.musicTimer = null;
      }
      const data = preset.chords[chordIndex % preset.chords.length];
      chordIndex += 1;
      const now = state.ctx.currentTime;
      const attack = data.attack || 1.0;
      const release = data.release || 1.5;
      const duration = data.duration || 4.0;
      const pause = data.pause || 1.0;

      data.notes.forEach((freq) => {
        const osc = state.ctx.createOscillator();
        osc.type = waveform;
        osc.frequency.setValueAtTime(freq, now);
        const gainNode = state.ctx.createGain();
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(noteGain, now + attack);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration + release);

        let filter = null;
        if (preset.filter) {
          filter = state.ctx.createBiquadFilter();
          filter.type = preset.filter.type || 'lowpass';
          filter.frequency.value = preset.filter.freq || 900;
          filter.Q.value = preset.filter.Q || 1;
          osc.connect(filter);
          filter.connect(gainNode);
        } else {
          osc.connect(gainNode);
        }

        if (state.musicGain) {
          gainNode.connect(state.musicGain);
        } else if (state.masterGain) {
          gainNode.connect(state.masterGain);
        } else {
          gainNode.connect(state.ctx.destination);
        }

        const lfo = state.ctx.createOscillator();
        lfo.frequency.value = 0.35;
        const lfoGain = state.ctx.createGain();
        lfoGain.gain.value = 8;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(now);
        lfo.stop(now + duration + release + pause);

        osc.start(now);
        osc.stop(now + duration + release);

        state.musicNodes.push({ osc, gain: gainNode, lfo, lfoGain, filter });
      });

      state.musicTimer = setTimeout(playChord, (data.duration || 4.0) * 1000 + (data.pause || 1.0) * 1000);
    };

    playChord();
    state.currentMusicTheme = themeName;
    state.pendingMusicTheme = null;
  }

  function startThemeMusic(themeName) {
    if (!state.enabled) return;
    if (!state.ctx) {
      initAudioEngine();
      if (!state.ctx) return;
    }
    if (state.ctx.state === 'suspended') {
      state.pendingMusicTheme = themeName;
      state.ctx.resume().then(() => {
        if (state.pendingMusicTheme === themeName) {
          startThemeMusic(themeName);
        }
      }).catch(() => {});
      return;
    }

    stopThemeMusic();
    state.musicRequestId += 1;
    const requestId = state.musicRequestId;
    state.pendingMusicTheme = themeName;

    const track = musicTracks[themeName] || musicTracks.default;
    if (track && track.url) {
      const targetVol = track.volume !== undefined ? track.volume : 0.28;
      if (state.ctx && state.musicGain) {
        state.musicGain.gain.cancelScheduledValues(state.ctx.currentTime);
        state.musicGain.gain.setTargetAtTime(targetVol, state.ctx.currentTime, 0.6);
      }
      loadMusicBuffer(track.url).then((buffer) => {
        if (!buffer || !state.ctx) return;
        if (requestId !== state.musicRequestId) return;
        const source = state.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = !!track.loop;
        const gainNode = state.ctx.createGain();
        gainNode.gain.value = 1;
        source.connect(gainNode);
        if (state.musicGain) {
          gainNode.connect(state.musicGain);
        } else {
          gainNode.connect(state.masterGain);
        }
        source.start(0);
        state.currentMusicSource = source;
        state.currentMusicTheme = themeName;
        state.pendingMusicTheme = null;
      }).catch((err) => {
        if (requestId !== state.musicRequestId) return;
        console.warn('Unable to load music track', err);
        state.currentMusicSource = null;
        playProceduralMusic(themeName);
      });
      return;
    }

    playProceduralMusic(themeName);
  }

  function ensureAudioReady(force) {
    if (!state.enabled) return;
    initAudioEngine();
    if (!state.ctx) return;
    if (force) {
      if (state.ctx.state === 'suspended') {
        state.ctx.resume().catch(() => {});
      }
      if (!state.unlocked) {
        state.unlocked = true;
        resumeMusic();
      }
    }
  }

  function resumeMusic() {
    if (!state.enabled) return;
    if (!state.ctx) return;
    if (state.ctx.state === 'suspended') {
      state.ctx.resume().then(() => {
        if (state.pendingMusicTheme) startThemeMusic(state.pendingMusicTheme);
      }).catch(() => {});
      return;
    }
    if (state.pendingMusicTheme) {
      startThemeMusic(state.pendingMusicTheme);
    } else if (state.currentMusicTheme) {
      startThemeMusic(state.currentMusicTheme);
    }
  }

  function pauseMusic() {
    if (!state.ctx) return;
    if (state.ctx.state === 'running') {
      state.ctx.suspend().catch(() => {});
    }
  }

  function toggleAudio() {
    state.enabled = !state.enabled;
    const btn = document.getElementById('audio-btn');
    if (btn) {
      btn.textContent = 'Audio: ' + (state.enabled ? 'on' : 'off');
    }
    if (state.enabled) {
      ensureAudioReady(true);
      resumeMusic();
    } else {
      applyAudioVolume();
      pauseMusic();
    }
  }

  return {
    state,
    sfxPresets,
    musicPresets,
    musicTracks,
    initAudioEngine,
    applyAudioVolume,
    setMasterVolume,
    triggerTone,
    playSfx,
    stopThemeMusic,
    loadMusicBuffer,
    playProceduralMusic,
    startThemeMusic,
    ensureAudioReady,
    resumeMusic,
    pauseMusic,
    toggleAudio,
  };
}
