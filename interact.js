/* ============================================================
   interact.js — canvas events, keyhole placement, plant ops,
                 zoom, dimensions, context menu, keyboard
   ============================================================ */
'use strict';

// ── Helpers  ─────────────────────────────────────────────────
window.getPlantAtCanvas = function(cx,cy) {
  for(let i=state.placedPlants.length-1;i>=0;i--){
    const pp=state.placedPlants[i];
    const def=getPlantDef(pp.plantId); if(!def) continue;
    const days=Math.max(0,state.currentDay-pp.dayPlanted);
    const scale=getPlantScale(def,days);
    const pos=gardenToCanvas(pp.gx,pp.gy);
    const r=px(def.spacing/100)*0.5*Math.max(scale,0.15);
    const dx=cx-pos.x, dy=cy-pos.y;
    if(dx*dx+dy*dy<=r*r) return pp;
  }
  return null;
};
window.getKeyholeAtCanvas = function(cx,cy) {
  for(let i=state.keyholeGardens.length-1;i>=0;i--){
    const kh=state.keyholeGardens[i];
    const pos=gardenToCanvas(kh.cx,kh.cy);
    const dx=cx-pos.x, dy=cy-pos.y;
    if(Math.sqrt(dx*dx+dy*dy)<=px(kh.r)) return kh;
  }
  return null;
};

// ── Plant placement ──────────────────────────────────────────
window.placePlant = function(gx,gy) {
  if(!state.selectedPlantId) return;
  if(!isInGarden(gx,gy)){showToast('❌ Outside garden bounds','error',1500);return;}
  const def=getPlantDef(state.selectedPlantId);
  state.placedPlants.push({id:state.nextPlantId++,plantId:state.selectedPlantId,gx,gy,dayPlanted:state.currentDay});
  plantCountEl.textContent=state.placedPlants.length;
  showToast(`${def.icon} ${def.name} planted!`,'success');
  render();
};
window.removePlantAt = function(id) {
  const def=getPlantDef(state.placedPlants.find(p=>p.id===id)?.plantId);
  state.placedPlants=state.placedPlants.filter(p=>p.id!==id);
  plantCountEl.textContent=state.placedPlants.length;
  if(def) showToast(`${def.icon} ${def.name} removed`,'info');
  render();
};

// ── Keyhole placement ────────────────────────────────────────
window.addKeyholeBed = function(gx,gy) {
  const r=state.newKeyholeRadius;
  const cx=clamp(gx,r,state.gardenW-r);
  const cy=clamp(gy,r,state.gardenH-r);
  state.keyholeGardens.push({id:state.keyholeNextId++,cx,cy,r});
  updateAreaDisplay(); updateKeyholeList();
  showToast(`🔑 Keyhole bed placed (⌀${(r*2).toFixed(1)} m)`,'success');
  render();
};
window.removeKeyholeBed = function(id) {
  state.keyholeGardens=state.keyholeGardens.filter(k=>k.id!==id);
  updateAreaDisplay(); updateKeyholeList();
  showToast('Keyhole bed removed','info');
  render();
};
window.setAddKeyholeMode = function(on) {
  state.addingKeyhole=on; state.selectedPlantId=null; state.selectedRingId=null;
  document.getElementById('heatmap-legend').classList.remove('visible');
  document.getElementById('no-selection-hint').style.display='';
  document.getElementById('selection-details').style.display='none';
  buildPlantList();
  const btn=document.getElementById('btn-add-keyhole');
  const wrap=document.getElementById('kh-size-wrap');
  if(on){
    btn.classList.add('active-mode'); btn.textContent='✕ Cancel';
    if(wrap) wrap.style.display='flex';
    gardenCanvasEl.style.cursor='cell';
    showToast('🔑 Click in the garden to place a keyhole bed','info',3000);
  } else {
    btn.classList.remove('active-mode'); btn.textContent='🔑 Add Keyhole Bed';
    if(wrap) wrap.style.display='none';
    gardenCanvasEl.style.cursor='crosshair';
    renderOverlay();
  }
};

