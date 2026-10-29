// Муроблоки — самостоятельная реализация головоломки с фигурами на поле 10×10.
// Без сторонних библиотек, запросов к API и аналитики.
const SIZE = 10;
const KEY = 'muroblocks-save-v1';
const COLORS = ['#d98f9a','#a6bca0','#e6b36c','#9daccf','#c3a5cd','#de9b80','#91bdbe'];
const SHAPES = [
  [[0,0]], [[0,0],[1,0]], [[0,0],[0,1]],
  [[0,0],[1,0],[2,0]], [[0,0],[0,1],[0,2]],
  [[0,0],[1,0],[2,0],[3,0]], [[0,0],[0,1],[0,2],[0,3]],
  [[0,0],[1,0],[2,0],[3,0],[4,0]], [[0,0],[0,1],[0,2],[0,3],[0,4]],
  [[0,0],[1,0],[0,1],[1,1]],
  [[0,0],[1,0],[2,0],[0,1]], [[0,0],[1,0],[2,0],[2,1]],
  [[0,0],[0,1],[0,2],[1,2]], [[1,0],[1,1],[0,2],[1,2]],
  [[0,0],[1,0],[1,1]], [[0,0],[0,1],[1,1]], [[1,0],[0,1],[1,1]],
  [[0,0],[1,0],[2,0],[1,1]], [[1,0],[0,1],[1,1],[1,2]],
  [[0,0],[1,0],[1,1],[2,1]], [[1,0],[2,0],[0,1],[1,1]],
  [[1,0],[0,1],[1,1],[2,1],[1,2]],
  [[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]]
].map((cells,id)=>({id,cells,w:Math.max(...cells.map(([x])=>x))+1,h:Math.max(...cells.map(([,y])=>y))+1}));
const $ = s => document.querySelector(s);
const boardEl=$('#board'), trayEl=$('#tray'), statusEl=$('#status'), ghostEl=$('#drag-ghost');
const dialogs={help:$('#help-modal'),over:$('#gameover-modal'),restart:$('#restart-modal')};
let state;
let selected=null,preview=null, drag=null, gameOverShown=false;
function randomPiece(){return {id:Math.floor(Math.random()*SHAPES.length),color:COLORS[Math.floor(Math.random()*COLORS.length)]};}
function newPieces(){return Array.from({length:3},randomPiece)}
function initialState(best=0){return {board:Array(SIZE*SIZE).fill(null),pieces:newPieces(),score:0,best,stars:0,moves:0,over:false};}
function load(){try{const raw=JSON.parse(localStorage.getItem(KEY));if(raw && Array.isArray(raw.board) && raw.board.length===100 && Array.isArray(raw.pieces) && raw.pieces.length===3 && raw.board.every(x=>x===null||COLORS.includes(x)) && raw.pieces.every(x=>x===null||(Number.isInteger(x.id)&&x.id>=0&&x.id<SHAPES.length&&COLORS.includes(x.color))) && Number.isFinite(raw.score)&&Number.isFinite(raw.best))return {...initialState(),...raw};}catch{}return initialState();}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch{statusEl.textContent='Не удалось сохранить партию';}}
function valid(piece,col,row,board=state.board){if(!piece)return false;return SHAPES[piece.id].cells.every(([dx,dy])=>{let x=col+dx,y=row+dy;return x>=0&&x<SIZE&&y>=0&&y<SIZE&&board[y*SIZE+x]===null;});}
function anyFit(piece,board=state.board){if(!piece)return false;let s=SHAPES[piece.id];for(let y=0;y<=SIZE-s.h;y++)for(let x=0;x<=SIZE-s.w;x++)if(valid(piece,x,y,board))return true;return false;}
function gameStuck(){return state.pieces.every(p=>!anyFit(p));}
function renderBoard(){const frag=document.createDocumentFragment();for(let i=0;i<100;i++){const cell=document.createElement('div');cell.className='cell';cell.setAttribute('role','gridcell');cell.setAttribute('aria-label',`Строка ${Math.floor(i/10)+1}, столбец ${i%10+1}: ${state.board[i]?'занято':'свободно'}`);if(state.board[i]){cell.classList.add('filled');cell.style.setProperty('--tile-color',state.board[i]);}frag.append(cell);}boardEl.replaceChildren(frag);drawPreview();}
function mini(piece,klass='mini-piece',size=16){const shape=SHAPES[piece.id],outer=document.createElement('div');outer.className=klass;outer.style.setProperty('--cols',shape.w);outer.style.setProperty('--rows',shape.h);outer.style.setProperty('--tile-size',`${size}px`);outer.style.setProperty('--tile-color',piece.color);for(let y=0;y<shape.h;y++)for(let x=0;x<shape.w;x++){const cell=document.createElement('div');cell.className='mini-cell';if(shape.cells.some(([cx,cy])=>cx===x&&cy===y))cell.classList.add('on');outer.append(cell);}return outer;}
function renderTray(){trayEl.replaceChildren();const size=Math.max(11,Math.min(18,Math.floor((trayEl.clientWidth/3-29)/5)));state.pieces.forEach((piece,i)=>{const btn=document.createElement('button');btn.type='button';btn.className='piece-slot'+(piece===null?' used':'')+(selected===i?' selected':'')+(piece&&!anyFit(piece)?' blocked':'');btn.dataset.index=i;btn.disabled=!piece;btn.setAttribute('aria-label',piece?`Фигура ${i+1}, ${SHAPES[piece.id].cells.length} клеток${!anyFit(piece)?', не помещается':''}`:`Фигура ${i+1} уже размещена`);if(piece)btn.append(mini(piece,'mini-piece',size));else{const done=document.createElement('span');done.textContent='♡';done.style.cssText='color:#dbcac4;font-size:24px';btn.append(done);}trayEl.append(btn)});$('#remaining-label').textContent=`Осталось: ${state.pieces.filter(Boolean).length}`;}
function updateStats(){const scoreEl=$('#score');scoreEl.textContent=state.score.toLocaleString('ru');$('#best').textContent=state.best.toLocaleString('ru');$('#stars').textContent=state.stars;}
function render(){renderBoard();renderTray();updateStats();if(state.over){statusEl.textContent='Партия закончена ♡';}else if(selected!==null){statusEl.textContent='Выбери место на поле';}else{statusEl.textContent='Выбери фигурку снизу';}}
function drawPreview(){const cells=boardEl.children;for(let c of cells){c.classList.remove('preview-ok','preview-bad');c.style.removeProperty('--preview-color');}if(!preview||!state.pieces[preview.i])return;const p=state.pieces[preview.i],shape=SHAPES[p.id],ok=valid(p,preview.x,preview.y);for(const [dx,dy]of shape.cells){const x=preview.x+dx,y=preview.y+dy;if(x<0||x>=10||y<0||y>=10)continue;const el=cells[y*10+x];el.classList.add(ok?'preview-ok':'preview-bad');el.style.setProperty('--preview-color',p.color);}}
function coordsFromPointer(clientX,clientY,pieceIndex){const rect=boardEl.getBoundingClientRect();if(clientX<rect.left||clientX>rect.right||clientY<rect.top||clientY>rect.bottom)return null;const piece=state.pieces[pieceIndex];if(!piece)return null;const s=SHAPES[piece.id],x=Math.floor((clientX-rect.left)/rect.width*10)-Math.floor((s.w-1)/2),y=Math.floor((clientY-rect.top)/rect.height*10)-Math.floor((s.h-1)/2);return {x,y,i:pieceIndex};}
function tryPlace(index,x,y){const p=state.pieces[index];if(!valid(p,x,y)){statusEl.textContent='Сюда не помещается 🐾';return false;}for(const [dx,dy]of SHAPES[p.id].cells)state.board[(y+dy)*10+(x+dx)]=p.color;
  const lines=[];for(let r=0;r<10;r++)if(Array.from({length:10},(_,c)=>state.board[r*10+c]).every(Boolean))lines.push(Array.from({length:10},(_,c)=>r*10+c));for(let c=0;c<10;c++)if(Array.from({length:10},(_,r)=>state.board[r*10+c]).every(Boolean))lines.push(Array.from({length:10},(_,r)=>r*10+c));
  const removed=new Set(lines.flat());for(const k of removed)state.board[k]=null;
  state.score+=SHAPES[p.id].cells.length+lines.length*10+(lines.length>1?(lines.length-1)*10:0);state.stars=Math.floor(state.score/100);state.best=Math.max(state.best,state.score);state.moves++;
  state.pieces[index]=null;selected=null;preview=null;if(state.pieces.every(p=>p===null))state.pieces=newPieces();
  state.over=gameStuck();save();render();if(lines.length>0){const scoreEl=$('#score');scoreEl.classList.remove('bump');void scoreEl.offsetWidth;scoreEl.classList.add('bump');statusEl.textContent=lines.length>1?`Вау! ${lines.length} линии сразу ✨`:'Линия! Мур-р-р ✨';}else if(!state.over)statusEl.textContent='Красиво уложено ♡';
  if(state.over)showGameOver();return true;}
