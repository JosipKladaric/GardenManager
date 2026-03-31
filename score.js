/* ============================================================
   score.js — unified placement scoring (pure, no side effects)
   ============================================================ */
'use strict';

// Score for placing selDef at (gx,gy) given existing placedPlants + keyholes.
// Returns -1..1 where >0.85 = companion synergy zone.
window.computeScore = function(selDef, gx, gy) {
  let spacing=0, companion=0, antagonist=0;
  const selR=selDef.spacing/100;

  state.placedPlants.forEach(pp=>{
    const pDef=getPlantDef(pp.plantId); if(!pDef) return;
    const dx=gx-pp.gx, dy=gy-pp.gy;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const minD=selR+pDef.spacing/100;

    // Spacing penalty / adjacency bonus
    if(dist<minD*0.40)        spacing-=2.0;
    else if(dist<minD){const t=(dist/minD-0.4)/0.6; spacing-=lerp(1.6,0,t);}
    else if(dist<minD*1.5){const t=(dist-minD)/(minD*0.5); spacing+=lerp(0.05,0,t);}

    // Companion / antagonist / pollinator / protection
    const iR=minD*2.8;
    if(dist<iR){
      const prox=1-dist/iR;
      if(selDef.companions.includes(pp.plantId)){
        companion+=prox*(0.50+0.30*pDef.pollinatorAttraction/10+0.20*pDef.yieldScore/10);
        if(pDef.pollinatorAttraction>=8) companion+=prox*0.10;
      }
      if(selDef.antagonists.includes(pp.plantId))
        antagonist-=prox*(0.70+0.30*pDef.yieldScore/10);
    }
  });

  // Keyhole raised-bed + compost proximity bonuses
  state.keyholeGardens.forEach(kh=>{
    const {compostR}=khParams(kh);
    const dx=gx-kh.cx, dy=gy-kh.cy;
    const dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<kh.r) companion+=0.07;
    const cRange=kh.r*0.55;
    if(dist<cRange&&dist>compostR) companion+=0.10*(1-dist/cRange);
  });

  return clamp(0.75+clamp(spacing,-2,0.1)+clamp(companion,0,0.6)+clamp(antagonist,-1,0),-1,1);
};

// Pairwise interaction score between two plant defs at a given distance.
// Used by optimizer (standalone, without state.placedPlants).
window.pairScore = function(defA, defB, dist) {
  const minD=(defA.spacing+defB.spacing)/100;
  if(dist<minD*0.40) return -3.0;
  if(dist<minD){ const t=(dist/minD-0.4)/0.6; return lerp(-2.5,0,t); }

  let s=0;
  const iR=minD*2.8;
  if(dist<iR){
    const prox=1-dist/iR;
    if(defA.companions.includes(defB.id))
      s+=prox*(0.50+0.30*defB.pollinatorAttraction/10+0.20*defB.yieldScore/10);
    if(defA.antagonists.includes(defB.id))
      s-=prox*(0.70+0.30*defB.yieldScore/10);
    if(defB.companions.includes(defA.id))
      s+=prox*(0.50+0.30*defA.pollinatorAttraction/10+0.20*defA.yieldScore/10);
    if(defB.antagonists.includes(defA.id))
      s-=prox*(0.70+0.30*defA.yieldScore/10);
  }
  return s;
};

// Total score of a standalone placement list (used by optimizer).
window.scoreLayout = function(placements, kh) {
  let total=0;
  for(let i=0;i<placements.length;i++){
    const pi=placements[i], di=getPlantDef(pi.plantId);
    // Compost proximity bonus
    if(kh){
      const kdx=pi.gx-kh.cx, kdy=pi.gy-kh.cy;
      const kd=Math.sqrt(kdx*kdx+kdy*kdy);
      if(kd<kh.r*0.55&&kd>khParams(kh).compostR) total+=0.10*(1-kd/(kh.r*0.55));
      if(kd<kh.r) total+=0.07;
    }

    for(let j=i+1;j<placements.length;j++){
      const pj=placements[j], dj=getPlantDef(pj.plantId);
      const dx=pi.gx-pj.gx, dy=pi.gy-pj.gy;
      const dist=Math.sqrt(dx*dx+dy*dy);
      total+=pairScore(di,dj,dist);
    }
  }
  return total;
};
