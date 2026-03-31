# 🌿 Garden Manager

A smart garden layout designer for GitHub Pages. Plan your garden with companion planting heatmaps, real-time growth timelines, and intelligent placement guidance.

## Features

| Feature | Description |
|---------|-------------|
| 📐 Custom dimensions | Set your garden size in metres |
| 🌡️ Heatmap overlay | Select any plant to see optimal placement based on companion planting, spacing, and antagonists |
| 🌱 16 plants | Tomato, Basil, Carrot, Lettuce, Marigold, Cucumber, Sunflower, Pepper, Bean, Onion, Garlic, Strawberry, Lavender, Zucchini, Radish, Pea |
| 📅 365-day timeline | Scrub or auto-play through the year to see plants grow through all stages |
| 🔍 Zoom & pan | Mouse wheel to zoom, Alt+drag or middle-drag to pan |
| 🐝 Companion scoring | Each plant scored for yield, pollinator attraction, companions & antagonists |

## Running Locally

Double-click **`serve.bat`** — it will auto-detect Python or Node and open the app in your browser.

```
http://localhost:8080
```

## GitHub Pages Deployment

1. Push this entire folder to a GitHub repository
2. Go to **Settings → Pages**
3. Set Source to **Deploy from a branch → main → / (root)**
4. Your garden will be live at `https://<username>.github.io/<repo>`

## Controls

| Input | Action |
|-------|--------|
| Click plant in sidebar | Select for placement |
| Click garden | Place selected plant |
| Right-click plant | Remove / info |
| Mouse wheel | Zoom in/out |
| Alt + drag | Pan garden |
| Arrow keys ← → | Jump 7 days |
| Space | Play/pause timeline |
| Escape | Deselect current plant |
| F | Fit garden to view |

## Plant Intelligence

The heatmap uses a scoring function that evaluates:
- **Spacing distance** — too close = red zone
- **Companion plants** — nearby friends boost score (cyan aura)
- **Antagonists** — nearby enemies reduce score (red aura)
- **Pollinator attraction** — high-pollinator companions increase yield zones

## File Structure

```
GardenManager/
├── index.html   — App shell
├── styles.css   — Dark-mode premium UI
├── plants.js    — Plant database (16 species)
├── app.js       — Canvas engine, heatmap, timeline
├── serve.bat    — Local dev server
└── README.md
```
