/* ============================================================
   ui.js — sidebar, plant list, companion panel, keyhole list,
           timeline controls, dimension + area displays
   ============================================================ */
'use strict';

const plantList        = document.getElementById('plant-list');
const heatmapLegend    = document.getElementById('heatmap-legend');
const plantCountEl     = document.getElementById('plant-count');
window.areaDisplayEl   = document.getElementById('area-display');
const inputW           = document.getElementById('input-width');
const inputH           = document.getElementById('input-height');
const selectionDetails = document.getElementById('selection-details');
const noSelectionHint  = document.getElementById('no-selection-hint');
const tlSlider         = document.getElementById('tl-slider');
const tlDateDisplay    = document.getElementById('tl-date-display');
const tlSeasonBadge    = document.getElementById('tl-season-badge');
const tlPlay           = document.getElementById('tl-play');
const tlPrev           = document.getElementById('tl-prev');
const tlNext           = document.getElementById('tl-next');
const tlSpeed          = document.getElementById('tl-speed');
const plantTooltip     = document.getElementById('plant-tooltip');
const contextMenu      = document.getElementById('context-menu');

// ── Plant list ───────────────────────────────────────────────
window.buildPlantList = function() {
  const q=state.searchQuery.toLowerCase();
  plantList.innerHTML='';
  const filtered=PLANTS.filter(p=>{
    if(state.filter!=='all'&&!p.season.includes(state.filter)) return false;
    if(q&&!p.name.toLowerCase().includes(q)&&!p.id.includes(q)) return false;
    return true;
  });
  if(!filtered.length){
    plantList.innerHTML='<div style="color:var(--text-dim);font-size:12px;text-align:center;padding:24px">No plants match.</div>';
    return;
  }
  filtered.forEach(plant=>{
    const card=document.createElement('div');
    card.className='plant-card'+(state.selectedPlantId===plant.id?' selected':'');
    card.style.setProperty('--plant-color',plant.color);
    const dots=Array.from({length:10},(_,i)=>`<div class="yield-dot ${i<plant.yieldScore?'filled':''}"></div>`).join('');
    const sun=plant.sunlight==='full'?'☀️':plant.sunlight==='partial'?'🌤':'🌥';
    const water=plant.water==='high'?'💧💧':plant.water==='medium'?'💧':'〰';
    card.innerHTML=`
      <div class="plant-icon">${plant.icon}</div>
      <div class="plant-info">
        <div class="plant-name">${plant.name}</div>
        <div class="plant-meta"><span>${sun}</span><span>${water}</span><span>📅 ${plant.daysToMaturity}d</span><span>↔ ${plant.spacing}cm</span></div>
      </div>
      <div class="plant-stats"><div class="yield-dots">${dots}</div><div class="pollinator-bar">🐝 ${plant.pollinatorAttraction}/10</div></div>`;
    card.addEventListener('click',()=>selectPlant(plant.id));
    plantList.appendChild(card);
  });
};

window.selectPlant = function(id) {
  if(designer&&designer.active) closeDesigner();
  if(state.selectedPlantId===id){
    state.selectedPlantId=null;
    heatmapLegend.classList.remove('visible');
    noSelectionHint.style.display=''; selectionDetails.style.display='none';
  } else {
    if(state.addingKeyhole) setAddKeyholeMode(false);
    state.selectedPlantId=id;
    heatmapLegend.classList.add('visible');
    _updateCompanionPanel(id);
  }
  buildPlantList(); render();
};

function _updateCompanionPanel(id) {
  const p=getPlantDef(id); if(!p) return;
  noSelectionHint.style.display='none'; selectionDetails.style.display='';
  document.getElementById('sel-icon').textContent=p.icon;
  document.getElementById('sel-name').textContent=p.name;
  const row=document.getElementById('sel-companions');
  row.innerHTML=`<span class="comp-tag info">↔ ${p.spacing}cm</span><span class="comp-tag info">📅 ${p.daysToMaturity}d</span><span class="comp-tag info">yield ${p.yieldScore}/10</span>`;
  p.companions.forEach(c=>{const cp=getPlantDef(c);if(cp)row.innerHTML+=`<span class="comp-tag good">${cp.icon} ${cp.name}</span>`;});
  p.antagonists.forEach(c=>{const ap=getPlantDef(c);if(ap)row.innerHTML+=`<span class="comp-tag bad">✗ ${ap.name}</span>`;});
}

