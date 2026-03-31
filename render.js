/* ============================================================
   render.js — all canvas drawing functions
   ============================================================ */
'use strict';

const gardenCanvas  = document.getElementById('garden-canvas');
const heatmapCanvas = document.getElementById('heatmap-canvas');
const overlayCanvas = document.getElementById('overlay-canvas');
const gCtx = gardenCanvas.getContext('2d');
const hCtx = heatmapCanvas.getContext('2d');
const oCtx = overlayCanvas.getContext('2d');
window.canvasArea = document.getElementById('canvas-area');

// ── Canvas resize ────────────────────────────────────────────
window.resizeCanvases = function() {
  const w=canvasArea.offsetWidth, h=canvasArea.offsetHeight;
  [gardenCanvas,heatmapCanvas,overlayCanvas].forEach(c=>{c.width=w;c.height=h;});
  fitGardenToView();
};
window.fitGardenToView = function() {
  const cw=gardenCanvas.width, ch=gardenCanvas.height;
  state.zoom=Math.min((cw*0.9)/(state.gardenW*PX_PER_METER),(ch*0.9)/(state.gardenH*PX_PER_METER),3);
  state.panX=(cw-state.gardenW*PX_PER_METER*state.zoom)/2;
  state.panY=(ch-state.gardenH*PX_PER_METER*state.zoom)/2;
  render();
};

// ── Master render ────────────────────────────────────────────
window.render = function() {
  renderGarden();
  renderHeatmap();
  renderOverlay();
  if(window.extraOverlayRenderer) window.extraOverlayRenderer(oCtx);
};

// ── Garden layer ─────────────────────────────────────────────
window.renderGarden = function() {
  const cw=gardenCanvas.width, ch=gardenCanvas.height;
  gCtx.clearRect(0,0,cw,ch);
  gCtx.fillStyle=SOIL_COLOR; gCtx.fillRect(0,0,cw,ch);

  const gx0=state.panX, gy0=state.panY;
  const gw=px(state.gardenW), gh=px(state.gardenH);
  const step=PX_PER_METER*state.zoom;

  gCtx.shadowColor='rgba(74,222,128,0.12)'; gCtx.shadowBlur=20;
  gCtx.fillStyle='#1b2a1b'; gCtx.fillRect(gx0,gy0,gw,gh);
  gCtx.shadowBlur=0;

  gCtx.strokeStyle=GRID_COLOR; gCtx.lineWidth=1;
  for(let c=0;c<=state.gardenW;c++){
    const x=gx0+c*step; gCtx.beginPath(); gCtx.moveTo(x,gy0); gCtx.lineTo(x,gy0+gh); gCtx.stroke();
  }
  for(let r=0;r<=state.gardenH;r++){
    const y=gy0+r*step; gCtx.beginPath(); gCtx.moveTo(gx0,y); gCtx.lineTo(gx0+gw,y); gCtx.stroke();
  }

  gCtx.strokeStyle=BORDER_COLOR; gCtx.lineWidth=2; gCtx.strokeRect(gx0,gy0,gw,gh);
  gCtx.fillStyle='rgba(74,222,128,0.55)'; gCtx.font='bold 12px Inter,sans-serif';
  gCtx.textAlign='center'; gCtx.textBaseline='bottom';
  gCtx.fillText(`${state.gardenW} m`, gx0+gw/2, gy0-5);
  gCtx.textAlign='right'; gCtx.textBaseline='middle';
  gCtx.fillText(`${state.gardenH} m`, gx0-7, gy0+gh/2);

  state.keyholeGardens.forEach(kh=>drawKeyholeBed(gCtx,kh));
  state.obstacles.forEach(o=>drawObstacle(gCtx,o,false));
  state.placedPlants.forEach(pp=>drawPlant(gCtx,pp));
};

