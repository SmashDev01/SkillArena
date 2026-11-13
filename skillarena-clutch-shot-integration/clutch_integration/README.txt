SKILLARENA — CLUTCH SHOT INTEGRATION

1. Put this ZIP in your SkillArena project folder and extract it there.
2. From the SkillArena project root, run: node clutch_integration/integrate.js
   (If you extracted the ZIP's contents directly into the project root, run: node integrate.js)
3. The script copies public/clutch-shot.html and adds the Clutch Shot card/view to src/App.tsx.
4. Start/restart Vite: npm run dev -- --host 0.0.0.0
5. Refresh Chrome and open Clutch Shot from the game cards.

This keeps the original 3D basketball court, player animation, hoop, ball physics, drag-to-aim and shot preview, scoring, streaks, difficulty, sounds, camera modes, 30-second solo challenge and local two-player duel. Bankroll branding/integration and online matchmaking are excluded.

Three.js is loaded from jsDelivr, so the 3D game requires an internet connection when first opened.