function showGameOver(){if(gameOverShown)return;gameOverShown=true;$('#final-score').textContent=state.score.toLocaleString('ru');dialogs.over.showModal();}
function hideDialog(dialog){if(dialog.open)dialog.close();}
function restart(){const best=state.best;state=initialState(best);selected=null;preview=null;gameOverShown=false;save();render();Object.values(dialogs).forEach(hideDialog);}
// Одно нажатие на фигуру выбирает её, второе снимает выделение. Перетаскивание тоже поддерживается.
trayEl.addEventListener('pointerdown',e=>{const btn=e.target.closest('.piece-slot');if(!btn||btn.disabled||state.over)return;const i=Number(btn.dataset.index);drag={i,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY,moved:false,pointerId:e.pointerId};btn.setPointerCapture?.(e.pointerId);});
trayEl.addEventListener('pointermove',e=>{if(!drag||drag.pointerId!==e.pointerId)return;drag.x=e.clientX;drag.y=e.clientY;if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>7)drag.moved=true;if(!drag.moved)return;selected=drag.i;const piece=state.pieces[drag.i],boardWidth=boardEl.getBoundingClientRect().width;const tile=Math.max(12,Math.min(35,(boardWidth-16)/10-3));ghostEl.replaceChildren(mini(piece,'drag-grid',tile));ghostEl.classList.add('visible');ghostEl.style.left=`${e.clientX-(SHAPES[piece.id].w*(tile+3))/2}px`;ghostEl.style.top=`${e.clientY-70}px`;preview=coordsFromPointer(e.clientX,e.clientY,drag.i);drawPreview();});
function endDrag(e){if(!drag||e.pointerId!==drag.pointerId)return;const d=drag;drag=null;ghostEl.classList.remove('visible');preview=null;if(d.moved){const target=coordsFromPointer(e.clientX,e.clientY,d.i);if(target&&tryPlace(d.i,target.x,target.y))return;selected=d.i;}else{selected=selected===d.i?null:d.i;}render();}
trayEl.addEventListener('pointerup',endDrag);trayEl.addEventListener('pointercancel',()=>{drag=null;ghostEl.classList.remove('visible');preview=null;render();});
boardEl.addEventListener('pointermove',e=>{if(selected===null||drag||state.over)return;preview=coordsFromPointer(e.clientX,e.clientY,selected);drawPreview();});
boardEl.addEventListener('pointerleave',()=>{if(!drag){preview=null;drawPreview();}});
boardEl.addEventListener('click',e=>{if(selected===null||state.over)return;const pos=coordsFromPointer(e.clientX,e.clientY,selected);if(pos)tryPlace(selected,pos.x,pos.y);});
$('#help-btn').addEventListener('click',()=>dialogs.help.showModal());$('#restart').addEventListener('click',()=>dialogs.restart.showModal());$('#confirm-restart').addEventListener('click',restart);$('#play-again').addEventListener('click',restart);document.querySelectorAll('.close-modal').forEach(b=>b.addEventListener('click',()=>hideDialog(b.closest('dialog'))));for(let dlg of Object.values(dialogs)){dlg.addEventListener('click',e=>{if(e.target===dlg&&dlg!==dialogs.over)dlg.close();});}
window.addEventListener('resize',()=>renderTray());
state=load();render();if(state.over)showGameOver();
if('serviceWorker' in navigator && (location.protocol==='https:' || ['localhost','127.0.0.1'].includes(location.hostname)))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
