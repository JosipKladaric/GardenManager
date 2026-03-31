/* ============================================================
   optimizer.js — Keyhole Design mode: pick plants, find optimal
   layout inside a selected keyhole bed via simulated annealing.
   ============================================================ */
'use strict';

// ── Designer state ───────────────────────────────────────────
window.designer = {
  active: false,
  targetBed: null,          // keyhole bed object
  targetMode: null,         // 'garden' or 'keyhole'
  quantities: {},           // { plantId: count }
  preview: [],              // [{ plantId, gx, gy }]  — not yet committed
  bestScore: null,
  running: false,
};

// ── Open / close ─────────────────────────────────────────────
window.openDesigner = function(bedId) {
  // bedId === null  → whole-garden mode
  // bedId === <num> → specific keyhole bed
  const isGarden = (bedId === null || bedId === undefined);
  const kh = isGarden ? null : state.keyholeGardens.find(k=>k.id===bedId);
  if(!isGarden && !kh){ showToast('Keyhole bed not found','error'); return; }
  designer.active=true; designer.targetBed=kh; designer.targetMode=isGarden?'garden':'keyhole';
  designer.quantities={}; designer.preview=[]; designer.bestScore=null;
  state.selectedPlantId=null;
  document.getElementById('heatmap-legend').classList.remove('visible');
  _buildDesignerPanel();
  render();
};

window.closeDesigner = function() {
  designer.active=false; designer.targetBed=null; designer.targetMode=null;
  designer.preview=[]; designer.bestScore=null;
  window.extraOverlayRenderer=null;
  _destroyDesignerPanel();
  render();
};

// ── Candidate grid ──────────────────────────────────────────────
function candidatePositions(kh) {
  // Garden-wide mode: uniform grid over entire garden, excluding obstacles
  if(!kh){
    const pts=[], step=0.25;
    for(let gy=step/2; gy<state.gardenH; gy+=step)
      for(let gx=step/2; gx<state.gardenW; gx+=step)
        if(isInGarden(gx,gy) && !isInAnyObstacle(gx,gy)) pts.push({gx,gy});
    return pts;
  }
  // Keyhole-bed mode: radial grid inside one bed, excluding compost + access path
  const {compostR}=khParams(kh);
  const pts=[];
  for(let r=compostR+0.12; r<kh.r-0.08; r+=0.18){
    const circ=2*Math.PI*r;
    const n=Math.max(8, Math.floor(circ/0.20));
    for(let i=0;i<n;i++){
      const a=(i/n)*2*Math.PI;
      const gx=kh.cx+r*Math.cos(a), gy=kh.cy+r*Math.sin(a);
      if(inKeyhole(kh,gx,gy) && !isInAnyObstacle(gx,gy)) pts.push({gx,gy});
    }
  }
  return pts;
}

// Returns true only if all pairs of plants are at least their minimum spacing apart.
function isValidLayout(placements) {
  for(let i=0;i<placements.length;i++){
    const pi=placements[i], di=getPlantDef(pi.plantId);
    for(let j=i+1;j<placements.length;j++){
      const pj=placements[j], dj=getPlantDef(pj.plantId);
      const dx=pi.gx-pj.gx, dy=pi.gy-pj.gy;
      const dist=Math.sqrt(dx*dx+dy*dy);
      // Hard minimum: 40% of combined spacing (same threshold as pairScore's critical zone)
      if(dist<(di.spacing+dj.spacing)/100*0.40) return false;
    }
  }
  return true;
}

// ── Greedy initial placement ─────────────────────────────────
function greedyPlace(plants, candidates, kh) {
  const placed=[];
  const sorted=[...plants].sort((a,b)=>b.spacing-a.spacing);
  const usedIdx=new Set();
  for(const def of sorted){
    let bestS=-Infinity, bestPt=null, bestI=-1;
    for(let i=0;i<candidates.length;i++){
      if(usedIdx.has(i)) continue;
      const {gx,gy}=candidates[i];
      let tooClose=false;
      for(const p of placed){
        const pd=getPlantDef(p.plantId);
        const dx=gx-p.gx, dy=gy-p.gy;
        if(Math.sqrt(dx*dx+dy*dy)<(def.spacing+pd.spacing)/100*0.5){tooClose=true;break;}
      }
      if(tooClose) continue;
      const tmp=[...placed,{plantId:def.id,gx,gy}];
      const s=scoreLayout(tmp,kh);
      if(s>bestS){bestS=s;bestPt={gx,gy};bestI=i;}
    }
    if(bestPt){placed.push({plantId:def.id,...bestPt});usedIdx.add(bestI);}
  }
  return placed;
}

