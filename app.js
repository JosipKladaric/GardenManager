/* ============================================================
   app.js — init only: demo data + bootstrap
   ============================================================ */
'use strict';

(function init() {
  updateAreaDisplay();
  buildPlantList();
  updateKeyholeList();
  resizeCanvases();  // calls fitGardenToView → render
  updateTimelineUI();

  setTimeout(() => {
    state.placedPlants = [
      { id: state.nextPlantId++, plantId: 'tomato',    gx: 2.5, gy: 2,   dayPlanted: 1 },
      { id: state.nextPlantId++, plantId: 'basil',     gx: 3.5, gy: 2,   dayPlanted: 1 },
      { id: state.nextPlantId++, plantId: 'marigold',  gx: 1.5, gy: 4,   dayPlanted: 1 },
      { id: state.nextPlantId++, plantId: 'carrot',    gx: 6,   gy: 1.5, dayPlanted: 1 },
      { id: state.nextPlantId++, plantId: 'lettuce',   gx: 7.5, gy: 3,   dayPlanted: 1 },
      { id: state.nextPlantId++, plantId: 'sunflower', gx: 8.5, gy: 6,   dayPlanted: 1 },
    ];
    state.keyholeGardens = [
      { id: state.keyholeNextId++, cx: 4, cy: 4.5, r: 1.5 },
    ];
    plantCountEl.textContent = state.placedPlants.length;
    updateAreaDisplay();
    updateKeyholeList();
    render();
    showToast('🌿 Press K to add keyhole beds · Click 🧩 in the bed list to auto-design one!', 'info', 5000);
  }, 200);
})();