// ── Obstacle helpers ─────────────────────────────────────────
window.getObstacleAtCanvas = function(cx,cy) {
  const g=canvasToGarden(cx,cy);
  for(let i=state.obstacles.length-1;i>=0;i--){
    const o=state.obstacles[i];
    if(g.gx>=o.x1&&g.gx<=o.x2&&g.gy>=o.y1&&g.gy<=o.y2) return o;
  }
  return null;
};
window.setDrawObstacleMode = function(on) {
  state.drawingObstacle=on; state.obstacleStart=null;
  state.selectedPlantId=null; state.addingKeyhole=false;
  document.getElementById('heatmap-legend').classList.remove('visible');
  document.getElementById('no-selection-hint').style.display='';
  document.getElementById('selection-details').style.display='none';
  buildPlantList();
  // sync keyhole button if it was active
  const khbtn=document.getElementById('btn-add-keyhole');
  const khwrap=document.getElementById('kh-size-wrap');
  if(!on){
    if(khbtn){khbtn.classList.remove('active-mode');khbtn.textContent='🔑 Add Keyhole Bed';}
    if(khwrap) khwrap.style.display='none';
  }
  const btn=document.getElementById('btn-draw-obstacle');
  if(on){
    if(btn){btn.classList.add('active-mode');btn.textContent='✕ Cancel Draw';}
    gardenCanvasEl.style.cursor='crosshair';
    showToast('⛔ Click and drag to draw an obstacle zone. Release to confirm.','info',4000);
  } else {
    if(btn){btn.classList.remove('active-mode');btn.textContent='⛔ Draw Obstacle';}
    gardenCanvasEl.style.cursor='crosshair';
    renderOverlay();
  }
};
window.removeObstacle = function(id) {
  state.obstacles=state.obstacles.filter(o=>o.id!==id);
  // also remove plants that fell inside the now-removed area
  render();
  showToast('Obstacle removed','info');
};

// ── Mouse interaction ─────────────────────────────────────────
let isPanning=false, panStart={};

gardenCanvasEl.addEventListener('mousemove',e=>{
  const rect=gardenCanvasEl.getBoundingClientRect();
  const cx=e.clientX-rect.left, cy=e.clientY-rect.top;
  if(isPanning){state.panX=panStart.panX+(cx-panStart.x);state.panY=panStart.panY+(cy-panStart.y);render();return;}
  cursorGarden=canvasToGarden(cx,cy);

  // Obstacle drag in progress
  if(state.drawingObstacle&&state.obstacleStart){renderOverlay();return;}
  if(state.drawingObstacle){renderOverlay();return;}
  if(state.addingKeyhole){renderOverlay();return;}

  // Hover detection
  const obs=getObstacleAtCanvas(cx,cy);
  const obsId=obs?.id||null;
  if(obsId!==state.hoveredObstacle){state.hoveredObstacle=obsId;render();}

  const kh=getKeyholeAtCanvas(cx,cy);
  if((kh?.id||null)!==state.hoveredKeyhole){state.hoveredKeyhole=kh?.id||null;render();}

  const pp=getPlantAtCanvas(cx,cy);
  if((pp?.id||null)!==state.hovered){state.hovered=pp?.id||null;render();}

  if(pp){
    const def=getPlantDef(pp.plantId);
    const days=Math.max(0,state.currentDay-pp.dayPlanted);
    document.getElementById('tt-name').textContent=`${def.icon} ${def.name}`;
    document.getElementById('tt-info').textContent=`Planted day ${pp.dayPlanted} · ${days}d ago · ${Math.round(getPlantScale(def,days)*100)}% size`;
    document.getElementById('tt-stage').textContent=getPlantStage(def,days).label;
    plantTooltipEl.style.left=(e.clientX+14)+'px'; plantTooltipEl.style.top=(e.clientY-10)+'px';
    plantTooltipEl.classList.add('visible');
  } else {
    plantTooltipEl.classList.remove('visible');
  }
  if(state.selectedPlantId) renderOverlay();
});

