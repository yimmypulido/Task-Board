"use strict";

const $ = selector => document.querySelector(selector);
const icons = {
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
  moon:'<path d="M20.6 14A9 9 0 0 1 10 3.4 9 9 0 1 0 20.6 14Z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',close:'<path d="m5 5 14 14M19 5 5 19"/>',
  board:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16m6-16v16"/>',
  pendiente:'<circle cx="12" cy="12" r="8"/>',enProceso:'<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor"/>',
  terminada:'<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8 12 3 3 5-6"/>',
  date:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v5m10-5v5M3 11h18"/>',
  disk:'<path d="M4 3h13l3 3v15H4zM8 3v6h8V3M8 21v-7h8v7"/>'
};
function icon(name){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[name]+'</svg>'}
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
const labels={pendiente:'Pendiente',enProceso:'En proceso',terminada:'Terminada'};
const taskKey='wolfboard.tasks.v1', themeKey='wolfboard.theme';
function read(key){try{return localStorage.getItem(key)}catch{return null}}
function write(key,value){try{localStorage.setItem(key,value);return true}catch{$('#save-state').textContent='Almacenamiento no disponible';return false}}
function theme(mode){
  document.documentElement.dataset.theme=mode;
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
}
theme(read(themeKey)==='light'?'light':'dark');
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{theme(b.dataset.mode);write(themeKey,b.dataset.mode)});
function localDate(offset=0){const d=new Date();d.setDate(d.getDate()+offset);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
const seed=[
  ['Diseñar la portada','pendiente','Explorar estilos y referencias para la página principal.',1],
  ['Definir la paleta de colores','pendiente','Elegir los tonos base y los colores de acento.',2],
  ['Crear componentes UI','enProceso','Preparar botones, tarjetas y campos del formulario.',0],
  ['Maquetar la navegación','enProceso','Adaptar el menú a escritorio y móvil.',1],
  ['Organizar el proyecto','terminada','Definir la estructura inicial de archivos.',-1]
].map(([tille,status,description,offset])=>({tille,status,description,date:localDate(offset)}));
function loadTasks(){
  const stored=read(taskKey);
  if(stored===null){write(taskKey,JSON.stringify(seed));return seed}
  try{const list=JSON.parse(stored);return Array.isArray(list)?list.filter(t=>t&&typeof t.tille==='string'&&Object.hasOwn(labels,t.status)&&typeof t.date==='string'&&Number.isFinite(Date.parse(t.date+'T12:00:00'))):[]}catch{return []}
}
let tasks=loadTasks(),editing=null,dragged=null;
const dateFormat=new Intl.DateTimeFormat('es',{day:'2-digit',month:'short'});
function save(message){write(taskKey,JSON.stringify(tasks));render();$('#notice').textContent=message}
function edit(index,status){
  editing=index;const t=tasks[index];
  $('#dialog-title').textContent=t?'Editar tarea':'Nueva tarea';
  $('#task-name').value=t?.tille||'';$('#description').value=t?.description||'';
  $('#status').value=t?.status||status;$('#date').value=t?.date||localDate();
  $('#delete').hidden=!t;$('#editor').showModal();$('#task-name').focus();
}
function card(t,index){
  const el=document.createElement('button');el.className='task';el.draggable=true;el.type='button';
  el.innerHTML='<span class="task-top"><span>TSK-'+String(index+1).padStart(3,'0')+'</span><span class="grip" aria-hidden="true"></span></span><strong></strong><p></p><span class="meta">'+icon('date')+'<time></time></span>';
  el.querySelector('strong').textContent=t.tille;el.querySelector('p').textContent=t.description||'';
  const time=el.querySelector('time');time.dateTime=t.date;time.textContent=dateFormat.format(new Date(t.date+'T12:00:00'));
  el.onclick=()=>edit(index,t.status);
  el.ondragstart=e=>{dragged=index;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(index));el.classList.add('dragging')};
  el.ondragend=()=>{dragged=null;el.classList.remove('dragging');document.querySelectorAll('.over').forEach(c=>c.classList.remove('over'))};
  return el;
}
function render(){
  const board=$('#board');board.replaceChildren();
  $('#total').textContent=tasks.length+(tasks.length===1?' tarea':' tareas');
  for(const [status,label] of Object.entries(labels)){
    const col=document.createElement('section');col.className='column';col.dataset.status=status;col.setAttribute('aria-label',label);
    col.innerHTML='<div class="col-title"><i data-icon>'+icon(status)+'</i><h3>'+label+'</h3><span class="count"></span><button aria-label="Añadir tarea en '+label+'">'+icon('plus')+'</button></div><div class="cards"></div><button class="add">'+icon('plus')+' Añadir tarea</button>';
    const cards=col.querySelector('.cards');
    tasks.forEach((task,i)=>{if(task.status===status)cards.append(card(task,i))});
    col.querySelector('.count').textContent=cards.children.length;
    col.querySelectorAll('.add,.col-title button').forEach(b=>b.onclick=()=>edit(null,status));
    col.ondragover=e=>{if(dragged!==null){e.preventDefault();e.dataTransfer.dropEffect='move';col.classList.add('over')}};
    col.ondragleave=e=>{if(!col.contains(e.relatedTarget))col.classList.remove('over')};
    col.ondrop=e=>{e.preventDefault();if(dragged===null)return;tasks[dragged].status=status;dragged=null;save('Tarea movida a '+label)};
    board.append(col);
  }
}
$('#newTask').onclick=()=>edit(null,'pendiente');$('#close').onclick=()=>$('#editor').close();
$('#form').onsubmit=e=>{
  e.preventDefault();const tille=$('#task-name').value.trim();
  if(!tille){$('#task-name').setCustomValidity('Escribe un título.');$('#task-name').reportValidity();return}
  const t={tille,status:$('#status').value,description:$('#description').value.trim(),date:$('#date').value};
  if(editing===null)tasks.push(t);else tasks[editing]=t;
  $('#editor').close();save('Tarea guardada');
};
$('#task-name').oninput=()=>$('#task-name').setCustomValidity('');
$('#editor').addEventListener('close',()=>$('#task-name').setCustomValidity(''));
$('#delete').onclick=()=>{if(editing!==null&&confirm('¿Eliminar esta tarea?')){tasks.splice(editing,1);$('#editor').close();save('Tarea eliminada')}};
window.addEventListener('storage',e=>{if(e.key===taskKey||e.key===null){$('#editor').close();dragged=null;tasks=loadTasks();render()}if(e.key===themeKey)theme(e.newValue==='light'?'light':'dark')});
render();

