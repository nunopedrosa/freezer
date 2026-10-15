'use strict';
const KEY='congelador-v1';
const seed=[
 ['Peixes / Mariscos',['Espadarte posta','Dourada grande','Camarão miolo']],
 ['Carnes',['Porco pele','Porco rojões 800g','Pato peitos','Frango peitos','Frango pernas','Perú bifes','Perú perna desossada(1.4Kg)','Novilho escalopes']],
 ['Legumes / Aromáticos',['Mix oriental','Alho Picado','Tomates','Mini crepes','Alho francês','Noisettes','Castanhas','Abóbora cubos']],
 ['Pão / Restos',['Molho massada cherne','Molho caldeirada espad.','Alheira de javali','Bolo de anos cenoura','Pão de alho','Pão de Girassol']],
 ['Gelados / Sobremesas',['Gelado baunilha','“Calippo” tutti-frutti','“Calippo” frutas pomar (Amarelo)']],
 ['Sopas',[]]
];
const halfItems=new Set(['Alho Picado','Tomates','Alho francês','Noisettes','Castanhas','Abóbora cubos']);
const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
const fresh=()=>({title:'Congelador',categories:seed.map(([name,items])=>({id:uid(),name,items:items.map(name=>({id:uid(),name,quantity:0,half:halfItems.has(name)}))}))});
function valid(data){return data&&typeof data.title==='string'&&Array.isArray(data.categories)&&data.categories.length<=40&&data.categories.every(c=>typeof c.id==='string'&&typeof c.name==='string'&&Array.isArray(c.items)&&c.items.length<=200&&c.items.every(i=>typeof i.id==='string'&&typeof i.name==='string'&&typeof i.quantity==='number'&&Number.isFinite(i.quantity)&&i.quantity>=0&&i.quantity<=9.5&&typeof i.half==='boolean'));}
let state;try{const stored=JSON.parse(localStorage.getItem(KEY));state=valid(stored)?stored:fresh()}catch{state=fresh()}
const sections=document.getElementById('sections');sections.className='sections';
const heading=document.getElementById('heading');heading.textContent=state.title;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{notice('Não foi possível guardar neste dispositivo')}}
function notice(s){const el=document.getElementById('status');el.textContent=s;el.classList.add('show');clearTimeout(notice.t);notice.t=setTimeout(()=>el.classList.remove('show'),2200)}
function symbols(item){let out='';if(item.half)out=`<span class="${item.quantity%1?'selected':'unused'}">½</span>`;for(let n=1;n<=9;n++)out+=`<span class="${item.quantity>=n?'selected':'unused'}">${'①②③④⑤⑥⑦⑧⑨'[n-1]}</span>`;return out}
function render(){
 const categoryHTML=(c,ci)=>`<section class="category" data-cat="${esc(c.id)}"><div class="cathead"><span class="catname" contenteditable="true" role="textbox" aria-label="Nome da categoria" spellcheck="false">${esc(c.name)}</span><span class="cattools"><button data-action="up" title="Mover categoria" ${ci===0?'disabled':''}>↑</button><button data-action="down" title="Mover categoria" ${ci===state.categories.length-1?'disabled':''}>↓</button><button data-action="removeCat" title="Apagar categoria">×</button></span></div>${c.items.map(i=>`<div class="item" data-item="${esc(i.id)}"><span class="name" contenteditable="true" role="textbox" aria-label="Nome do produto" spellcheck="false">${esc(i.name)}</span><span class="quantity" aria-label="Quantidade ${i.quantity}">${symbols(i)}</span><span class="controls"><button data-action="minus" aria-label="Diminuir quantidade">−</button><button data-action="plus" aria-label="Aumentar quantidade">+</button><button data-action="half" title="Alternar incrementos de meia unidade" aria-label="Alternar meia unidade">${i.half?'½':'1'}</button><button class="delete" data-action="remove" title="Apagar produto" aria-label="Apagar produto">×</button></span></div>`).join('')}<button class="additem" data-action="add">+ Produto</button></section>`;
 // Each row contains a left/right pair. Its height is determined by the taller category.
 // Thus separators of both columns always line up, even after editing either side.
 sections.innerHTML=Array.from({length:Math.ceil(state.categories.length/2)},(_,row)=>`<div class="section-pair">${state.categories.slice(row*2,row*2+2).map((c,k)=>categoryHTML(c,row*2+k)).join('')}<div class="pair-placeholder" aria-hidden="true"></div></div>`).join('');
 save();requestAnimationFrame(checkPrintFit);
}
function checkPrintFit(){
 const warning=document.getElementById('pageWarning');
 // A4 content area: 297mm minus 24mm vertical padding. Approximate screen pixels at 96dpi.
 const mmToPx=96/25.4,available=273*mmToPx;
 const content=document.querySelector('.sheet');
 warning.hidden=content.scrollHeight<=available+2;
}
sections.addEventListener('click',e=>{const btn=e.target.closest('button');if(!btn)return;const catEl=btn.closest('[data-cat]');const cat=state.categories.find(c=>c.id===catEl.dataset.cat);const itemEl=btn.closest('[data-item]');const item=itemEl&&cat.items.find(i=>i.id===itemEl.dataset.item);switch(btn.dataset.action){case'plus':item.quantity=Math.min(item.half?9.5:9,+(item.quantity+(item.half?.5:1)).toFixed(1));break;case'minus':item.quantity=Math.max(0,+(item.quantity-(item.half?.5:1)).toFixed(1));break;case'half':item.half=!item.half;if(!item.half)item.quantity=Math.floor(item.quantity);break;case'remove':if(!confirm('Apagar este produto?'))return;cat.items=cat.items.filter(i=>i.id!==item.id);break;case'add':cat.items.push({id:uid(),name:'Novo produto',quantity:0,half:false});break;case'removeCat':if(!confirm('Apagar esta categoria e todos os produtos?'))return;state.categories=state.categories.filter(c=>c.id!==cat.id);break;case'up':case'down':{const index=state.categories.indexOf(cat),other=index+(btn.dataset.action==='up'?-1:1);[state.categories[index],state.categories[other]]=[state.categories[other],state.categories[index]];break;}default:return}render();if(btn.dataset.action==='add'){const el=sections.querySelector(`[data-cat="${cat.id}"] .item:last-of-type .name`);el?.focus();}});
sections.addEventListener('focusout',e=>{const el=e.target;if(!el.matches('.name,.catname'))return;const cat=state.categories.find(c=>c.id===el.closest('[data-cat]').dataset.cat);const value=el.textContent.trim().slice(0,180);if(el.matches('.catname'))cat.name=value||'Categoria';else cat.items.find(i=>i.id===el.closest('[data-item]').dataset.item).name=value||'Produto';save()});
sections.addEventListener('keydown',e=>{if(e.target.isContentEditable&&e.key==='Enter'){e.preventDefault();e.target.blur()}});
heading.addEventListener('blur',()=>{state.title=heading.textContent.trim().slice(0,80)||'Congelador';heading.textContent=state.title;save()});heading.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();heading.blur()}});
document.getElementById('addCategory').onclick=()=>{state.categories.push({id:uid(),name:'Nova categoria',items:[]});render()};
document.getElementById('print').onclick=()=>{document.activeElement?.blur();window.print()};
document.getElementById('export').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='congelador-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
document.getElementById('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!valid(data))throw Error('Formato inválido');if(confirm('Substituir a lista atual pelos dados importados?')){state=data;heading.textContent=state.title;render();notice('Lista importada')}}catch(err){alert('Erro ao importar: '+err.message)}e.target.value=''};
window.addEventListener('resize',checkPrintFit);render();

// Select on focus and again after the first click, whose default action places a caret.
let newlyFocusedEditor=null;
const editorSelector='.name,.catname,#heading';
function selectEditorText(el){
 const range=document.createRange();range.selectNodeContents(el);
 const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
}
document.addEventListener('pointerdown',e=>{
 if(e.target.closest(editorSelector)===document.activeElement)newlyFocusedEditor=null;
});
document.addEventListener('focusin',e=>{
 if(!e.target.matches(editorSelector))return;
 newlyFocusedEditor=e.target;selectEditorText(e.target);
});
document.addEventListener('click',e=>{
 const editor=e.target.closest(editorSelector);
 if(editor&&editor===newlyFocusedEditor){selectEditorText(editor);newlyFocusedEditor=null}
});

const checkUpdateButton=document.getElementById('checkUpdate');
const updateButton=document.getElementById('updateApp');
let appRegistration=null,applyingUpdate=false;
function showUpdate(){
 updateButton.hidden=!appRegistration?.waiting;
}
function watchUpdate(worker){
 if(!worker)return;
 worker.addEventListener('statechange',()=>{
  if(worker.state==='installed'){
   showUpdate();
   if(appRegistration.waiting)notice('Atualização disponível. Toque em Atualizar.');
  }
 });
}
async function checkForUpdate(manual=false){
 if(!appRegistration||checkUpdateButton.disabled)return;
 checkUpdateButton.disabled=true;
 try{
  await appRegistration.update();showUpdate();
  if(manual&&!appRegistration.waiting)notice(appRegistration.installing?'A descarregar atualização…':'A aplicação está atualizada.');
 }catch{
  if(manual)notice('Não foi possível verificar. Confirme a ligação à Internet.');
 }finally{checkUpdateButton.disabled=false}
}
checkUpdateButton.onclick=()=>checkForUpdate(true);
updateButton.onclick=()=>{
 const worker=appRegistration?.waiting;
 if(!worker){showUpdate();return}
 document.activeElement?.blur();save();
 applyingUpdate=true;updateButton.disabled=true;updateButton.textContent='A atualizar…';
 worker.postMessage({type:'SKIP_WAITING'});
};
if('serviceWorker'in navigator){
 navigator.serviceWorker.addEventListener('controllerchange',()=>{
  if(applyingUpdate){applyingUpdate=false;window.location.reload()}
  else showUpdate();
 });
 window.addEventListener('load',async()=>{
  try{
   appRegistration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
   checkUpdateButton.hidden=false;showUpdate();
   appRegistration.addEventListener('updatefound',()=>watchUpdate(appRegistration.installing));
   watchUpdate(appRegistration.installing);
   await checkForUpdate();
  }catch{notice('Não foi possível preparar as atualizações. Tente reabrir a aplicação com Internet.')}
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkForUpdate()});
 window.addEventListener('online',()=>checkForUpdate());
}