gardenCanvasEl.addEventListener('mouseleave',()=>{
  plantTooltipEl.classList.remove('visible'); cursorGarden=null;
  state.hovered=null; state.hoveredKeyhole=null;
  renderOverlay(); render();
});

gardenCanvasEl.addEventListener('mousedown',e=>{
  hideContextMenu();
  if(e.button===1||(e.button===0&&e.altKey)){
    isPanning=true;
    const rect=gardenCanvasEl.getBoundingClientRect();
    panStart={x:e.clientX-rect.left,y:e.clientY-rect.top,panX:state.panX,panY:state.panY};
    gardenCanvasEl.style.cursor='grabbing'; e.preventDefault(); return;
  }
  if(e.button===0){
    const rect=gardenCanvasEl.getBoundingClientRect();
    const cx=e.clientX-rect.left, cy=e.clientY-rect.top;
    const g=canvasToGarden(cx,cy);
    if(state.drawingObstacle){
      state.obstacleStart=g; // begin drag
      return;
    }
    if(state.addingKeyhole){addKeyholeBed(g.gx,g.gy);return;}
    const ex=getPlantAtCanvas(cx,cy);
    if(ex){state.selectedRingId=ex.id;render();return;}
    if(!isInAnyObstacle(g.gx,g.gy)) placePlant(g.gx,g.gy);
    else showToast('⛔ Cannot plant inside an obstacle zone','error',1800);
  }
});
gardenCanvasEl.addEventListener('mouseup',e=>{
  if(isPanning){isPanning=false;gardenCanvasEl.style.cursor=state.drawingObstacle?'crosshair':state.selectedPlantId?'crosshair':'default';return;}
  if(e.button===0&&state.drawingObstacle&&state.obstacleStart&&cursorGarden){
    const obs=normalizeObs(state.obstacleStart, cursorGarden, state.obstacleNextId++);
    if((obs.x2-obs.x1)>0.1&&(obs.y2-obs.y1)>0.1){
      state.obstacles.push(obs);
      // Remove any plants now inside this obstacle
      const removed=state.placedPlants.filter(p=>isInAnyObstacle(p.gx,p.gy));
      state.placedPlants=state.placedPlants.filter(p=>!isInAnyObstacle(p.gx,p.gy));
      plantCountEl.textContent=state.placedPlants.length;
      if(removed.length) showToast(`⛔ Obstacle placed — removed ${removed.length} plant${removed.length!==1?'s':''} in that area`,'info');
      else showToast('⛔ Obstacle zone placed','success');
    }
    state.obstacleStart=null;
    render();
  } else if(e.button===0&&state.drawingObstacle){
    state.obstacleStart=null;
  }
});

gardenCanvasEl.addEventListener('contextmenu',e=>{
  e.preventDefault(); hideContextMenu();
  const rect=gardenCanvasEl.getBoundingClientRect();
  const cx=e.clientX-rect.left, cy=e.clientY-rect.top;
  const pp=getPlantAtCanvas(cx,cy);
  const kh=!pp?getKeyholeAtCanvas(cx,cy):null;
  const obs=(!pp&&!kh)?getObstacleAtCanvas(cx,cy):null;
  if(pp||kh||obs){
    state.contextTarget=pp?{type:'plant',ref:pp}:kh?{type:'keyhole',ref:kh}:{type:'obstacle',ref:obs};
    document.getElementById('ctx-info').style.display=pp?'':'none';
    document.getElementById('ctx-remove-plant').style.display=pp?'':'none';
    document.getElementById('ctx-remove-keyhole').style.display=kh?'':'none';
    document.getElementById('ctx-design-keyhole').style.display=kh?'':'none';
    document.getElementById('ctx-remove-obstacle').style.display=obs?'':'none';
    contextMenuEl.style.left=e.clientX+'px'; contextMenuEl.style.top=e.clientY+'px';
    contextMenuEl.classList.add('visible');
  }
});
gardenCanvasEl.addEventListener('wheel',e=>{
  e.preventDefault();
  const rect=gardenCanvasEl.getBoundingClientRect();
  const cx=e.clientX-rect.left, cy=e.clientY-rect.top;
  const k=(e.deltaY>0?0.9:1.1), nz=clamp(state.zoom*k,0.2,6);
  const f=nz/state.zoom;
  state.panX=cx-f*(cx-state.panX); state.panY=cy-f*(cy-state.panY); state.zoom=nz; render();
},{passive:false});