window.drawObstacle = function(ctx, o, isPreview) {
  const p1=gardenToCanvas(o.x1,o.y1), p2=gardenToCanvas(o.x2,o.y2);
  const w=p2.x-p1.x, h=p2.y-p1.y;
  if(Math.abs(w)<2||Math.abs(h)<2) return;
  const isHov = state.hoveredObstacle===o.id;
  // Fill
  ctx.fillStyle = isPreview ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.10)';
  ctx.fillRect(p1.x,p1.y,w,h);
  // Hatch
  ctx.save();
  ctx.beginPath(); ctx.rect(p1.x,p1.y,w,h); ctx.clip();
  ctx.strokeStyle = isPreview ? 'rgba(239,68,68,0.35)' : 'rgba(239,68,68,0.28)';
  ctx.lineWidth=1; ctx.setLineDash([]);
  const spacing=10;
  for(let d=-(Math.max(w,h)+spacing);d<Math.max(w,h)+spacing;d+=spacing){
    ctx.beginPath();
    ctx.moveTo(p1.x+d, p1.y);
    ctx.lineTo(p1.x+d+Math.max(w,h), p1.y+Math.max(w,h));
    ctx.stroke();
  }
  ctx.restore();
  // Border
  ctx.strokeStyle = isHov ? 'rgba(239,68,68,0.9)' : (isPreview ? 'rgba(239,68,68,0.7)' : 'rgba(239,68,68,0.5)');
  ctx.lineWidth = isHov ? 2 : 1.5;
  ctx.setLineDash(isPreview ? [5,4] : []);
  ctx.strokeRect(p1.x,p1.y,w,h);
  ctx.setLineDash([]);
  // Label
  if(!isPreview && w>40 && h>20){
    ctx.fillStyle='rgba(239,68,68,0.6)'; ctx.font='bold 11px Inter,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('⛔',p1.x+w/2,p1.y+h/2);
  }
  if(isPreview){
    const gw=(o.x2-o.x1).toFixed(1), gh=(o.y2-o.y1).toFixed(1);
    ctx.fillStyle='rgba(239,68,68,0.8)'; ctx.font='bold 11px Inter,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText(`${gw}×${gh} m`, p1.x+w/2, p1.y-4);
  }
};

window.drawKeyholeBed = function(ctx, kh) {
  const pos=gardenToCanvas(kh.cx,kh.cy);
  const rPx=px(kh.r), cRPx=px(khParams(kh).compostR);
  const pathA=Math.PI/2, span=NOTCH_SPAN;
  const isHov=state.hoveredKeyhole===kh.id;

  ctx.shadowColor='rgba(74,222,128,0.10)'; ctx.shadowBlur=16;
  ctx.beginPath(); ctx.arc(pos.x,pos.y,rPx,0,Math.PI*2);
  ctx.fillStyle='#1f3320'; ctx.fill(); ctx.shadowBlur=0;

  ctx.strokeStyle=GRID_COLOR; ctx.lineWidth=1;
  for(let ring=0.5;ring<=kh.r;ring+=0.5){ctx.beginPath();ctx.arc(pos.x,pos.y,px(ring),0,Math.PI*2);ctx.stroke();}
  for(let a=0;a<Math.PI*2;a+=Math.PI/6){
    ctx.beginPath();ctx.moveTo(pos.x+cRPx*Math.cos(a),pos.y+cRPx*Math.sin(a));ctx.lineTo(pos.x+rPx*Math.cos(a),pos.y+rPx*Math.sin(a));ctx.stroke();
  }

  ctx.beginPath(); ctx.moveTo(pos.x,pos.y);
  ctx.arc(pos.x,pos.y,rPx,pathA-span,pathA+span); ctx.closePath();
  ctx.fillStyle='#0e1810'; ctx.fill();
  ctx.strokeStyle='rgba(245,158,11,0.45)'; ctx.lineWidth=1.5; ctx.setLineDash([5,4]);
  [pathA-span,pathA+span].forEach(a=>{ctx.beginPath();ctx.moveTo(pos.x,pos.y);ctx.lineTo(pos.x+rPx*Math.cos(a),pos.y+rPx*Math.sin(a));ctx.stroke();});
  ctx.setLineDash([]);

  const cg=ctx.createRadialGradient(pos.x,pos.y,0,pos.x,pos.y,cRPx);
  cg.addColorStop(0,'#3d2a10'); cg.addColorStop(1,'#291e0a');
  ctx.beginPath(); ctx.arc(pos.x,pos.y,cRPx,0,Math.PI*2);
  ctx.fillStyle=cg; ctx.fill();
  ctx.strokeStyle='rgba(245,158,11,0.6)'; ctx.lineWidth=1.5; ctx.stroke();
  if(cRPx>12){
    ctx.font=`${Math.min(12,cRPx*0.55)}px Inter,sans-serif`;
    ctx.fillStyle='rgba(245,158,11,0.85)'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('♻',pos.x,pos.y);
  }

  ctx.beginPath(); ctx.arc(pos.x,pos.y,rPx,pathA+span,pathA-span+2*Math.PI);
  ctx.strokeStyle=isHov?'rgba(74,222,128,0.9)':BORDER_COLOR;
  ctx.lineWidth=isHov?2.5:1.5; ctx.stroke();

  ctx.fillStyle='rgba(74,222,128,0.55)'; ctx.font='bold 11px Inter,sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='bottom';
  ctx.fillText(`⌀${(kh.r*2).toFixed(1)} m`,pos.x,pos.y-rPx-4);
  if(rPx>40){
    ctx.fillStyle='rgba(245,158,11,0.5)'; ctx.font=`bold ${Math.min(10,cRPx*0.45)}px Inter,sans-serif`;
    ctx.textBaseline='top'; ctx.fillText('Access',pos.x,pos.y+rPx*0.56);
  }
};

