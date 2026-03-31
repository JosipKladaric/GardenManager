/* ============================================================
   core.js — shared state, constants, math helpers
   ============================================================ */
'use strict';

// ── State (global, shared across all modules) ────────────────
window.state = {
  gardenW: 10, gardenH: 8,
  zoom: 1, panX: 0, panY: 0,
  currentDay: 1,
  selectedPlantId: null,
  placedPlants: [],        // { id, plantId, gx, gy, dayPlanted }
  keyholeGardens: [],      // { id, cx, cy, r }
  keyholeNextId: 1,
  obstacles: [],           // { id, x1, y1, x2, y2 } garden coords, always x1<x2, y1<y2
  obstacleNextId: 1,
  drawingObstacle: false,  // draw-obstacle mode active
  obstacleStart: null,     // { gx, gy } drag start point
  hoveredObstacle: null,
  playInterval: null,
  hovered: null,
  hoveredKeyhole: null,
  contextTarget: null,
  filter: 'all',
  searchQuery: '',
  nextPlantId: 1,
  addingKeyhole: false,
  newKeyholeRadius: 1.2,
  selectedRingId: null,
};

// ── Constants ────────────────────────────────────────────────
window.PX_PER_METER = 64;
window.GRID_COLOR   = 'rgba(255,255,255,0.04)';
window.SOIL_COLOR   = '#1a2a1a';
window.BORDER_COLOR = 'rgba(74,222,128,0.35)';
window.NOTCH_SPAN   = 0.22;

window.SEASONS = [
  { name:'Winter', icon:'❄️',  cls:'winter', start:1,   end:79  },
  { name:'Spring', icon:'🌸',  cls:'spring', start:80,  end:172 },
  { name:'Summer', icon:'☀️',  cls:'summer', start:173, end:265 },
  { name:'Fall',   icon:'🍂',  cls:'fall',   start:266, end:355 },
  { name:'Winter', icon:'❄️',  cls:'winter', start:356, end:365 },
];
window.MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
window.MONTH_DAYS  = [0,31,59,90,120,151,181,212,243,273,304,334,365];

// ── Math helpers ─────────────────────────────────────────────
window.px    = m  => m * PX_PER_METER * state.zoom;
window.clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
window.lerp  = (a,b,t) => a+(b-a)*t;

window.gardenToCanvas = (gx,gy) => ({
  x: gx*PX_PER_METER*state.zoom + state.panX,
  y: gy*PX_PER_METER*state.zoom + state.panY
});
window.canvasToGarden = (cx,cy) => ({
  gx: (cx-state.panX)/(PX_PER_METER*state.zoom),
  gy: (cy-state.panY)/(PX_PER_METER*state.zoom)
});

// ── Garden helpers ───────────────────────────────────────────
window.isInGarden = (gx,gy) =>
  gx>=0 && gx<=state.gardenW && gy>=0 && gy<=state.gardenH;

// Returns true if (gx,gy) falls inside any obstacle rectangle.
window.isInAnyObstacle = (gx,gy) =>
  state.obstacles.some(o => gx>=o.x1 && gx<=o.x2 && gy>=o.y1 && gy<=o.y2);

// Normalise two garden-coord points into { id, x1, y1, x2, y2 }.
window.normalizeObs = (g1, g2, id) => ({
  id,
  x1: clamp(Math.min(g1.gx,g2.gx), 0, state.gardenW),
  y1: clamp(Math.min(g1.gy,g2.gy), 0, state.gardenH),
  x2: clamp(Math.max(g1.gx,g2.gx), 0, state.gardenW),
  y2: clamp(Math.max(g1.gy,g2.gy), 0, state.gardenH),
});

window.khParams = kh => ({ compostR: Math.max(0.25, kh.r*0.18) });

window.inKeyhole = (kh,gx,gy) => {
  const dx=gx-kh.cx, dy=gy-kh.cy;
  const dist=Math.sqrt(dx*dx+dy*dy);
  if(dist>kh.r) return false;
  if(dist<khParams(kh).compostR) return false;
  let diff=Math.atan2(dy,dx)-Math.PI/2;
  while(diff>Math.PI)  diff-=2*Math.PI;
  while(diff<-Math.PI) diff+=2*Math.PI;
  if(Math.abs(diff)<NOTCH_SPAN) return false;
  return true;
};

// ── Plant def helpers ────────────────────────────────────────
window.getPlantDef = id => PLANTS.find(p=>p.id===id);

window.getPlantStage = (def,days) => {
  let st=def.stages[0];
  for(const s of def.stages){ if(days>=s.day) st=s; else break; }
  return st;
};
window.getPlantScale = (def,days) => {
  const ss=def.stages; let s0=ss[0],s1=ss[0];
  for(let i=0;i<ss.length-1;i++){
    if(days>=ss[i].day&&days<ss[i+1].day){s0=ss[i];s1=ss[i+1];break;}
    if(i===ss.length-2&&days>=ss[i+1].day){s0=s1=ss[ss.length-1];break;}
  }
  if(s0===s1) return s0.scale;
  return lerp(s0.scale,s1.scale,(days-s0.day)/(s1.day-s0.day));
};

// ── Season / date helpers ────────────────────────────────────
window.getSeason = day => SEASONS.find(s=>day>=s.start&&day<=s.end)||SEASONS[3];
window.dayToDate = day => {
  const mi=MONTH_DAYS.findIndex((_,i)=>day<=MONTH_DAYS[i+1]);
  const m=Math.min(mi,11);
  return `${MONTH_NAMES[m]} ${day-MONTH_DAYS[m]}`;
};

// ── Toast ────────────────────────────────────────────────────
window.showToast = (msg,type='info',dur=2200) => {
  const t=document.getElementById('toast');
  t.textContent=msg; t.className=`toast ${type} show`;
  clearTimeout(t._t); t._t=setTimeout(()=>{t.className='toast';},dur);
};

// ── Hook for optional overlay renderers (optimizer uses this)─
window.extraOverlayRenderer = null;