// Touch pinch-zoom
let _lastTD=0;
overlayCanvasEl.addEventListener('touchstart',e=>{if(e.touches.length===2) _lastTD=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);},{passive:true});
overlayCanvasEl.addEventListener('touchmove',e=>{if(e.touches.length===2){const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);state.zoom=clamp(state.zoom*d/_lastTD,0.2,6);_lastTD=d;render();}},{passive:true});

// ── Context menu actions ─────────────────────────────────────
document.getElementById('ctx-info').addEventListener('click',()=>{
  if(state.contextTarget?.type==='plant'){const pp=state.contextTarget.ref,def=getPlantDef(pp.plantId),days=Math.max(0,state.currentDay-pp.dayPlanted);showToast(`${def.icon} ${def.name} · ${getPlantStage(def,days).label} · ${days}d grown`,'info',3000);}
  hideContextMenu();
});
document.getElementById('ctx-remove-plant').addEventListener('click',()=>{
  if(state.contextTarget?.type==='plant') removePlantAt(state.contextTarget.ref.id);
  hideContextMenu();
});
document.getElementById('ctx-remove-keyhole').addEventListener('click',()=>{
  if(state.contextTarget?.type==='keyhole') removeKeyholeBed(state.contextTarget.ref.id);
  hideContextMenu();
});
document.getElementById('ctx-design-keyhole').addEventListener('click',()=>{
  if(state.contextTarget?.type==='keyhole') openDesigner(state.contextTarget.ref.id);
  hideContextMenu();
});
window.hideContextMenu = function(){ contextMenuEl.classList.remove('visible'); state.contextTarget=null; };
document.addEventListener('click', () => hideContextMenu());

document.getElementById('ctx-remove-obstacle').addEventListener('click',()=>{
  if(state.contextTarget?.type==='obstacle') removeObstacle(state.contextTarget.ref.id);
  hideContextMenu();
});

// ── Zoom buttons ──────────────────────────────────────────────
document.getElementById('btn-zoom-in').addEventListener('click',()=>{
  const cx=gardenCanvasEl.width/2,cy=gardenCanvasEl.height/2,k=1.25;
  state.panX=cx-k*(cx-state.panX);state.panY=cy-k*(cy-state.panY);state.zoom=clamp(state.zoom*k,0.2,6);render();
});
document.getElementById('btn-zoom-out').addEventListener('click',()=>{
  const cx=gardenCanvasEl.width/2,cy=gardenCanvasEl.height/2,k=0.8;
  state.panX=cx-k*(cx-state.panX);state.panY=cy-k*(cy-state.panY);state.zoom=clamp(state.zoom*k,0.2,6);render();
});
document.getElementById('btn-zoom-fit').addEventListener('click',fitGardenToView);

