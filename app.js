(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const questions = window.QUESTIONS;
  const KEY = 'anastasia-club-v1';
  const fresh = () => ({player:0,authors:0,played:[],answers:{},active:null,phase:'question',remaining:60000,draft:'',sound:true,entered:false,warningPlayed:false,screen:'welcome'});
  let state = fresh(), running = false, deadline = 0, interval, spinning = false, rotation = 0, audio;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && Array.isArray(saved.played) && Number.isInteger(saved.player) && Number.isInteger(saved.authors) && saved.player>=0 && saved.authors>=0 && saved.played.every(id=>questions.some(q=>q.id===id)) && (saved.active===null || questions.some(q=>q.id===saved.active))) {
      state = {...fresh(),...saved};
      state.remaining = Math.max(0,Math.min(60000,Number(state.remaining)||0));
      if (!['question','thinking','reveal'].includes(state.phase)) state.phase='question';
    }
  } catch {}
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch{$('saved-note').textContent='Браузер не разрешил сохранение прогресса';}}
  function finished(){return state.player>=6 || state.authors>=6;}
  function cue(name){if(state.sound)return window.GameSounds.play(name);return Promise.resolve(false);}
  function render(){
    const entered = state.entered || state.played.length>0 || state.active!==null;
    $('welcome').hidden=entered||state.screen==='mechanics';$('mechanics').hidden=entered||state.screen!=='mechanics';$('game-screen').hidden=!entered;
    $('player-score').textContent=state.player;$('authors-score').textContent=state.authors;
    $('round-label').textContent=`Сыграно ${state.played.length} из ${questions.length}`;
    $('sound').textContent=`Звук: ${state.sound?'вкл.':'выкл.'}`;$('sound').setAttribute('aria-pressed',String(state.sound));
    $('sectors').replaceChildren();
    questions.forEach((q,i)=>{const n=document.createElement('span');n.className='sector-number'+(state.played.includes(q.id)?' played':'')+(state.active===q.id?' selected':'');const angle=i*360/questions.length;n.style.transform=`rotate(${angle}deg) translateY(-${matchMedia('(max-width:900px)').matches?117:143}px) rotate(${-angle}deg)`;n.textContent=state.played.includes(q.id)?'✓':String(q.id).padStart(2,'0');$('sectors').append(n);});
    if(state.active!==null){$('status-label').textContent='ВОПРОС УЖЕ НА СТОЛЕ';$('status-title').textContent='Продолжим мысль?';$('status-copy').textContent='Ваш вопрос сохранён. Вернитесь к нему, когда будете готовы.';$('spin').textContent='Продолжить вопрос ↗';}
    else if(finished()){$('status-label').textContent='ИГРА ЗАВЕРШЕНА';$('status-title').textContent=state.player>=6?'Браво, Анастасия!':'Спасибо за красивую игру!';$('status-copy').textContent='Этот вечер — для вас. Спасибо за вдохновение, смелые решения и нашу команду. Оставшиеся вопросы можно посмотреть вне зачёта.';$('spin').textContent='Открыть оставшийся вопрос ↗';}
    else{$('status-label').textContent=state.played.length?'СЛЕДУЮЩИЙ РАУНД':'НАЧИНАЕМ ВЕЧЕР';$('status-title').textContent=state.played.length?'Продолжаем игру.':'Внимание, на столе — вопросы.';$('status-copy').textContent='Крутите волчок — он выберет конверт. Посмотрите вопрос и дайте себе минуту на размышление.';$('spin').textContent='Крутить волчок ↗';}
    $('spin').disabled=spinning || (state.active===null && state.played.length===questions.length);
    if(state.played.length===questions.length && state.active===null){$('status-title').textContent='Все конверты открыты.';$('spin').textContent='Спасибо за игру!';}
  }
  function updateTimer(){const seconds=Math.ceil(state.remaining/1000);$('timer').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;$('timer-progress').style.width=`${state.remaining/600}%`;$('pause').textContent=running?'Пауза':'Продолжить';$('pause').disabled=state.remaining<=0;$('timer-message').textContent=state.remaining<=0?'Время! Зафиксируйте вашу версию или ответьте вслух.':running?'Минута пошла. Можно ответить раньше.':'Таймер на паузе. Можно продолжить или дать ответ.';}
  function stopTimer(){if(running)state.remaining=Math.max(0,deadline-Date.now());running=false;clearInterval(interval);save();updateTimer();}
  function startTimer(){if(state.remaining<=0)return;running=true;deadline=Date.now()+state.remaining;updateTimer();interval=setInterval(()=>{state.remaining=Math.max(0,deadline-Date.now());if(state.remaining>0&&state.remaining<=10000&&!state.warningPlayed){state.warningPlayed=true;cue('warning');}if(!state.remaining){running=false;clearInterval(interval);cue('time-up');}updateTimer();save();},200);}
  function startThinking(){cue('minute-start');state.phase='thinking';save();showQuestion();startTimer();$('answer-input').focus();}
  function showQuestion(){
    const q=questions.find(q=>q.id===state.active);if(!q)return;
    $('question-meta').textContent=`КОНВЕРТ ${String(q.id).padStart(2,'0')} · ${q.author}${finished()?' · ВНЕ ЗАЧЁТА':''}`;
    $('question-heading').textContent=q.title;$('question-stage').replaceChildren();
    $('timer-area').hidden=state.phase!=='thinking';$('answer-area').hidden=state.phase!=='thinking';$('reveal-area').hidden=state.phase!=='reveal';
    if(state.phase==='question'){
      if(q.video){const v=document.createElement('video');v.className='video';v.controls=true;v.playsInline=true;v.preload='metadata';v.src=q.video;v.addEventListener('play',()=>window.GameSounds.stop());v.addEventListener('ended',startThinking,{once:true});$('question-stage').append(v);const note=document.createElement('p');note.className='muted';note.textContent='Посмотрите видео. После его окончания минута начнётся автоматически.';$('question-stage').append(note);v.addEventListener('error',()=>{note.className='error';note.textContent='Видео не загрузилось. Проверьте файл. Можно прочитать текст вопроса ниже и запустить минуту вручную.';});}
      const box=document.createElement('div');box.className='demo-question';const label=document.createElement('span');label.className='eyebrow';label.textContent=q.video?'ТЕКСТ ВОПРОСА':'ДЕМОНСТРАЦИОННЫЙ ВОПРОС · ВИДЕО СКОРО';const p=document.createElement('p');p.textContent=q.text;const b=document.createElement('button');b.className='primary';b.textContent='Начать минуту →';b.onclick=()=>{const v=$('question-stage').querySelector('video');if(v)v.pause();startThinking();};box.append(label,p,b);$('question-stage').append(box);
    }
    if(state.phase==='thinking'){const p=document.createElement('p');p.className='muted';p.textContent=q.text;$('question-stage').append(p);$('answer-input').value=state.draft;updateTimer();}
    if(state.phase==='reveal'){$('correct-answer').textContent=q.answer;$('explanation').textContent=q.explanation;$('your-answer').textContent=state.draft?`Ваша версия: ${state.draft}`:'Вы ответили вслух.';$('correct').textContent=finished()?'Верно · следующий вопрос':'Да, я ответила правильно';$('incorrect').textContent=finished()?'Неверно · следующий вопрос':'В этот раз ошиблась';}
    if(!$('question-dialog').open)$('question-dialog').showModal();
  }
  function reveal(){cue('reveal');stopTimer();state.draft=$('answer-input').value.trim();state.phase='reveal';save();showQuestion();}
  function grade(correct){if(state.active===null||state.phase!=='reveal')return;const id=state.active;const exhibition=finished();state.answers[id]={answer:state.draft,correct,exhibition};if(!exhibition){if(correct)state.player++;else state.authors++;}cue(!exhibition&&finished()&&state.player>=6?'victory':correct?'correct':'incorrect');state.played.push(id);state.active=null;state.phase='question';state.remaining=60000;state.draft='';$('question-dialog').close();save();render();}
  $('spin').onclick=()=>{if(spinning)return;if(state.active!==null){window.GameSounds.unlock();cue('question');showQuestion();return;}const available=questions.filter(q=>!state.played.includes(q.id));if(!available.length)return;const q=available[Math.floor(Math.random()*available.length)],index=questions.indexOf(q);window.GameSounds.unlock();cue('spin');spinning=true;render();rotation+=360*12+((360-index*360/questions.length-rotation%360)%360+360)%360;$('wheel').style.transform=`rotate(${rotation}deg)`;setTimeout(()=>{state.active=q.id;state.phase='question';state.remaining=60000;state.warningPlayed=false;state.draft='';spinning=false;save();render();cue('question');showQuestion();},matchMedia('(prefers-reduced-motion: reduce)').matches?0:18000);};
  $('intro-music').onclick=async()=>{if($('intro-music').getAttribute('aria-pressed')==='true'){window.GameSounds.stop();$('intro-music').textContent='♫ Включить музыку начала игры';$('intro-music').setAttribute('aria-pressed','false');return;}state.sound=true;save();render();$('intro-music').textContent='♫ Запускаем музыку…';const played=await cue('intro');$('intro-music').textContent=played?'♫ Музыка начала игры · остановить':'♫ Включить музыку начала игры';$('intro-music').setAttribute('aria-pressed',String(played));};
  document.addEventListener('game-audio-error',()=>{$('audio-notice').hidden=false;});
  document.addEventListener('game-audio-playing',()=>{$('audio-notice').hidden=true;});
  document.addEventListener('click',()=>{if(state.sound)window.GameSounds.unlock();},{capture:true});
  $('enter-game').onclick=()=>{state.screen='mechanics';save();render();window.scrollTo(0,0);$('mechanics-title').focus({preventScroll:true});};
  $('start-game').onclick=()=>{state.entered=true;save();render();window.scrollTo(0,0);$('table-heading').focus({preventScroll:true});$('spin').click();};
  $('pause').onclick=()=>{window.GameSounds.stop();running?stopTimer():startTimer();};$('reveal').onclick=reveal;$('oral').onclick=reveal;
  $('answer-input').oninput=()=>{state.draft=$('answer-input').value;save();};
  $('correct').onclick=()=>grade(true);$('incorrect').onclick=()=>grade(false);
  $('close-dialog').onclick=()=>{$('question-dialog').close();};
  $('question-dialog').addEventListener('close',()=>{if(state.active!==null)window.GameSounds.stop();stopTimer();const v=$('question-stage').querySelector('video');if(v)v.pause();render();});
  $('sound').onclick=()=>{state.sound=!state.sound;save();render();if(state.sound)cue(!state.entered&&!state.played.length&&state.active===null?'intro':'minute-start');else {window.GameSounds.stop();$('intro-music').textContent='♫ Включить музыку начала игры';$('intro-music').setAttribute('aria-pressed','false');}};
  $('reset').onclick=()=>$('reset-dialog').showModal();$('cancel-reset').onclick=()=>$('reset-dialog').close();
  $('confirm-reset').onclick=()=>{window.GameSounds.stop();stopTimer();state=fresh();rotation=0;$('wheel').style.transform='rotate(0deg)';save();render();$('reset-dialog').close();window.scrollTo(0,0);$('enter-game').focus({preventScroll:true});};
  document.addEventListener('visibilitychange',()=>{if(document.hidden){window.GameSounds.stop();if(running)stopTimer();}});
  window.addEventListener('resize',render);window.addEventListener('beforeunload',()=>{if(running)state.remaining=Math.max(0,deadline-Date.now());save();});
  render();
})();