// ── Keyhole beds list ────────────────────────────────────────
window.updateKeyholeList = function() {
  const el=document.getElementById('keyhole-bed-list'); if(!el) return;
  el.innerHTML='';
  if(!state.keyholeGardens.length){
    el.innerHTML='<div class="kh-empty">No beds placed yet</div>'; return;
  }
  state.keyholeGardens.forEach((kh,i)=>{
    const item=document.createElement('div');
    item.className='kh-item';
    item.innerHTML=`
      <span class="kh-icon">🔑</span>
      <span class="kh-info">Bed ${i+1} &nbsp;⌀${(kh.r*2).toFixed(1)} m &nbsp;@ ${kh.cx.toFixed(1)},${kh.cy.toFixed(1)} m</span>
      <button class="kh-design-btn" data-id="${kh.id}" title="Auto-design this bed (🧩)">🧩</button>
      <button class="kh-remove" data-id="${kh.id}" title="Remove bed">✕</button>`;
    item.querySelector('.kh-design-btn').addEventListener('click',e=>{
      e.stopPropagation(); openDesigner(parseInt(e.target.dataset.id));
    });
    item.querySelector('.kh-remove').addEventListener('click',e=>{
      e.stopPropagation(); removeKeyholeBed(parseInt(e.target.dataset.id));
    });
    el.appendChild(item);
  });
};

// ── Area display ─────────────────────────────────────────────
window.updateAreaDisplay = function() {
  areaDisplayEl.textContent=(state.gardenW*state.gardenH).toFixed(0);
  document.getElementById('keyhole-count').textContent=state.keyholeGardens.length;
};

// ── Sidebar filter + search ──────────────────────────────────
document.querySelectorAll('.filter-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); state.filter=btn.dataset.filter; buildPlantList();
  });
});
document.getElementById('plant-search-input').addEventListener('input',e=>{
  state.searchQuery=e.target.value; buildPlantList();
});

// ── Timeline ─────────────────────────────────────────────────
tlSlider.addEventListener('input',()=>{
  state.currentDay=parseInt(tlSlider.value); updateTimelineUI(); render();
});
window.updateTimelineUI = function() {
  const day=state.currentDay;
  tlSlider.style.setProperty('--tl-progress',((day-1)/364*100).toFixed(2)+'%');
  tlDateDisplay.textContent=`Day ${day} — ${dayToDate(day)}`;
  const s=getSeason(day);
  tlSeasonBadge.textContent=`${s.icon} ${s.name}`;
  tlSeasonBadge.className='tl-season-badge '+s.cls;
};
tlPlay.addEventListener('click', () => togglePlay());
window.togglePlay = function() {
  if(state.playInterval){
    clearInterval(state.playInterval); state.playInterval=null;
    tlPlay.textContent='▶'; tlPlay.classList.remove('active-play');
  } else {
    tlPlay.textContent='⏸'; tlPlay.classList.add('active-play');
    const spd=parseFloat(tlSpeed.value), fps=30, dpf=2*spd/fps;
    state.playInterval=setInterval(()=>{
      state.currentDay+=dpf; if(state.currentDay>365) state.currentDay=1;
      tlSlider.value=Math.round(state.currentDay); updateTimelineUI(); render();
    },1000/fps);
  }
};
tlSpeed.addEventListener('change',()=>{if(state.playInterval){togglePlay();togglePlay();}});
tlPrev.addEventListener('click',()=>{state.currentDay=Math.max(1,Math.round(state.currentDay)-7);tlSlider.value=state.currentDay;updateTimelineUI();render();});
tlNext.addEventListener('click',()=>{state.currentDay=Math.min(365,Math.round(state.currentDay)+7);tlSlider.value=state.currentDay;updateTimelineUI();render();});

// ── Tooltip access (used by interact.js) ─────────────────────
window.plantTooltipEl  = plantTooltip;
window.contextMenuEl   = contextMenu;
window.plantCountEl    = plantCountEl;
window.inputWEl        = inputW;
window.inputHEl        = inputH;