// ── Garden dimensions ────────────────────────────────────────
document.getElementById('btn-apply-dims').addEventListener('click', () => { if(window.applyDimensions) applyDimensions(); });
inputWEl.addEventListener('keydown',e=>{if(e.key==='Enter' && window.applyDimensions) applyDimensions();});
inputHEl.addEventListener('keydown',e=>{if(e.key==='Enter' && window.applyDimensions) applyDimensions();});
window.applyDimensions = function() {
  const w=parseFloat(inputWEl.value), h=parseFloat(inputHEl.value);
  if(!w||!h||w<1||h<1){showToast('Enter valid dimensions (≥1m)','error');return;}
  state.gardenW=w; state.gardenH=h;
  state.placedPlants=state.placedPlants.filter(p=>isInGarden(p.gx,p.gy));
  state.keyholeGardens=state.keyholeGardens.filter(k=>k.cx-k.r>=0&&k.cx+k.r<=w&&k.cy-k.r>=0&&k.cy+k.r<=h);
  plantCountEl.textContent=state.placedPlants.length;
  updateAreaDisplay(); updateKeyholeList();
  showToast(`Garden resized to ${w}×${h} m`,'success'); fitGardenToView();
};

// ── Add Keyhole button + size slider ─────────────────────────
document.getElementById('btn-add-keyhole').addEventListener('click',()=>setAddKeyholeMode(!state.addingKeyhole));
const khSlider=document.getElementById('kh-radius-slider');
const khRadLabel=document.getElementById('kh-radius-val');
if(khSlider){
  khSlider.addEventListener('input',()=>{
    state.newKeyholeRadius=parseFloat(khSlider.value);
    khRadLabel.textContent=`⌀${(state.newKeyholeRadius*2).toFixed(1)} m`;
    if(cursorGarden) renderOverlay();
  });
}

// ── Clear all ─────────────────────────────────────────
document.getElementById('btn-clear-all').addEventListener('click',()=>{
  const np=state.placedPlants.length, nk=state.keyholeGardens.length;
  if(!np&&!nk){showToast('Garden is already empty','info');return;}
  // Close designer if open
  if(window.designer&&designer.active) closeDesigner();
  // Reset state
  state.placedPlants=[]; state.keyholeGardens=[]; state.obstacles=[];
  state.selectedPlantId=null; state.selectedRingId=null;
  state.hovered=null; state.hoveredKeyhole=null; state.hoveredObstacle=null;
  // Update UI
  document.getElementById('heatmap-legend').classList.remove('visible');
  document.getElementById('no-selection-hint').style.display='';
  document.getElementById('selection-details').style.display='none';
  plantCountEl.textContent=0;
  updateAreaDisplay(); updateKeyholeList(); buildPlantList();
  showToast(`🗑 Cleared ${np} plant${np!==1?'s':''} and ${nk} keyhole bed${nk!==1?'s':''}`, 'info');
  render();
});

// ── Keyboard shortcuts ───────────────────────────────────────
document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT') return;
  if(e.key==='Escape'){
    if(designer&&designer.active) closeDesigner();
    else if(state.addingKeyhole) setAddKeyholeMode(false);
    else selectPlant(state.selectedPlantId);
  }
  if(e.key==='ArrowRight') { const b=document.getElementById('tl-next'); if(b) b.click(); }
  if(e.key==='ArrowLeft')  { const b=document.getElementById('tl-prev'); if(b) b.click(); }
  if(e.key===' '){e.preventDefault(); if(window.togglePlay) togglePlay();}
  if(e.key==='+'||e.key==='=') document.getElementById('btn-zoom-in').click();
  if(e.key==='-') document.getElementById('btn-zoom-out').click();
  if(e.key==='f'||e.key==='F') fitGardenToView();
  if(e.key==='k'||e.key==='K') setAddKeyholeMode(!state.addingKeyhole);
});

document.getElementById('btn-draw-obstacle').addEventListener('click',()=>setDrawObstacleMode(!state.drawingObstacle));
document.getElementById('btn-design-garden').addEventListener('click',()=>openDesigner(null));

const _ro=new ResizeObserver(()=>resizeCanvases()); _ro.observe(canvasArea);