window.drawPlant = function(ctx, pp) {
  const def=getPlantDef(pp.plantId); if(!def) return;
  const days=Math.max(0,state.currentDay-pp.dayPlanted);
  const scale=getPlantScale(def,days); if(scale<=0.001) return;
  const pos=gardenToCanvas(pp.gx,pp.gy);
  const r=px(def.spacing/100)*0.5*scale;
  const isHov=state.hovered===pp.id;
  const g=ctx.createRadialGradient(pos.x,pos.y,0,pos.x,pos.y,r);
  g.addColorStop(0,def.color+'cc'); g.addColorStop(1,def.color+'33');
  ctx.beginPath(); ctx.arc(pos.x,pos.y,r,0,Math.PI*2);
  ctx.fillStyle=g; ctx.fill();
  if(isHov){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();}
  const stage=getPlantStage(def,days);
  ctx.font=`${Math.max(10,clamp(r*0.9,10,36))}px serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='rgba(255,255,255,0.95)';
  ctx.fillText(stage.emoji||def.icon,pos.x,pos.y);
  if(state.zoom>1.0||isHov){
    ctx.font=`bold ${Math.min(11,r*0.35)}px Inter,sans-serif`;
    ctx.textBaseline='top'; ctx.fillStyle='rgba(255,255,255,0.7)';
    ctx.fillText(def.name,pos.x,pos.y+r+2);
  }
  if(state.selectedRingId===pp.id){
    ctx.beginPath(); ctx.arc(pos.x,pos.y,r+4,0,Math.PI*2);
    ctx.strokeStyle='rgba(255,255,255,0.8)'; ctx.lineWidth=2;
    ctx.setLineDash([4,4]); ctx.stroke(); ctx.setLineDash([]);
  }
};

// ── Heatmap layer ────────────────────────────────────────────
window.renderHeatmap = function() {
  hCtx.clearRect(0,0,heatmapCanvas.width,heatmapCanvas.height);
  if(!state.selectedPlantId) return;
  const sel=getPlantDef(state.selectedPlantId); if(!sel) return;
  const gw=state.gardenW, gh=state.gardenH;
  const COLS=150, ROWS=Math.max(4,Math.round(150*gh/gw));
  const scores=new Float32Array(COLS*ROWS);
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const gx=(c+0.5)/COLS*gw, gy=(r+0.5)/ROWS*gh;
    scores[r*COLS+c]=(isInGarden(gx,gy)&&!isInAnyObstacle(gx,gy))?computeScore(sel,gx,gy):-2;
  }
  const cW=px(gw)/COLS, cH=px(gh)/ROWS;
  const ox=state.panX, oy=state.panY;
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const s=scores[r*COLS+c]; if(s<=-2) continue;
    let R,G,B,A;
    if(s>=0.85){const t=(s-0.85)/0.15;R=Math.round(lerp(34,147,t));G=Math.round(lerp(211,220,t));B=Math.round(lerp(238,255,t));A=0.30+t*0.35;}
    else if(s>=0.55){const t=(s-0.55)/0.30;R=Math.round(lerp(74,34,t));G=Math.round(lerp(222,211,t));B=Math.round(lerp(128,238,t));A=0.22+t*0.20;}
    else if(s>=0.15){const t=(s-0.15)/0.40;R=Math.round(lerp(251,74,t));G=Math.round(lerp(191,222,t));B=Math.round(lerp(36,128,t));A=0.12+t*0.14;}
    else if(s>=-0.20){const t=(s+0.20)/0.35;R=Math.round(lerp(245,251,t));G=Math.round(lerp(158,191,t));B=Math.round(lerp(11,36,t));A=0.08+t*0.06;}
    else{const t=clamp((-s-0.20)/0.80,0,1);R=239;G=Math.round(lerp(100,68,t));B=Math.round(lerp(80,68,t));A=0.12+t*0.45;}
    hCtx.fillStyle=`rgba(${R},${G},${B},${A.toFixed(3)})`;
    hCtx.fillRect(ox+c*cW,oy+r*cH,cW+0.5,cH+0.5);
  }
};

// ── Overlay / ghost layer ────────────────────────────────────
window.cursorGarden = null;

window.renderOverlay = function() {
  oCtx.clearRect(0,0,overlayCanvas.width,overlayCanvas.height);
  // Obstacle drag preview
  if(state.drawingObstacle && state.obstacleStart && cursorGarden){
    const previewObs = normalizeObs(state.obstacleStart, cursorGarden, -1);
    if((previewObs.x2-previewObs.x1)>0.05 || (previewObs.y2-previewObs.y1)>0.05)
      drawObstacle(oCtx, previewObs, true);
    return;
  }
  if(state.addingKeyhole&&cursorGarden&&isInGarden(cursorGarden.gx,cursorGarden.gy)){
    drawKeyholeGhost(oCtx,cursorGarden.gx,cursorGarden.gy,state.newKeyholeRadius); return;
  }
  if(!state.selectedPlantId||!cursorGarden) return;
  if(!isInGarden(cursorGarden.gx,cursorGarden.gy)||isInAnyObstacle(cursorGarden.gx,cursorGarden.gy)) return;
  const sel=getPlantDef(state.selectedPlantId);
  const pos=gardenToCanvas(cursorGarden.gx,cursorGarden.gy);
  const radius=px(sel.spacing/100)*0.5;
  const score=computeScore(sel,cursorGarden.gx,cursorGarden.gy);
  const ring=score>=0.55?'rgba(74,222,128,0.85)':score>=0.15?'rgba(251,191,36,0.85)':score>=-0.2?'rgba(245,158,11,0.85)':'rgba(239,68,68,0.85)';
  oCtx.beginPath(); oCtx.arc(pos.x,pos.y,radius,0,Math.PI*2);
  oCtx.strokeStyle=ring; oCtx.lineWidth=2; oCtx.setLineDash([4,4]); oCtx.stroke(); oCtx.setLineDash([]);
  oCtx.beginPath(); oCtx.arc(pos.x,pos.y,radius*0.9,0,Math.PI*2);
  oCtx.fillStyle=sel.color+'55'; oCtx.fill();
  oCtx.font=`${clamp(radius*0.9,12,40)}px serif`;
  oCtx.textAlign='center'; oCtx.textBaseline='middle'; oCtx.globalAlpha=0.8;
  oCtx.fillStyle='white'; oCtx.fillText(sel.icon,pos.x,pos.y); oCtx.globalAlpha=1;
};

window.drawKeyholeGhost = function(ctx,gx,gy,r) {
  const pos=gardenToCanvas(gx,gy);
  const rPx=px(r), cRPx=px(Math.max(0.25,r*0.18));
  ctx.globalAlpha=0.55;
  ctx.beginPath(); ctx.arc(pos.x,pos.y,rPx,0,Math.PI*2);
  ctx.fillStyle='#1d4022'; ctx.fill();
  ctx.strokeStyle='rgba(74,222,128,0.9)'; ctx.lineWidth=2; ctx.setLineDash([5,4]); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(pos.x,pos.y,cRPx,0,Math.PI*2);
  ctx.fillStyle='rgba(245,158,11,0.5)'; ctx.fill();
  ctx.font='bold 11px Inter,sans-serif'; ctx.fillStyle='rgba(74,222,128,0.9)';
  ctx.textAlign='center'; ctx.textBaseline='bottom';
  ctx.fillText(`⌀${(r*2).toFixed(1)} m`,pos.x,pos.y-rPx-3);
  ctx.globalAlpha=1;
};

// Expose canvas element for interact.js
window.gardenCanvasEl  = gardenCanvas;
window.overlayCanvasEl = overlayCanvas;
window.overlayCtx      = oCtx;
