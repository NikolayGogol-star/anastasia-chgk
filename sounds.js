// Записи из подборки ZvukiPro; полные адреса — sounds-sources.json.
(() => {
  const names = ['rules','intro','spin','question','minute-start','warning','time-up','reveal','correct','incorrect','victory'];
  const data = new Map(names.map(name => [name, fetch(`sound-${name}.mp3?v=instant-rules-v1`).then(r => {
    if (!r.ok) throw new Error('Audio unavailable');
    return r.arrayBuffer();
  }).catch(() => null)]));
  let context, source, generation = 0, currentName=null, offset=0, startedAt=0, paused=null, everStarted=false;
  const buffers = new Map();
  const decoding=new Map();
  function getContext(){if(!context)context=new (window.AudioContext || window.webkitAudioContext)();return context;}
  function prepare(name){
    if(buffers.has(name))return Promise.resolve(buffers.get(name));
    if(!decoding.has(name))decoding.set(name,(async()=>{const ctx=getContext();const bytes=await data.get(name);if(!bytes)throw new Error('Audio unavailable');const buffer=await ctx.decodeAudioData(bytes.slice(0));buffers.set(name,buffer);return buffer;})().catch(error=>{decoding.delete(name);throw error;}));
    return decoding.get(name);
  }
  prepare('rules').catch(()=>{});prepare('intro').catch(()=>{});
  async function unlock() {
    try {
      if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
      await context.resume();
      return context.state === 'running';
    } catch { return false; }
  }
  function stop() {
    paused=null;currentName=null;offset=0;
    generation++;
    if (source) { try { source.stop(); } catch {} source = null; }
  }
  function pause() {
    if(currentName && context) paused={name:currentName,offset:offset+Math.max(0,context.currentTime-startedAt)};
    generation++;
    if(source){try{source.stop();}catch{}source=null;}
  }
  async function resume() {
    if(!paused)return false;
    const saved=paused;
    return play(saved.name,saved.offset);
  }
  async function play(name,from=0) {
    stop();
    const token = generation;
    const ready = await unlock();
    if (token !== generation) return false;
    if (!ready) { document.dispatchEvent(new CustomEvent('game-audio-error')); return false; }
    try {
      await prepare(name);
      if (token !== generation) return false;
      source = context.createBufferSource();
      source.buffer = buffers.get(name);
      const gain = context.createGain();
      source.connect(gain); gain.connect(context.destination);
      const total = Math.min(source.buffer.duration, {intro:180,rules:180,spin:7.4,correct:60,incorrect:60,victory:180}[name] || 15);
      if(from>=total){source=null;return false;}
      const duration=total-from;
      const now = context.currentTime;
      currentName=name;offset=from;startedAt=now;everStarted=true;
      gain.gain.setValueAtTime(.7,now);
      if (duration>2) {
        gain.gain.setValueAtTime(.7,now+duration-.4);
        gain.gain.linearRampToValueAtTime(0,now+duration);
      }
      source.start(0,from,duration);
      document.dispatchEvent(new CustomEvent('game-audio-playing',{detail:name}));
      return true;
    } catch { document.dispatchEvent(new CustomEvent('game-audio-error')); return false; }
  }
  // Короткий механический щелчок; отдельный канал не прерывает сигналы.
  function tick(second) {
    if (!context || context.state !== 'running') return;
    const now=context.currentTime, oscillator=context.createOscillator(), gain=context.createGain();
    oscillator.type='triangle';oscillator.frequency.setValueAtTime(second%2?1100:850,now);
    gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.055,now+.002);
    gain.gain.exponentialRampToValueAtTime(.0001,now+.045);
    oscillator.connect(gain);gain.connect(context.destination);oscillator.start(now);oscillator.stop(now+.05);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
  window.GameSounds = {unlock,play,stop,tick,pause,resume,hasStarted:()=>everStarted,hasPaused:()=>Boolean(paused),pausedName:()=>paused&&paused.name};
})();
