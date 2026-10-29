// Записи из подборки ZvukiPro; полные адреса — sounds-sources.json.
(() => {
  const names = ['intro','spin','question','minute-start','warning','time-up','reveal','correct','incorrect','victory'];
  const data = new Map(names.map(name => [name, fetch(`sound-${name}.mp3`).then(r => {
    if (!r.ok) throw new Error('Audio unavailable');
    return r.arrayBuffer();
  }).catch(() => null)]));
  let context, source, generation = 0;
  const buffers = new Map();
  async function unlock() {
    try {
      if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
      await context.resume();
      return context.state === 'running';
    } catch { return false; }
  }
  function stop() {
    generation++;
    if (source) { try { source.stop(); } catch {} source = null; }
  }
  async function play(name) {
    stop();
    const token = generation;
    const ready = await unlock();
    if (token !== generation) return false;
    if (!ready) { document.dispatchEvent(new CustomEvent('game-audio-error')); return false; }
    try {
      if (!buffers.has(name)) {
        const bytes = await data.get(name);
        if (!bytes) throw new Error('Audio unavailable');
        buffers.set(name, await context.decodeAudioData(bytes.slice(0)));
      }
      if (token !== generation) return false;
      source = context.createBufferSource();
      source.buffer = buffers.get(name);
      const gain = context.createGain();
      source.connect(gain); gain.connect(context.destination);
      const duration = Math.min(source.buffer.duration, {intro:180,spin:18,correct:6,incorrect:5,victory:12}[name] || 15);
      const now = context.currentTime;
      gain.gain.setValueAtTime(.7,now);
      if (duration>2) {
        gain.gain.setValueAtTime(.7,now+duration-.4);
        gain.gain.linearRampToValueAtTime(0,now+duration);
      }
      source.start(0,0,duration);
      document.dispatchEvent(new CustomEvent('game-audio-playing',{detail:name}));
      return true;
    } catch { document.dispatchEvent(new CustomEvent('game-audio-error')); return false; }
  }
  window.GameSounds = {unlock,play,stop};
})();
