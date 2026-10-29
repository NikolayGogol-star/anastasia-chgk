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
  async function liftAndOpen(anchor){
    await new Promise(r=>setTimeout(r,450));
    const paper=anchor.querySelector('.envelope'),rect=paper.getBoundingClientRect();
    const overlay=document.createElement('div');overlay.className='envelope-flight-backdrop';
    const flyer=document.createElement('div');flyer.className='flying-envelope';
    const width=Math.min(350,innerWidth*.72),height=width*.65;
    // Draw at final resolution and animate from a reduced size, never above scale(1).
    flyer.style.cssText=`left:${(innerWidth-width)/2}px;top:${(innerHeight-height)/2}px;width:${width}px;height:${height}px;font-size:${width*.24}px`;
    flyer.append(paper.cloneNode(true));document.body.append(overlay,flyer);
    paper.style.visibility='hidden';
    try{
      requestAnimationFrame(()=>overlay.classList.add('visible'));
      const x=rect.left+rect.width/2-innerWidth/2,y=rect.top+rect.height/2-innerHeight/2;
      await flyer.animate([{transform:`translate(${x}px,${y}px) scale(${rect.width/width},${rect.height/height})`},{transform:'translate(0,0) scale(1)'}],{duration:850,easing:'cubic-bezier(.22,.7,.25,1)',fill:'forwards'}).finished;
      await flyer.animate([{opacity:1},{opacity:0}],{duration:200,fill:'forwards'}).finished;
    }finally{flyer.remove();overlay.remove();paper.style.visibility='';}
  }
  function reset(){if(!busy){setAngle(0);render([],null);}}
  window.TableScene={render,spinTo,reset};
})();