// Letras de bloque dibujadas a mano para que el rótulo funcione sin fuentes externas.
const glyphs={W:['10001','10001','10001','10101','10101','11111','01010'],O:['01110','11011','11011','11011','11011','11011','01110'],L:['11000','11000','11000','11000','11000','11000','11111'],F:['11111','11000','11000','11110','11000','11000','11000'],B:['11110','11011','11011','11110','11011','11011','11110'],A:['01110','11011','11011','11111','11011','11011','11011'],R:['11110','11011','11011','11110','11100','11010','11011'],D:['11110','11011','11011','11011','11011','11011','11110']};
let lettering='';
Array.from('WOLFBOARD').forEach((ch,i)=>glyphs[ch].forEach((row,y)=>Array.from(row).forEach((bit,x)=>{if(bit==='1')lettering+='M'+(i*30+x*5)+' '+y*5+'h5v5h-5z'})));
$('#wordmark').innerHTML='<defs><linearGradient id="chrome" x2="0" y2="1"><stop stop-color="#ffffff"/><stop offset=".49" stop-color="#e8d8ff"/><stop offset=".50" stop-color="#bba1dc"/><stop offset="1" stop-color="#e0c6ff"/></linearGradient><path id="letters" d="'+lettering+'"/></defs><g transform="translate(9 0) skewX(-12)"><use href="#letters" transform="translate(1 3)" fill="#744599"/><use href="#letters" fill="url(#chrome)"/></g>';

