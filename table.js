(() => {
  'use strict';
  const rotor=document.getElementById('spinner-rotor');
  const stage=document.getElementById('table-stage');
  const sectors=document.getElementById('sectors');
  const questions=window.QUESTIONS;
  const nodes=new Map();
  let angle=0,busy=false;
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  const normalize=x=>((x%360)+360)%360;
  const questionAngle=id=>questions.findIndex(q=>q.id===id)*360/questions.length;
  questions.forEach((q,i)=>{
    const theta=i*2*Math.PI/questions.length;
    const anchor=document.createElement('div');
    anchor.className='envelope-anchor';anchor.dataset.questionId=q.id;
    anchor.style.left=`${50+36.5*Math.sin(theta)}%`;
    anchor.style.top=`${50-36.5*Math.cos(theta)}%`;
    anchor.style.setProperty('--angle',`${i*360/questions.length}deg`);
    const envelope=document.createElement('div');envelope.className='envelope';
    const number=document.createElement('span');number.className='envelope-number';number.textContent=String(q.id).padStart(2,'0');
    const played=document.createElement('span');played.className='envelope-played';played.textContent='✓ СЫГРАН';played.setAttribute('aria-hidden','true');
    envelope.append(number);anchor.append(envelope,played);sectors.append(anchor);nodes.set(q.id,anchor);
  });
  function setAngle(value){angle=value;rotor.style.setProperty('--rotation',`${value}deg`);}
  function render(played,active){
    nodes.forEach((node,id)=>{
      node.classList.toggle('played',played.includes(id));
      node.classList.toggle('selected',!busy&&active===id);
      node.setAttribute('aria-label',`Конверт ${String(id).padStart(2,'0')}${played.includes(id)?', сыгран':active===id?', выбран':''}`);
    });
    if(!busy&&active!=null)setAngle(questionAngle(active));
  }
  // Интеграл скорости: плавный разгон, постоянная скорость, затухание трения.
  function progress(t){
    const a=.18,b=.38,p=2.3,total=a/2+(b-a)+(1-b)/(p+1);
    if(t<a){const x=t/a;return a*(x*x*x-.5*x*x*x*x)/total;}
    if(t<b)return (a/2+t-a)/total;
    const u=(t-b)/(1-b);
    return (a/2+b-a+(1-b)/(p+1)*(1-Math.pow(1-u,p+1)))/total;
  }
  async function spinTo(id){
    if(busy||!nodes.has(id))return false;
    busy=true;stage.classList.add('is-spinning');nodes.forEach(n=>n.classList.remove('selected'));
    const start=angle,target=questionAngle(id);
    const finish=start+360*9+normalize(target-normalize(start));
    if(reduced())setAngle(finish);
    else await new Promise(resolve=>{
      let first;
      const frame=now=>{if(first===undefined)first=now;const t=Math.min(1,(now-first)/7400);setAngle(start+(finish-start)*progress(t));if(t<1)requestAnimationFrame(frame);else resolve();};
      requestAnimationFrame(frame);
    });
    setAngle(normalize(finish));stage.classList.remove('is-spinning');
    const anchor=nodes.get(id);anchor.classList.add('selected');
    document.getElementById('table-announcement').textContent=`Выбран конверт ${String(id).padStart(2,'0')}`;
    try{if(!reduced())await liftAndOpen(anchor);}finally{busy=false;}
    return true;
  }
  let openingLayer=null;
  async function liftAndOpen(anchor){
    await new Promise(r=>setTimeout(r,320));
    const original=anchor.querySelector('.envelope'),rect=original.getBoundingClientRect();
    const id=Number(anchor.dataset.questionId),number=String(id).padStart(2,'0');
    const width=Math.min(390,innerWidth*.76),height=width*.65;
    const sheetWidth=Math.min(760,innerWidth*.9),sheetHeight=Math.min(560,innerHeight*.76);
    const overlay=document.createElement('div');overlay.className='mail-overlay';
    const rig=document.createElement('div');rig.className='mail-rig';rig.setAttribute('aria-hidden','true');
    rig.style.cssText=`width:${width}px;height:${height}px;left:${(innerWidth-width)/2}px;top:${(innerHeight-height)/2+35}px`;
    const back=document.createElement('div');back.className='mail-back';
    const sheet=document.createElement('div');sheet.className='mail-insert';
    sheet.style.cssText=`width:${sheetWidth}px;height:${sheetHeight}px`;
    const heading=document.createElement('span');heading.className='mail-letter-heading';heading.textContent='ЧТО? ГДЕ? КОГДА?';
    const numeral=document.createElement('strong');numeral.className='mail-letter-number';numeral.textContent=number;
    const rule=document.createElement('div');rule.className='mail-letter-lines';
    sheet.append(heading,numeral,rule);
    const pocket=document.createElement('div');pocket.className='mail-pocket';
    const stamp=document.createElement('span');stamp.className='mail-number';stamp.textContent=number;pocket.append(stamp);
    const flap=document.createElement('div');flap.className='mail-flap';
    rig.append(back,sheet,pocket,flap);overlay.append(rig);document.body.append(overlay);
    const paperScale=width*.86/sheetWidth;
    sheet.style.transform=`translateX(-50%) scale(${paperScale})`;
    original.style.visibility='hidden';
    const animate=(node,frames,duration,easing='cubic-bezier(.22,.65,.25,1)')=>node.animate(frames,{duration,easing,fill:'forwards'}).finished;
    try{
      const x=rect.left+rect.width/2-innerWidth/2,y=rect.top+rect.height/2-(innerHeight/2+35);
      const scale=original.offsetWidth/width;
      const rotation=questionAngle(id)>180?questionAngle(id)-360:questionAngle(id);
      const launch=`translate(${x}px,${y}px) rotateX(25deg) rotateZ(${rotation}deg) scale(${scale})`;
      rig.style.transform=launch;
      await Promise.all([
        animate(overlay,[{background:'rgba(3,18,13,0)'},{background:'rgba(3,18,13,.82)'}],650),
        animate(rig,[{transform:launch},{transform:'translate(0,0) rotateX(0deg) rotateZ(0deg) scale(1)'}],900)
      ]);
      await animate(flap,[{transform:'rotateX(0deg)'},{transform:'rotateX(-178deg)'}],650,'cubic-bezier(.3,.15,.3,1)');
      flap.style.zIndex='0';
      await animate(sheet,[{transform:`translate(-50%,0) scale(${paperScale})`},{transform:`translate(-50%,${-height*.88}px) scale(${paperScale})`}],700);
      const sheetRect=sheet.getBoundingClientRect();
      const expanded=sheet.cloneNode(true);expanded.className='mail-expanded';
      expanded.style.cssText=`position:fixed;width:${sheetWidth}px;height:${sheetHeight}px;left:${(innerWidth-sheetWidth)/2}px;top:${(innerHeight-sheetHeight)/2}px;transform-origin:center`;
      overlay.append(expanded);sheet.style.visibility='hidden';
      const dx=sheetRect.left+sheetRect.width/2-innerWidth/2,dy=sheetRect.top+sheetRect.height/2-innerHeight/2;
      const folded=`translate(${dx}px,${dy}px) rotateX(9deg) scale(${paperScale})`;
      expanded.style.transform=folded;
      await Promise.all([
        animate(expanded,[{transform:folded},{transform:'translate(0,0) rotateX(0deg) scale(1)'}],850),
        animate(rig,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(55px)'}],650)
      ]);
      openingLayer=overlay;
    }catch(error){overlay.remove();throw error;}
    finally{original.style.visibility='';}
  }
  function finishOpening(){
    if(!openingLayer)return;
    const layer=openingLayer;openingLayer=null;
    layer.animate([{opacity:1},{opacity:0}],{duration:350,fill:'forwards'}).finished.finally(()=>layer.remove());
  }
  function reset(){if(!busy){setAngle(0);render([],null);}}
  window.TableScene={render,spinTo,reset,finishOpening};
})();
