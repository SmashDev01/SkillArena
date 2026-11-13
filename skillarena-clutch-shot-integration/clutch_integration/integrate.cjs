const fs = require('fs');
const path = require('path');
const appPath = path.join(process.cwd(), 'src', 'App.tsx');
if (!fs.existsSync(appPath)) {
  console.error('Run this script from the SkillArena project root (the folder containing src/App.tsx).');
  process.exit(1);
}
let app = fs.readFileSync(appPath, 'utf8');
if (app.includes('clutch-shot.html') && app.includes('Clutch Shot')) {
  console.log('Clutch Shot integration already appears to be installed. No changes made.');
  process.exit(0);
}
const typeMatch = app.match(/^type Game = ([^;]+);$/m);
if (!typeMatch) throw new Error('Could not find the SkillArena Game type. App.tsx was not changed.');
if (!typeMatch[1].includes('"clutch"')) {
  app = app.replace(typeMatch[0], `type Game = ${typeMatch[1]} | "clutch";`);
}
const gamesStart = app.indexOf('<section className="games">');
if (gamesStart < 0) throw new Error('Could not find the Featured Games section. App.tsx was not changed.');
const gamesEnd = app.indexOf('</section>', gamesStart);
if (gamesEnd < 0) throw new Error('Could not find the end of the Featured Games section. App.tsx was not changed.');
const clutchCard = `
                <div className="game-card">
                  <div className="game-icon">🏀</div>
                  <h3>Clutch Shot</h3>
                  <p>Step onto the 3D court. Aim with a swipe, release your shot and build your scoring streak.</p>
                  <button className="primary" onClick={() => openGame("clutch")}>Play now →</button>
                </div>`;
app = app.slice(0, gamesEnd) + clutchCard + '\n              ' + app.slice(gamesEnd);
const footerIndex = app.indexOf('<div className="footer-note">SKILLARENA · TRAIN YOUR SKILLS · OWN YOUR RECORDS</div>');
const clutchView = `          {page === "clutch" && (\n            <section className="game-view" style={{ maxWidth: "1200px" }}>\n              <button className="back" onClick={() => setPage("dashboard")}>← Back to Dashboard</button>\n              <div style={{ height: "min(78vh, 850px)", minHeight: "540px", overflow: "hidden", border: "1px solid #30294a", borderRadius: "18px", background: "#080d13" }}>\n                <iframe title="Clutch Shot 3D Basketball" src="/clutch-shot.html" style={{ width: "100%", height: "100%", border: 0, display: "block" }} allow="autoplay; fullscreen" />\n              </div>\n            </section>\n          )}\n\n`;
if (footerIndex < 0) throw new Error('Could not find the dashboard footer insertion point. App.tsx was not changed.');
app = app.slice(0, footerIndex) + clutchView + app.slice(footerIndex);
fs.mkdirSync(path.join(process.cwd(), 'public'), { recursive: true });
fs.copyFileSync(path.join(__dirname, 'public', 'clutch-shot.html'), path.join(process.cwd(), 'public', 'clutch-shot.html'));
fs.writeFileSync(appPath, app);
console.log('Clutch Shot added to SkillArena. Existing games were preserved.');
console.log('Added: public/clutch-shot.html and a Clutch Shot game card with an embedded 3D game view.');
console.log('Bankroll integration and online matchmaking are not included.');