// ── Simulated annealing ──────────────────────────────────────
function anneal(initial, candidates, kh, onProgress) {
  let cur=initial.map(p=>({...p}));
  let curS=scoreLayout(cur,kh);
  let best=cur.map(p=>({...p})), bestS=curS;
  const N=3000; const COOL=0.994; let T=1.5;
  for(let i=0;i<N;i++){
    const next=cur.map(p=>({...p}));
    if(Math.random()<0.5&&next.length>=2){
      // Swap positions of two random plants
      const a=Math.floor(Math.random()*next.length), b=Math.floor(Math.random()*next.length);
      [next[a].gx,next[b].gx]=[next[b].gx,next[a].gx];
      [next[a].gy,next[b].gy]=[next[b].gy,next[a].gy];
    } else {
      // Move one plant to a random candidate
      const a=Math.floor(Math.random()*next.length);
      const c=candidates[Math.floor(Math.random()*candidates.length)];
      next[a]={...next[a],...c};
    }
    const nextS=scoreLayout(next,kh);
    const d=nextS-curS;
    if(d>0||Math.random()<Math.exp(d/T)){cur=next;curS=nextS;}
    if(curS>bestS){best=cur.map(p=>({...p}));bestS=curS;}
    T*=COOL;
    if(i%300===0&&onProgress) onProgress(Math.round(i/N*100));
  }
  return{placements:best,score:bestS};
}

// ── Run optimization (async chunked so UI stays responsive) ──
window.runDesignerOptimization = async function() {
  if(designer.running) return;
  const kh=designer.targetBed; // null for garden-wide
  const plantList=[];
  for(const[id,qty]of Object.entries(designer.quantities)){
    if(qty<1) continue;
    const def=getPlantDef(id);
    if(def) for(let i=0;i<qty;i++) plantList.push(def);
  }
  if(plantList.length===0){showToast('Add at least one plant to design','error');return;}

  designer.running=true;
  _setOptimizeBtn(true);
  _setProgress(5,'Building candidate positions…');

  await tick();
  const candidates=candidatePositions(kh);
  if(candidates.length===0){showToast('No valid positions found','error');designer.running=false;_setOptimizeBtn(false);return;}

  _setProgress(15,'Greedy initial placement…');
  await tick();
  const initial=greedyPlace(plantList,candidates,kh);

  _setProgress(30,'Optimizing with simulated annealing…');
  await tick();

  // Chunked annealing
  let cur=initial.map(p=>({...p}));
  let curS=scoreLayout(cur,kh);
  let best=cur.map(p=>({...p})), bestS=curS;
  const N=5000, COOL=0.9965; let T=1.5;
  const CHUNK=300;

  for(let chunk=0;chunk<N;chunk+=CHUNK){
    for(let i=chunk;i<Math.min(chunk+CHUNK,N);i++){
      const next=cur.map(p=>({...p}));
      if(Math.random()<0.5&&next.length>=2){
        // Swap positions of two random plants
        const a=Math.floor(Math.random()*next.length), b=Math.floor(Math.random()*next.length);
        if(a!==b){
          [next[a].gx,next[b].gx]=[next[b].gx,next[a].gx];
          [next[a].gy,next[b].gy]=[next[b].gy,next[a].gy];
        }
      } else {
        // Move one plant to a random candidate
        const a=Math.floor(Math.random()*next.length);
        const c=candidates[Math.floor(Math.random()*candidates.length)];
        next[a]={...next[a],...c};
      }
      // Reject invalid layouts (overlapping plants) before scoring
      if(!isValidLayout(next)) continue;
      const nextS=scoreLayout(next,kh);
      if(nextS-curS>0||Math.random()<Math.exp((nextS-curS)/T)){cur=next;curS=nextS;}
      if(curS>bestS){best=cur.map(p=>({...p}));bestS=curS;}
      T*=COOL;
    }
    const pct=30+Math.round((chunk/N)*65);
    _setProgress(pct,'Annealing… pass '+(chunk/CHUNK+1)+' of '+(N/CHUNK));
    designer.preview=best.map(p=>({...p,id:-1,dayPlanted:state.currentDay}));
    _setExtraRenderer();
    render();
    await tick();
  }

  designer.preview=best;
  designer.bestScore=bestS;
  designer.running=false;
  _setOptimizeBtn(false);
  _setProgress(100,'Done! Score: '+bestS.toFixed(2));
  _showApplyBtn(true);
  _setExtraRenderer();
  render();
  showToast(`✨ Layout optimized! ${best.length} plants placed (score ${bestS.toFixed(2)})`,'success',3500);
};

