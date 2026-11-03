(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const questions = window.QUESTIONS;
  const KEY = 'anastasia-club-v1';
  const fresh = () => ({player:0,authors:0,played:[],answers:{},active:null,phase:'question',remaining:60000,draft:'',sound:true,entered:false,warningPlayed:false,screen:'welcome',awardDismissed:false,videoVolume:1});
  let lastTickSecond = null;
  let state = fresh(), running = false, deadline = 0, interval, spinning = false;
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
    $('round-label').textContent=`Сыграно вопросов: ${state.played.length} из ${questions.length}`;
    $('sound').textContent=`Звук: ${state.sound?'вкл.':'выкл.'}`;$('sound').setAttribute('aria-pressed',String(state.sound));
    window.TableScene.render(state.played,state.active);
    $('reset').disabled=spinning;
    if(spinning){$('status-label').textContent='ВОЛЧОК ВРАЩАЕТСЯ';$('status-title').textContent='Внимание на стол.';$('status-copy').textContent='Сейчас волчок выберет конверт с вопросом от коллеги.';$('spin').textContent='Выбираем вопрос…';}
    else if(state.active!==null){$('status-label').textContent='НЕЗАВЕРШЁННЫЙ РАУНД';$('status-title').textContent='Игра была прервана';$('status-copy').textContent=questions.some(q=>q.id===state.active)?`Вы остановились на вопросе № ${state.active}. Можно продолжить с того же места.`:'Вы можете продолжить игру с того места, на котором остановились.';$('spin').textContent='ПРОДОЛЖИТЬ ИГРУ ↗';}
    else if(finished()){$('status-label').textContent='ИГРА ЗАВЕРШЕНА';$('status-title').textContent=state.player>=6?'Браво, Анастасия!':'Спасибо за красивую игру!';$('status-copy').textContent='Этот вечер — для вас. Спасибо за вдохновение, смелые решения и нашу команду. Оставшиеся вопросы можно сыграть — счёт продолжает вестись.';$('spin').textContent='Крутить волчок';}
    else{$('status-label').textContent=state.played.length?'СЛЕДУЮЩИЙ РАУНД':'НАЧИНАЕМ ВЕЧЕР';$('status-title').textContent=state.played.length?'Продолжаем игру.':'Внимание, на столе — вопросы.';$('status-copy').textContent='Крутите волчок — он выберет конверт. Посмотрите вопрос и дайте себе минуту на размышление.';$('spin').textContent='Крутить волчок ↗';}
    $('spin').disabled=spinning || (state.active===null && state.played.length===questions.length);
    if(state.played.length===questions.length && state.active===null){$('status-title').textContent='Все конверты открыты.';$('spin').textContent='Спасибо за игру!';}
  }
  function updateTimer(){const seconds=Math.ceil(state.remaining/1000);$('timer').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;$('timer-progress').style.width=`${state.remaining/600}%`;$('pause').textContent=running?'Пауза':'Продолжить';$('pause').disabled=state.remaining<=0;$('timer-message').textContent=state.remaining<=0?'Время! Зафиксируйте вашу версию или ответьте вслух.':running?'Минута пошла. Можно ответить раньше.':'Таймер на паузе. Можно продолжить или дать ответ.';}
  function stopTimer(){if(running)state.remaining=Math.max(0,deadline-Date.now());running=false;clearInterval(interval);save();updateTimer();}
  function startTimer(){if(state.remaining<=0)return;running=true;lastTickSecond=Math.ceil(state.remaining/1000);deadline=Date.now()+state.remaining;updateTimer();interval=setInterval(()=>{state.remaining=Math.max(0,deadline-Date.now());const second=Math.ceil(state.remaining/1000);if(second!==lastTickSecond){lastTickSecond=second;if(second>0&&state.sound)window.GameSounds.tick(second);}if(state.remaining>0&&state.remaining<=10000&&!state.warningPlayed){state.warningPlayed=true;cue('warning');}if(!state.remaining){running=false;clearInterval(interval);cue('time-up');}updateTimer();save();},200);}
  function startThinking(){cue('minute-start');state.phase='thinking';save();showQuestion();startTimer();$('answer-input').focus();}
  function attachVideoVolume(video,controls){
    const knob=document.createElement('div');knob.className='tv-knob tv-volume';knob.tabIndex=0;knob.setAttribute('role','slider');knob.setAttribute('aria-label','Громкость видеовопроса');knob.setAttribute('aria-valuemin','0');knob.setAttribute('aria-valuemax','100');knob.title='Громкость: тяните вверх или вниз, используйте колёсико или стрелки';
    const value=document.createElement('span');value.className='tv-volume-value';value.setAttribute('aria-hidden','true');
    function sync(){const percent=Math.round((video.muted?0:video.volume)*100);knob.setAttribute('aria-valuenow',String(percent));knob.setAttribute('aria-valuetext',`${percent}%`);knob.style.setProperty('--dial-angle',`${-135+percent*2.7}deg`);value.textContent=`${percent}%`;}
    function setVolume(amount){video.volume=Math.max(0,Math.min(1,amount));video.muted=video.volume===0;state.videoVolume=video.volume;save();sync();}
    const saved=Number(state.videoVolume);video.volume=Number.isFinite(saved)?Math.max(0,Math.min(1,saved)):1;
    let drag=null;
    knob.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();knob.focus();knob.setPointerCapture(event.pointerId);drag={y:event.clientY,volume:video.muted?0:video.volume};});
    knob.addEventListener('pointermove',event=>{if(drag)setVolume(drag.volume+(drag.y-event.clientY)/120);});
    const release=()=>{drag=null;};knob.addEventListener('pointerup',release);knob.addEventListener('pointercancel',release);knob.addEventListener('lostpointercapture',release);
    knob.addEventListener('wheel',event=>{event.preventDefault();setVolume((video.muted?0:video.volume)+(event.deltaY<0?.05:-.05));},{passive:false});
    knob.addEventListener('keydown',event=>{let next=video.muted?0:video.volume;if(['ArrowUp','ArrowRight'].includes(event.key))next+=.05;else if(['ArrowDown','ArrowLeft'].includes(event.key))next-=.05;else if(event.key==='Home')next=0;else if(event.key==='End')next=1;else return;event.preventDefault();setVolume(next);});
    video.addEventListener('volumechange',()=>{state.videoVolume=video.muted?0:video.volume;save();sync();});controls.prepend(knob,value);sync();
  }
  function showQuestion(){
    const q=questions.find(q=>q.id===state.active);if(!q)return;
    $('question-dialog').classList.toggle('sector-thirteen',q.id===13);
    $('sector13-caption').hidden=q.id!==13;
    $('question-meta').textContent=`КОНВЕРТ ${String(q.id).padStart(2,'0')} · ${q.author}${finished()?' · ПРОДОЛЖЕНИЕ ИГРЫ':''}`;
    $('question-dialog').classList.toggle('has-video',state.phase==='question'&&Boolean(q.video));$('question-heading').textContent=q.id===13?'Тринадцатый сектор':q.title;$('question-stage').replaceChildren();
    $('timer-area').hidden=state.phase!=='thinking';$('answer-area').hidden=state.phase!=='thinking';$('reveal-area').hidden=state.phase!=='reveal';
    if(state.phase==='question'){
      if(q.video){const v=document.createElement('video');v.className='video';v.controls=true;v.playsInline=true;v.preload=q.id===13?'auto':'metadata';v.autoplay=q.id===13;v.src=q.video;v.addEventListener('play',()=>window.GameSounds.stop());v.addEventListener('ended',startThinking,{once:true});const tv=document.createElement('div');tv.className='television';const screen=document.createElement('div');screen.className='television-screen';screen.append(v);const controls=document.createElement('div');controls.className='television-controls';controls.innerHTML='<span class="tv-knob small" aria-hidden="true"></span><span class="tv-speaker" aria-hidden="true"></span><span class="tv-power" aria-hidden="true"></span>';attachVideoVolume(v,controls);const face=document.createElement('div');face.className='television-face';face.append(screen,controls);const badge=document.createElement('div');badge.className='television-badge';badge.textContent='ИНТЕЛЛЕКТУАЛЬНЫЙ КЛУБ · ВИДЕОВОПРОС';tv.append(face,badge);$('question-stage').append(tv);const note=document.createElement('p');note.className='muted';note.textContent='Посмотрите видео. После его окончания минута начнётся автоматически.';$('question-stage').append(note);v.addEventListener('error',()=>{note.className='error';note.textContent='Видео не загрузилось. Проверьте файл. Можно прочитать текст вопроса ниже и запустить минуту вручную.';});}
      const box=document.createElement('div');box.className='demo-question';const label=document.createElement('span');label.className='eyebrow';label.textContent=q.video?'ТЕКСТ ВОПРОСА':'ТЕКСТ ВОПРОСА · ВИДЕО СКОРО';const p=document.createElement('p');p.textContent=q.text||'Вопрос прозвучит в видео. После просмотра начнётся минута на обсуждение.';const b=document.createElement('button');b.className='primary';b.textContent='Начать минуту →';b.onclick=()=>{const v=$('question-stage').querySelector('video');if(v)v.pause();startThinking();};if(q.id===13){const details=document.createElement('details');details.className='question-transcript';const summary=document.createElement('summary');summary.textContent='Текст вопроса';details.append(summary,p);box.append(details,b);}else box.append(label,p,b);$('question-stage').append(box);
    }
    if(state.phase==='thinking'){const p=document.createElement('p');p.className='muted';p.textContent=q.text||'Обсудите вопрос, который прозвучал в видео.';if(q.id===13){const details=document.createElement('details');details.className='question-transcript';const summary=document.createElement('summary');summary.textContent='Текст вопроса';details.append(summary,p);$('question-stage').append(details);}else $('question-stage').append(p);$('answer-input').value=state.draft;updateTimer();}
    if(state.phase==='reveal'){$('correct-answer').textContent=q.answer;$('explanation').textContent=q.explanation;$('accepted-answer').hidden=!q.accepted;$('accepted-answer').textContent=q.accepted?`Также засчитывается: ${q.accepted}`:'';$('your-answer').textContent=state.draft?`Ваша версия: ${state.draft}`:'Вы ответили вслух.';$('correct').textContent=finished()?'Верно · следующий вопрос':'Да, я ответила правильно';$('incorrect').textContent=finished()?'Неверно · следующий вопрос':'В этот раз ошиблась';}
    if(!$('question-dialog').open){$('question-dialog').showModal();if(!matchMedia('(prefers-reduced-motion: reduce)').matches)$('question-dialog').animate([{opacity:0,transform:'perspective(1000px) rotateX(-6deg) scale(.96)'},{opacity:1,transform:'perspective(1000px) rotateX(0deg) scale(1)'}],{duration:400,easing:'cubic-bezier(.2,.65,.3,1)'});window.TableScene.finishOpening();}
    if(q.id===13&&state.phase==='question'){
      const video=$('question-stage').querySelector('video');
      if(video)video.play().catch(()=>{
        const note=$('question-stage').querySelector('.television + .muted');
        if(note)note.textContent='Нажмите ▶ на телевизоре, чтобы запустить 13-й сектор. После видеовопроса минута начнётся автоматически.';
      });
    }
  }
  function reveal(){cue('reveal');stopTimer();state.draft=$('answer-input').value.trim();state.phase='reveal';save();showQuestion();}
  function grade(correct){if(state.active===null||state.phase!=='reveal')return;const id=state.active;const exhibition=finished();state.answers[id]={answer:state.draft,correct,exhibition};if(correct)state.player++;else state.authors++;if(exhibition||!finished())cue(correct?'correct':'incorrect');state.played.push(id);state.active=null;state.phase='question';state.remaining=60000;state.draft='';$('question-dialog').close();save();render();if(!exhibition&&finished())showAward();}
  $('spin').onclick=async()=>{
    if(spinning)return;
    if(state.active!==null){window.GameSounds.unlock();if(state.active===13)window.GameSounds.stop();else cue('question');showQuestion();return;}
    const available=questions.filter(q=>!state.played.includes(q.id));if(!available.length)return;
    const q=available[Math.floor(Math.random()*available.length)];
    spinning=true;state.active=q.id;state.phase='question';state.remaining=60000;state.warningPlayed=false;state.draft='';save();
    window.GameSounds.unlock();cue('spin');
    const animation=window.TableScene.spinTo(q.id);render();
    $('status-label').textContent='ВОЛЧОК ВРАЩАЕТСЯ';$('status-title').textContent='Внимание на стол.';$('status-copy').textContent='Сейчас волчок выберет конверт с вопросом от коллеги.';$('spin').textContent='Выбираем вопрос…';
    try{await animation;}catch(error){console.warn('Envelope animation unavailable',error);}finally{spinning=false;render();}
    if(state.active===13)window.GameSounds.stop();else cue('question');showQuestion();
  };
  $('intro-music').onclick=async()=>{if($('intro-music').getAttribute('aria-pressed')==='true'){window.GameSounds.pause();$('intro-music').textContent='♫ Продолжить музыку начала игры';$('intro-music').setAttribute('aria-pressed','false');return;}state.sound=true;save();render();$('intro-music').textContent='♫ Запускаем музыку…';const played=await (window.GameSounds.pausedName()==='intro'?window.GameSounds.resume():cue('intro'));$('intro-music').textContent=played?'♫ Музыка начала игры · остановить':'♫ Включить музыку начала игры';$('intro-music').setAttribute('aria-pressed',String(played));};
  document.addEventListener('game-audio-error',()=>{$('audio-notice').hidden=false;});
  document.addEventListener('game-audio-playing',()=>{$('audio-notice').hidden=true;});
  function isWelcome(){return !state.entered&&state.screen!=='mechanics';}
  function startWelcomeMusic(){
    if(!state.sound||!isWelcome()||window.GameSounds.hasStarted()||window.GameSounds.hasPaused())return;
    cue('intro');
  }
  document.addEventListener('game-audio-playing',event=>{
    if(event.detail==='intro'){$('intro-music').setAttribute('aria-pressed','true');$('intro-music').textContent='♫ Музыка начала игры · остановить';}
  });
  document.addEventListener('click',event=>{
    if(!state.sound)return;
    window.GameSounds.unlock();
    if(!event.target.closest('button,a,input,textarea,select,summary'))startWelcomeMusic();
  },{capture:true});
  document.addEventListener('keydown',event=>{
    if(!event.repeat&&!event.target.closest('button,a,input,textarea,select,summary'))startWelcomeMusic();
  });
  $('enter-game').onclick=()=>{cue('rules');state.screen='mechanics';save();render();window.scrollTo(0,0);$('mechanics-title').focus({preventScroll:true});};
  $('start-game').onclick=()=>{state.entered=true;save();render();window.scrollTo(0,0);$('table-heading').focus({preventScroll:true});$('spin').click();};
  $('pause').onclick=()=>{window.GameSounds.stop();running?stopTimer():startTimer();};$('reveal').onclick=reveal;$('oral').onclick=reveal;
  $('answer-input').oninput=()=>{state.draft=$('answer-input').value;save();};
  $('correct').onclick=()=>grade(true);$('incorrect').onclick=()=>grade(false);
  $('close-dialog').onclick=()=>{$('question-dialog').close();};
  $('question-dialog').addEventListener('close',()=>{if(state.active!==null)window.GameSounds.stop();stopTimer();const v=$('question-stage').querySelector('video');if(v)v.pause();render();});
  $('sound').onclick=async()=>{
    state.sound=!state.sound;save();render();
    if(state.sound){
      let played=false;
      if(window.GameSounds.hasPaused())played=await window.GameSounds.resume();
      else if(!window.GameSounds.hasStarted()||(!state.entered&&state.screen==='mechanics'))played=await cue(!state.entered&&!state.played.length&&state.active===null?(state.screen==='mechanics'?'rules':'intro'):'minute-start');
      if(!state.entered&&state.screen!=='mechanics'){$('intro-music').setAttribute('aria-pressed',String(played));$('intro-music').textContent=played?'♫ Музыка начала игры · остановить':'♫ Включить музыку начала игры';}
    }else{window.GameSounds.pause();$('intro-music').textContent='♫ Продолжить музыку начала игры';$('intro-music').setAttribute('aria-pressed','false');}
  };
  $('reset').onclick=()=>$('reset-dialog').showModal();$('cancel-reset').onclick=()=>$('reset-dialog').close();
  $('confirm-reset').onclick=()=>{window.GameSounds.stop();stopTimer();state=fresh();window.TableScene.reset();save();render();$('reset-dialog').close();window.scrollTo(0,0);$('enter-game').focus({preventScroll:true});startWelcomeMusic();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&running)stopTimer();});
  window.addEventListener('resize',render);window.addEventListener('beforeunload',()=>{if(running)state.remaining=Math.max(0,deadline-Date.now());save();});
  function showAward(){if(!finished()||state.awardDismissed)return;const dialog=$('award-dialog');if(!dialog.open){dialog.showModal();dialog.scrollTop=0;$('award-music').hidden=!state.sound;$('award-title').focus({preventScroll:true});cue('victory');}}
  document.addEventListener('game-audio-playing',event=>{if(event.detail==='victory')$('award-music').hidden=true;});
  $('award-music').onclick=async()=>{state.sound=true;save();render();await cue('victory');};
  $('award-return').onclick=()=>{$('award-dialog').close();$('spin').focus({preventScroll:true});};
  $('award-dialog').addEventListener('close',()=>{state.awardDismissed=true;save();});
  render();
  if(finished()&&!state.awardDismissed)showAward();
  else startWelcomeMusic();
})();