// El paisaje se pinta una vez por tamaño. Solo los ojos se actualizan al mover el puntero.
const canvas=$('#scene'),ctx=canvas.getContext('2d'),land=document.createElement('canvas');
const sky=land.getContext('2d');let wolfX=0,wolfScale=1,lookX=0,lookY=0,frame=0;
function poly(c,color,points){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill()}
function landscape(){
  const rect=canvas.getBoundingClientRect(),h=144,w=Math.max(1,Math.round(rect.width/rect.height*h));
  land.width=canvas.width=w;land.height=canvas.height=h;
  const gradient=sky.createLinearGradient(0,0,w,h);gradient.addColorStop(0,'#191321');gradient.addColorStop(.45,'#2e1d42');gradient.addColorStop(.78,'#714477');gradient.addColorStop(1,'#30213e');sky.fillStyle=gradient;sky.fillRect(0,0,w,h);
  let rng=709;function rand(){rng=(rng*16807)%2147483647;return rng/2147483647}
  for(let i=0;i<w*.31;i++){const x=rand()*w,y=rand()*115;sky.fillStyle=rand()>.8?'#b494bf':'#755481';sky.fillRect(x|0,y|0,1,1);if(i%23===0){sky.fillRect(x-1,y,3,1);sky.fillRect(x,y-1,1,3)}}
  const mx=w*.84,my=45;
  for(let y=-32;y<=32;y++){const half=Math.floor(Math.sqrt(1024-y*y));if(y>9&&y%6<2)continue;sky.fillStyle=y<0?'#c699c8':'#aa7caf';sky.fillRect(Math.round(mx-half),my+y,half*2,1)}
  for(let layer=0;layer<3;layer++){
    const base=91+layer*13;const peaks=[[0,h],[0,base]];let x=0;
    while(x<w){const length=18+rand()*54,top=base-8-rand()*24;peaks.push([x+length*.5,top],[x+length*.55,top+4],[x+length*.63,top+3],[x+length,base+rand()*8]);x+=length}
    peaks.push([w,h]);poly(sky,['#4f375e','#392a4b','#281e36'][layer],peaks);
  }
  for(let i=0;i<w/4;i++){const x=rand()*w,y=115+rand()*26,s=4+rand()*18;for(let j=0;j<3;j++)poly(sky,'#21192e',[[x,y-s+j*s*.19],[x-s*(.12+j*.05),y-s*.52+j*s*.25],[x+s*(.12+j*.05),y-s*.52+j*s*.25]])}
  sky.fillStyle='#21182d';sky.fillRect(0,132,w,12);sky.strokeStyle='#4f335f';sky.lineWidth=.55;
  for(let x=-w;x<w*2;x+=29){sky.beginPath();sky.moveTo(w*.55+(x-w*.55)*.74,131);sky.lineTo(x,174);sky.stroke()}
  for(const y of [132,135,141])sky.fillRect(0,y,w,1),sky.strokeRect(0,y,w,.2);
  const veil=sky.createLinearGradient(0,0,w*.68,0);veil.addColorStop(0,'#17121edb');veil.addColorStop(1,'#17121e00');sky.fillStyle=veil;sky.fillRect(0,0,w,h);
  wolfScale=w<450?.96:1.11;wolfX=Math.round(w*(w<450?.78:.74));drawWolf();
}
function drawWolf(){
  frame=0;ctx.drawImage(land,0,0);ctx.save();ctx.translate(wolfX,11);ctx.scale(wolfScale,wolfScale);
  // Pares simétricos de planos escalonados forman las orejas y los mechones del lobo.
  function half(color,points){poly(ctx,color,points);poly(ctx,color,points.map(([x,y])=>[-x,y]))}
  half('#151422',[[0,24],[13,23],[24,28],[39,1],[43,0],[44,10],[46,35],[44,47],[52,58],[48,58],[55,69],[48,68],[54,82],[42,77],[46,89],[34,85],[34,94],[27,92],[22,103],[14,108],[7,116],[0,119]]);
  half('#81728f',[[22,30],[39,5],[42,4],[43,36],[40,46],[28,41]]);
  half('#c4b4cb',[[24,31],[39,6],[40,7],[37,19],[33,22],[28,34]]);
  half('#48334e',[[28,34],[39,14],[40,38],[37,42]]);
  half('#a879a0',[[31,34],[37,23],[37,33],[34,31],[36,38]]);
  half('#8e829f',[[0,27],[13,26],[24,31],[31,37],[39,41],[43,50],[50,57],[43,56],[51,66],[42,63],[49,76],[39,71],[41,82],[32,78],[30,87],[18,91],[9,105],[0,111]]);
  half('#b3a7bc',[[0,28],[14,29],[23,35],[27,41],[15,36],[18,41],[9,38],[11,44],[3,40],[0,46]]);
  half('#655c78',[[0,42],[6,46],[9,41],[22,46],[17,42],[30,46],[39,51],[33,51],[44,58],[29,54],[24,58],[11,62],[6,70],[0,69]]);
  half('#4a425f',[[31,46],[40,48],[44,53],[39,52],[46,60],[37,57],[44,66],[33,61],[39,69],[25,65],[18,69],[13,65],[20,57]]);
  half('#c7bacb',[[4,64],[11,58],[21,57],[32,53],[27,58],[35,56],[29,61],[16,63],[9,72],[5,82]]);
  half('#262232',[[7,64],[14,56],[21,55],[28,52],[26,59],[20,63],[13,64],[8,69]]);
  half('#dcc0f6',[[12,60],[17,57],[24,56],[21,60],[16,62],[12,62]]);
  for(const side of [-1,1]){ctx.fillStyle='#32213f';ctx.fillRect(side*18-1+lookX,57+lookY,3,4);ctx.fillStyle='#f3eafb';ctx.fillRect(side*18+lookX,57+lookY,1,1)}
  half('#baadbf',[[10,72],[17,66],[27,63],[22,68],[34,63],[28,70],[41,66],[32,75],[36,74],[28,82],[22,80],[17,87],[11,87],[5,95],[0,91]]);
  half('#797186',[[12,76],[21,72],[18,77],[28,73],[22,80],[27,79],[17,88],[12,88],[8,100],[0,105],[0,86]]);
  half('#dbcfda',[[0,65],[4,66],[7,77],[12,83],[13,88],[9,94],[4,96],[0,94]]);
  half('#a097ac',[[0,61],[4,65],[6,74],[9,80],[5,82],[0,81]]);
  half('#252232',[[0,82],[7,83],[8,86],[4,90],[0,91]]);
  half('#bcb0c3',[[0,97],[5,97],[9,94],[7,101],[0,108]]);
  half('#4a405b',[[18,93],[27,87],[25,94],[18,102],[13,102],[7,111],[0,114],[4,106],[11,100]]);
  ctx.restore();
}
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function aim(e){
  const rect=canvas.getBoundingClientRect(),scale=rect.width/canvas.width;
  lookX=reduced.matches?0:Math.max(-2,Math.min(2,Math.round((e.clientX-rect.left-wolfX*scale)/45)));
  lookY=reduced.matches?0:Math.max(-1,Math.min(1,Math.round((e.clientY-rect.top-(11+59*wolfScale)*scale)/35)));
  if(!frame)frame=requestAnimationFrame(drawWolf);
}
new ResizeObserver(landscape).observe(canvas);window.addEventListener('pointermove',aim,{passive:true});window.addEventListener('pointerdown',aim,{passive:true});