window.applyDesignerLayout = function() {
  if(!designer.preview.length) return;
  designer.preview.forEach(p=>{
    state.placedPlants.push({id:state.nextPlantId++,plantId:p.plantId,gx:p.gx,gy:p.gy,dayPlanted:state.currentDay});
  });
  document.getElementById('plant-count').textContent=state.placedPlants.length;
  updateAreaDisplay();
  showToast(`✅ ${designer.preview.length} plants added to garden`,'success');
  closeDesigner();
};

// ── Extra overlay renderer (shows preview plants) ─────────────
function _setExtraRenderer(){
  const kh=designer.targetBed;
  window.extraOverlayRenderer=function(ctx){
    if(!designer.preview.length) return;
    designer.preview.forEach(p=>{
      const def=getPlantDef(p.plantId); if(!def) return;
      const pos=gardenToCanvas(p.gx,p.gy);
      const r=px(def.spacing/100)*0.5;
      ctx.globalAlpha=0.75;
      ctx.beginPath(); ctx.arc(pos.x,pos.y,r,0,Math.PI*2);
      ctx.fillStyle=def.color+'88'; ctx.fill();
      ctx.strokeStyle=def.color+'cc'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.font=`${Math.max(10,clamp(r*0.85,10,32))}px serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='white';
      ctx.fillText(def.icon,pos.x,pos.y);
      ctx.globalAlpha=1;
    });
    // Highlight target: ring around keyhole bed, or a dashed border around the garden
    if(kh){
      const pos=gardenToCanvas(kh.cx,kh.cy);
      const rPx=px(kh.r);
      ctx.beginPath(); ctx.arc(pos.x,pos.y,rPx+4,0,Math.PI*2);
      ctx.strokeStyle='rgba(74,222,128,0.4)'; ctx.lineWidth=3;
      ctx.setLineDash([6,4]); ctx.stroke(); ctx.setLineDash([]);
    } else {
      // Garden-wide: dashed border around entire garden
      const p0=gardenToCanvas(0,0), p1=gardenToCanvas(state.gardenW,state.gardenH);
      ctx.strokeStyle='rgba(34,211,238,0.4)'; ctx.lineWidth=3;
      ctx.setLineDash([8,5]); ctx.strokeRect(p0.x,p0.y,p1.x-p0.x,p1.y-p0.y); ctx.setLineDash([]);
    }
  };
}

// ── Designer panel (DOM) ──────────────────────────────────────
function _buildDesignerPanel(){
  _destroyDesignerPanel();
  const kh=designer.targetBed;
  const isGarden=(designer.targetMode==='garden');
  const title=isGarden?'🧩 Garden Design':'🧩 Keyhole Design';
  const sub=isGarden
    ? `${state.gardenW}×${state.gardenH} m — ${state.obstacles.length} obstacle${state.obstacles.length!==1?'s':''} excluded`
    : `Bed ⋄${(kh.r*2).toFixed(1)} m @ ${kh.cx.toFixed(1)},${kh.cy.toFixed(1)} m`;
  const panel=document.createElement('div');
  panel.id='designer-panel';
  panel.innerHTML=`
    <div class="dp-header">
      <span class="dp-title">${title}</span>
      <span class="dp-subtitle">${sub}</span>
      <button class="dp-close" id="dp-close-btn">✕</button>
    </div>
    <p class="dp-hint">Pick plants and quantities, then click Optimize.</p>
    <div class="dp-plant-grid" id="dp-plant-grid"></div>
    <div class="dp-footer">
      <div class="dp-sel-count"><span id="dp-sel-label">0 plants selected</span></div>
      <button class="dp-optimize-btn" id="dp-optimize-btn">✨ Find Optimal Layout</button>
      <div class="dp-progress-wrap" id="dp-progress-wrap" style="display:none">
        <div class="dp-progress-bar"><div class="dp-progress-fill" id="dp-progress-fill"></div></div>
        <div class="dp-progress-label" id="dp-progress-label">Starting…</div>
      </div>
      <button class="dp-apply-btn" id="dp-apply-btn" style="display:none">✅ Apply to Garden</button>
    </div>`;
  document.getElementById('canvas-area').appendChild(panel);
  document.getElementById('dp-close-btn').addEventListener('click',closeDesigner);
  document.getElementById('dp-optimize-btn').addEventListener('click',runDesignerOptimization);
  document.getElementById('dp-apply-btn').addEventListener('click',applyDesignerLayout);
  _populatePlantGrid();
}

function _populatePlantGrid(){
  const grid=document.getElementById('dp-plant-grid'); if(!grid) return;
  grid.innerHTML='';
  PLANTS.forEach(plant=>{
    const item=document.createElement('div');
    item.className='dp-plant-item'; item.dataset.id=plant.id;
    item.innerHTML=`
      <span class="dp-pi-icon">${plant.icon}</span>
      <span class="dp-pi-name">${plant.name}</span>
      <div class="dp-pi-qty">
        <button class="dp-qty-btn" data-action="dec" data-id="${plant.id}">−</button>
        <span class="dp-qty-val" id="dq-${plant.id}">0</span>
        <button class="dp-qty-btn" data-action="inc" data-id="${plant.id}">+</button>
      </div>`;
    grid.appendChild(item);
  });
  grid.addEventListener('click',e=>{
    const btn=e.target.closest('.dp-qty-btn'); if(!btn) return;
    const id=btn.dataset.id;
    const cur=designer.quantities[id]||0;
    const next=btn.dataset.action==='inc'?cur+1:Math.max(0,cur-1);
    designer.quantities[id]=next;
    const el=document.getElementById(`dq-${id}`); if(el) el.textContent=next;
    const item=grid.querySelector(`.dp-plant-item[data-id="${id}"]`);
    if(item) item.classList.toggle('dp-plant-selected',next>0);
    _updateSelLabel();
  });
}

function _updateSelLabel(){
  const total=Object.values(designer.quantities).reduce((s,v)=>s+v,0);
  const el=document.getElementById('dp-sel-label'); if(el) el.textContent=`${total} plant${total!==1?'s':''} selected`;
}
function _setProgress(pct,label){
  const wrap=document.getElementById('dp-progress-wrap');
  const fill=document.getElementById('dp-progress-fill');
  const lbl=document.getElementById('dp-progress-label');
  if(wrap) wrap.style.display='block';
  if(fill) fill.style.width=pct+'%';
  if(lbl)  lbl.textContent=label;
}
function _setOptimizeBtn(running){
  const btn=document.getElementById('dp-optimize-btn'); if(!btn) return;
  btn.disabled=running; btn.textContent=running?'⏳ Optimizing…':'✨ Find Optimal Layout';
}
function _showApplyBtn(show){
  const btn=document.getElementById('dp-apply-btn'); if(btn) btn.style.display=show?'':'none';
}
function _destroyDesignerPanel(){
  const p=document.getElementById('designer-panel'); if(p) p.remove();
  window.extraOverlayRenderer=null;
}
const tick=()=>new Promise(r=>setTimeout(r,0));
