
import { useEffect, useRef, useState } from "react";
import "./App.css";
import { supabase } from "./lib/supabase";
import { NearConnector } from "@hot-labs/near-connect";

type Game = "dashboard" | "reflex" | "memory" | "precision" | "clutch" | "leaderboard" | "profile";

const styles = `
* { box-sizing: border-box; }
body { margin: 0; background: #090914; color: #f5f3ff; font-family: Inter, system-ui, sans-serif; }
button { cursor: pointer; font: inherit; }
.app { min-height: 100vh; display: flex; background: radial-gradient(circle at 80% 0%, #25164a 0%, #0b0b18 38%, #090914 75%); }
.sidebar { width: 235px; padding: 28px 18px; background: rgba(12,12,27,.92); border-right: 1px solid #27233d; display: flex; flex-direction: column; gap: 30px; }
.logo { font-size: 25px; font-weight: 900; letter-spacing: -1px; }
.logo span { color: #a78bfa; }
.side-label { color: #77738f; font-size: 11px; letter-spacing: 2px; margin: 8px 10px; }
.nav-btn { width: 100%; text-align: left; border: 0; color: #aaa6c3; background: transparent; padding: 13px 14px; border-radius: 12px; margin: 3px 0; }
.nav-btn.active, .nav-btn:hover { color: white; background: #282044; }
.sidebar-bottom { margin-top: auto; padding: 15px; border: 1px solid #30274b; border-radius: 14px; background: #171329; color: #aaa4c4; font-size: 12px; line-height: 1.6; }
.main { flex: 1; min-width: 0; padding: 32px clamp(18px, 4vw, 55px); max-width: 1500px; margin: auto; }
.topbar { display: flex; align-items: center; justify-content: space-between; gap: 15px; margin-bottom: 32px; }
.eyebrow { color: #a78bfa; font-size: 11px; letter-spacing: 2px; font-weight: 800; }
h1 { font-size: clamp(28px, 4vw, 43px); letter-spacing: -1.8px; margin: 9px 0; }
h2 { margin: 0 0 10px; font-size: 23px; }
.muted { color: #9691ad; }
.profile { border: 1px solid #30294a; background: #171329; border-radius: 30px; padding: 10px 15px; color: #ddd6fe; font-size: 13px; }
.hero { padding: clamp(23px, 4vw, 40px); border: 1px solid #49356f; border-radius: 23px; background: linear-gradient(115deg, #21163d, #17132d 58%, #312052); position: relative; overflow: hidden; }
.hero:after { content: "✦"; position: absolute; right: 8%; top: 5%; font-size: 150px; color: #ffffff0b; }
.hero p { color: #bcb4d7; max-width: 540px; line-height: 1.6; }
.primary { border: 0; border-radius: 11px; background: linear-gradient(110deg,#8b5cf6,#6d4be8); color: white; padding: 12px 19px; font-weight: 800; box-shadow: 0 7px 25px #7549e544; }
.primary:hover { filter: brightness(1.12); }
.secondary { border: 1px solid #494064; border-radius: 11px; background: #211b35; color: #eee9ff; padding: 11px 17px; }
.stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin: 22px 0 35px; }
.stat, .panel, .game-card { background: #141326; border: 1px solid #292641; border-radius: 17px; padding: 20px; }
.stat small { color: #9993b2; display: block; margin-bottom: 9px; }
.stat strong { font-size: 27px; }
.section-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: 28px 0 15px; }
.games { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 15px; }
.game-card { min-height: 205px; display: flex; flex-direction: column; align-items: flex-start; transition: .2s; }
.game-card:hover { transform: translateY(-4px); border-color: #7955bd; }
.game-icon { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 13px; background: #30234d; font-size: 24px; margin-bottom: 16px; }
.game-card h3 { margin: 0 0 7px; }
.game-card p { color: #9993b2; font-size: 13px; line-height: 1.5; flex: 1; margin: 0 0 15px; }
.game-view { max-width: 900px; margin: auto; }
.back { color: #b8a4f5; border: 0; background: transparent; padding: 0; margin-bottom: 25px; }
.game-box { background: #141326; border: 1px solid #30294a; border-radius: 22px; padding: clamp(18px,4vw,35px); text-align: center; }
.game-box p { color: #a49dbb; }
.big-number { font-size: clamp(45px,8vw,75px); font-weight: 900; margin: 18px 0; letter-spacing: -3px; }
.status { padding: 12px; background: #211b35; border-radius: 12px; color: #c4b5fd; margin: 18px auto; max-width: 520px; }
.arena { min-height: 260px; border: 1px solid #3c315c; background: radial-gradient(circle,#292044,#100f20 75%); border-radius: 18px; position: relative; overflow: hidden; margin: 20px 0; touch-action: manipulation; }
.target { position: absolute; width: 58px; height: 58px; border: 4px solid #f5d0fe; border-radius: 50%; background: radial-gradient(circle,#fff 0%,#c084fc 25%,#7c3aed 70%); box-shadow: 0 0 25px #a855f7; transform: translate(-50%,-50%); }
.target:active { transform: translate(-50%,-50%) scale(.9); }
.score-row { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; margin: 18px 0; }
.score-cell { background: #201b35; padding: 13px 5px; border-radius: 12px; }
.score-cell small { display: block; color: #9993b2; font-size: 11px; margin-bottom: 5px; }
.score-cell strong { font-size: 20px; }
.memory-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; max-width: 390px; margin: 24px auto; }
.memory-tile { aspect-ratio: 1; border: 1px solid #554477; background: #211b35; border-radius: 13px; color: white; font-size: 22px; }
.memory-tile.lit { background: #8b5cf6; box-shadow: 0 0 22px #8b5cf6; }
.footer-note { color: #77718e; font-size: 12px; margin-top: 25px; }
@media(max-width:850px) { .sidebar { width: 190px; } .games { grid-template-columns: repeat(2,minmax(0,1fr)); } }
@media(max-width:620px) { .app { display: block; } .sidebar { width: 100%; padding: 14px 16px; flex-direction: row; align-items: center; gap: 12px; border-right: 0; border-bottom: 1px solid #27233d; } .sidebar .side-label,.sidebar-bottom { display: none; } .sidebar nav { display: flex; margin-left: auto; } .nav-btn { width: auto; padding: 9px; font-size: 12px; } .main { padding: 22px 15px; } .games { grid-template-columns: 1fr; } .stats { gap: 8px; } .stat { padding: 13px; } .stat strong { font-size: 21px; } .score-row { grid-template-columns: repeat(2,1fr); } }
.leaderboard-header { padding: 28px; border: 1px solid #49356f; border-radius: 20px; background: linear-gradient(115deg,#21163d,#17132d 65%,#312052); margin-bottom: 20px; }
.leaderboard-header p { color: #bcb4d7; line-height: 1.6; }
.local-pill { display: inline-block; padding: 8px 12px; border: 1px solid #7054a5; border-radius: 20px; color: #c4b5fd; font-size: 11px; letter-spacing: 1px; }
.leaderboard-tabs { display: flex; flex-wrap: wrap; gap: 9px; margin: 18px 0; }
.leaderboard-tab { border: 1px solid #494064; border-radius: 10px; background: #171329; color: #c4b5fd; padding: 10px 14px; }
.leaderboard-tab.active { background: #7046c7; border-color: #a78bfa; color: white; }
.leaderboard-row { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 15px; padding: 17px 12px; border-bottom: 1px solid #30294a; }
.leaderboard-row:last-child { border-bottom: 0; }
.leaderboard-row small { display: block; color: #9691ad; margin-top: 5px; }
.leaderboard-value { color: #c4b5fd; font-size: 18px; }
.leaderboard-status { color: #9691ad; font-size: 11px; text-align: right; }
.leaderboard-note { margin-top: 18px; padding: 15px; border-radius: 12px; background: #211b35; color: #aaa4c4; font-size: 12px; line-height: 1.6; }
@media(max-width:620px) { .leaderboard-row { grid-template-columns: 1fr auto; } .leaderboard-status { grid-column: 1 / -1; text-align: left; } }

`;

export default function App() {
  const [page, setPage] = useState<Game>("dashboard");
  const [playerName, setPlayerName] = useState(() => localStorage.getItem("sa-player-name") || "Player");
  const [playerId] = useState(() => {
    const existing = localStorage.getItem("sa-player-id");
    if (existing) return existing;
    const created = "SA-" + Math.random().toString(36).slice(2, 10).toUpperCase();
    localStorage.setItem("sa-player-id", created);
    return created;
  });
  const [nearAccount, setNearAccount] = useState(() => localStorage.getItem("sa-near-account") || "");
  const [walletMessage, setWalletMessage] = useState("Connect your NEAR wallet on testnet.");
  const [profileMessage, setProfileMessage] = useState("");
  const nearConnectorRef = useRef<NearConnector | null>(null);
  const [bestReflex, setBestReflex] = useState(Number(localStorage.getItem("sa-reflex") || 0));
  const [bestMemory, setBestMemory] = useState(Number(localStorage.getItem("sa-memory") || 0));
  const [bestPrecision, setBestPrecision] = useState(Number(localStorage.getItem("sa-precision") || 0));
  const [bestClutch, setBestClutch] = useState(Number(localStorage.getItem("sa-clutch") || 0));

  useEffect(() => {
    function handleClutchScore(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.type !== "SKILLARENA_CLUTCH_SCORE" ||
          typeof data.score !== "number" || !Number.isFinite(data.score)) return;

      const previousBest = Number(localStorage.getItem("sa-clutch") || 0);
      if (data.score > previousBest) {
        void submitOnlineScore("clutch", data.score);
      }

      setBestClutch((current) => {
        const next = Math.max(current, data.score);
        localStorage.setItem("sa-clutch", String(next));
        return next;
      });
    }

    window.addEventListener("message", handleClutchScore);
    return () => window.removeEventListener("message", handleClutchScore);
  }, []);
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<"all" | "reflex" | "memory" | "precision" | "clutch">("all");
  const [onlineScores, setOnlineScores] = useState<Array<{id:number; player_name:string; game:string; score:number; created_at:string}>>([]);
  const [onlineError, setOnlineError] = useState("");

  useEffect(() => {
    const connector = new NearConnector({ network: "testnet" });
    nearConnectorRef.current = connector;

    connector.on("wallet:signIn", ({ accounts, success }) => {
      const accountId = success ? accounts[0]?.accountId : undefined;
      if (accountId) {
        setNearAccount(accountId);
        localStorage.setItem("sa-near-account", accountId);
        setWalletMessage("Wallet connected and account received on NEAR testnet.");
      }
    });

    connector.on("wallet:signOut", () => {
      setNearAccount("");
      localStorage.removeItem("sa-near-account");
      setWalletMessage("Wallet disconnected.");
    });

    void connector.getConnectedWallet().then(({ accounts }) => {
      const accountId = accounts[0]?.accountId;
      if (accountId) {
        setNearAccount(accountId);
        localStorage.setItem("sa-near-account", accountId);
        setWalletMessage("Existing NEAR wallet connection restored.");
      }
    }).catch(() => {
      // No existing wallet connection.
    });

    return () => {
      connector.removeAllListeners();
      nearConnectorRef.current = null;
    };
  }, []);

  async function submitOnlineScore(game: "reflex" | "memory" | "precision" | "clutch", score: number) {
    const { error } = await supabase.from("leaderboard").insert({
      player_name: localStorage.getItem("sa-player-name") || "Player",
      game,
      score
    });
    if (error) console.error("Online score submission failed:", error.message);
  }

  async function connectNearWallet() {
    const connector = nearConnectorRef.current;
    if (!connector) {
      setWalletMessage("Wallet connector is still initializing. Try again.");
      return;
    }

    setWalletMessage("Waiting for wallet connection...");
    try {
      await connector.connect();
      const connected = await connector.getConnectedWallet();
      const accountId = connected.accounts[0]?.accountId;

      if (!accountId) {
        throw new Error("No NEAR account was returned by the wallet.");
      }

      setNearAccount(accountId);
      localStorage.setItem("sa-near-account", accountId);
      setWalletMessage("Wallet connected successfully on NEAR testnet.");
    } catch (error) {
      setWalletMessage(error instanceof Error ? error.message : "Wallet connection was cancelled or failed.");
    }
  }

  async function disconnectNearWallet() {
    const connector = nearConnectorRef.current;
    if (!connector) return;

    try {
      const connected = await connector.getConnectedWallet();
      await connector.disconnect(connected.wallet);
      setNearAccount("");
      localStorage.removeItem("sa-near-account");
      setWalletMessage("Wallet disconnected.");
    } catch (error) {
      setWalletMessage(error instanceof Error ? error.message : "Could not disconnect wallet.");
    }
  }

  function savePlayerProfile() {
    const cleanName = playerName.trim().slice(0, 20) || "Player";
    setPlayerName(cleanName);
    localStorage.setItem("sa-player-name", cleanName);
    localStorage.removeItem("sa-near-manual");
    setProfileMessage("Profile saved on this device.");
  }

  useEffect(() => {
    let cancelled = false;

    async function loadOnlineScores() {
      let result;

      if (selectedLeaderboard === "all") {
        result = await supabase.from("leaderboard")
          .select("id, player_name, game, score, created_at")
          .order("created_at", { ascending: false }).limit(50);
      } else if (selectedLeaderboard === "reflex") {
        result = await supabase.from("leaderboard")
          .select("id, player_name, game, score, created_at")
          .eq("game", "reflex")
          .order("score", { ascending: true }).limit(50);
      } else {
        result = await supabase.from("leaderboard")
          .select("id, player_name, game, score, created_at")
          .eq("game", selectedLeaderboard)
          .order("score", { ascending: false }).limit(50);
      }

      if (cancelled) return;

      if (result.error) {
        setOnlineError(result.error.message);
        setOnlineScores([]);
      } else {
        setOnlineError("");
        setOnlineScores(result.data || []);
      }
    }

    void loadOnlineScores();
    return () => { cancelled = true; };
  }, [selectedLeaderboard]);

  // Reflex Rush
  const [reflexState, setReflexState] = useState<"ready" | "waiting" | "go" | "result">("ready");
  const [reflexTime, setReflexTime] = useState(0);
  const [reflexMessage, setReflexMessage] = useState("Press start when you're ready.");
  const reflexStart = useRef(0);
  const reflexTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function startReflex() {
    if (reflexTimer.current) clearTimeout(reflexTimer.current);
    setReflexState("waiting");
    setReflexMessage("Wait for the screen to turn green...");
    const delay = 1800 + Math.random() * 3000;
    reflexTimer.current = setTimeout(() => {
      reflexStart.current = Date.now();
      setReflexState("go");
      setReflexMessage("TAP NOW!");
    }, delay);
  }

  function tapReflex() {
    if (reflexState === "waiting") {
      if (reflexTimer.current) clearTimeout(reflexTimer.current);
      setReflexState("result");
      setReflexMessage("Too early! Wait for green next time.");
    } else if (reflexState === "go") {
      const result = Date.now() - reflexStart.current;
      setReflexTime(result);
      setReflexState("result");
      setReflexMessage(`Your reaction time: ${result} ms`);
      if (!bestReflex || result < bestReflex) {
        setBestReflex(result);
        localStorage.setItem("sa-reflex", String(result));
        void submitOnlineScore("reflex", result);
      }
    }
  }

  // Memory Matrix
  const [sequence, setSequence] = useState<number[]>([]);
  const [memoryRound, setMemoryRound] = useState(0);
  const [memoryInput, setMemoryInput] = useState(0);
  const [litTile, setLitTile] = useState(-1);
  const [memoryStatus, setMemoryStatus] = useState("Start a round and remember the glowing tiles.");
  const [memoryPlaying, setMemoryPlaying] = useState(false);
  const memoryLock = useRef(false);

  function showSequence(seq: number[]) {
    setMemoryPlaying(true);
    setMemoryInput(0);
    setMemoryStatus("Watch the sequence...");
    memoryLock.current = true;
    seq.forEach((tile, index) => {
      setTimeout(() => setLitTile(tile), 550 + index * 750);
      setTimeout(() => setLitTile(-1), 1050 + index * 750);
    });
    setTimeout(() => {
      memoryLock.current = false;
      setMemoryStatus("Your turn! Repeat the sequence.");
    }, 550 + seq.length * 750);
  }

  function startMemory() {
    const next = [...sequence, Math.floor(Math.random() * 16)];
    setSequence(next);
    setMemoryRound(next.length);
    showSequence(next);
  }

  function chooseTile(tile: number) {
    if (!memoryPlaying || memoryLock.current) return;
    setLitTile(tile);
    setTimeout(() => setLitTile(-1), 180);
    if (tile !== sequence[memoryInput]) {
      setMemoryPlaying(false);
      setMemoryStatus(`Game over! You reached round ${memoryRound}.`);
      if (memoryRound > bestMemory) {
        setBestMemory(memoryRound);
        localStorage.setItem("sa-memory", String(memoryRound));
        void submitOnlineScore("memory", memoryRound);
      }
      return;
    }
    const nextInput = memoryInput + 1;
    setMemoryInput(nextInput);
    if (nextInput === sequence.length) {
      setMemoryPlaying(false);
      setMemoryStatus("Perfect! You remembered the full sequence.");
      setTimeout(() => startMemory(), 900);
    }
  }

  // Precision Strike
  const [precisionStatus, setPrecisionStatus] = useState<"ready" | "playing" | "finished">("ready");
  const [precisionTime, setPrecisionTime] = useState(30);
  const [precisionScore, setPrecisionScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [targetPosition, setTargetPosition] = useState({ x: 50, y: 50 });

  useEffect(() => {
    if (precisionStatus !== "playing") return;
    const timer = setInterval(() => {
      setPrecisionTime((current) => {
        if (current <= 1) {
          clearInterval(timer);
          setPrecisionStatus("finished");
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [precisionStatus]);

  function startPrecision() {
    setPrecisionScore(0);
    setHits(0);
    setMisses(0);
    setStreak(0);
    setPrecisionTime(30);
    setTargetPosition({ x: 50, y: 50 });
    setPrecisionStatus("playing");
  }

  function moveTarget() {
    setTargetPosition({
      x: 10 + Math.random() * 80,
      y: 12 + Math.random() * 76,
    });
  }

  function hitTarget(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (precisionStatus !== "playing") return;
    const nextStreak = streak + 1;
    const points = 10 + Math.min(nextStreak - 1, 5) * 2;
    const nextScore = precisionScore + points;
    setStreak(nextStreak);
    setHits(hits + 1);
    setPrecisionScore(nextScore);
    if (nextScore > bestPrecision) {
      setBestPrecision(nextScore);
      localStorage.setItem("sa-precision", String(nextScore));
      void submitOnlineScore("precision", nextScore);
    }
    moveTarget();
  }

  function missTarget() {
    if (precisionStatus !== "playing") return;
    setMisses((current) => current + 1);
    setStreak(0);
  }

  const accuracy = hits + misses === 0 ? 100 : Math.round((hits / (hits + misses)) * 100);

  function openGame(game: Game) {
    setPage(game);
  }

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <aside className="sidebar">
          <div className="logo">SKILL<span>ARENA</span></div>
          <nav>
            <div className="side-label">MAIN MENU</div>
            <button className={`nav-btn ${page === "dashboard" ? "active" : ""}`} onClick={() => setPage("dashboard")}>⌂ Dashboard</button>
            <button className="nav-btn" onClick={() => setPage("dashboard")}>♧ Games</button>
            <button className={`nav-btn ${page === "leaderboard" ? "active" : ""}`} onClick={() => setPage("leaderboard")}>♛ Leaderboard</button>
            <button className={`nav-btn ${page === "profile" ? "active" : ""}`} onClick={() => setPage("profile")}>◉ Profile</button>
          </nav>
          <div className="sidebar-bottom">
            <strong>YOUR ARENA</strong><br />
            Train your skills. Beat your best. Climb the rankings.
          </div>
        </aside>

        <main className="main">
          <div className="topbar">
            <div>
              <div className="eyebrow">COMPETE • IMPROVE • DOMINATE</div>
              <div className="muted" style={{ fontSize: 13, marginTop: 5 }}>Your skill gaming arena</div>
            </div>
            <button className="profile" onClick={() => setPage("profile")}>◉ {playerName}</button>
          </div>

          {page === "dashboard" && (
            <>
              <section className="hero">
                <div className="eyebrow">WELCOME TO THE ARENA</div>
                <h1>Every millisecond counts.</h1>
                <p>Challenge your reflexes, sharpen your memory and prove your precision. Your next personal best starts here.</p>
                <button className="primary" onClick={() => setPage("reflex")}>Enter the Arena →</button>
              </section>

              <section className="stats">
                <div className="stat"><small>GAMES AVAILABLE</small><strong>04</strong></div>
                <div className="stat"><small>PERSONAL BESTS</small><strong>{[bestReflex, bestMemory, bestPrecision, bestClutch].filter(Boolean).length}/4</strong></div>
                <div className="stat"><small>ARENA STATUS</small><strong style={{ color: "#86efac" }}>● Live</strong></div>
              </section>

              <div className="section-head">
                <div><div className="eyebrow">CHOOSE YOUR CHALLENGE</div><h2>Featured Games</h2></div>
                <span className="muted" style={{ fontSize: 12 }}>4 games available</span>
              </div>

              <section className="games">
                <div className="game-card">
                  <div className="game-icon">⚡</div>
                  <h3>Reflex Rush</h3>
                  <p>Test your reaction speed. Wait for the signal and strike at the perfect moment.</p>
                  <button className="primary" onClick={() => openGame("reflex")}>Play now →</button>
                </div>
                <div className="game-card">
                  <div className="game-icon">▦</div>
                  <h3>Memory Matrix</h3>
                  <p>Memorize increasingly difficult patterns and see how far your focus can take you.</p>
                  <button className="primary" onClick={() => openGame("memory")}>Play now →</button>
                </div>
                <div className="game-card">
                  <div className="game-icon">◎</div>
                  <h3>Precision Strike</h3>
                  <p>Hit moving targets, build streaks and score as many points as possible in 30 seconds.</p>
                  <button className="primary" onClick={() => openGame("precision")}>Play now →</button>
                </div>
              
                <div className="game-card">
                  <div className="game-icon">🏀</div>
                  <h3>Clutch Shot</h3>
                  <p>Step onto the 3D court. Aim with a swipe, release your shot and build your scoring streak.</p>
                  <button className="primary" onClick={() => openGame("clutch")}>Play now →</button>
                </div>
              </section>

              <div className="section-head"><h2>Your Personal Records</h2></div>
              <section className="stats">
                <div className="stat"><small>BEST REFLEX</small><strong>{bestReflex ? `${bestReflex} ms` : "—"}</strong></div>
                <div className="stat"><small>BEST MEMORY ROUND</small><strong>{bestMemory || "—"}</strong></div>
                <div className="stat"><small>BEST PRECISION SCORE</small><strong>{bestPrecision || "—"}</strong></div>
                <div className="stat"><small>BEST CLUTCH SHOT</small><strong>{bestClutch || "—"}</strong></div>
              </section>
            </>
          )}

          {page === "profile" && (
            <section className="game-view">
              <button className="back" onClick={() => setPage("dashboard")}>← Back to arena</button>

              <div className="leaderboard-header">
                <div className="eyebrow">SKILLARENA IDENTITY</div>
                <h1>Player Profile</h1>
                <p>Your gaming identity, personal details and NEAR wallet connection.</p>
              </div>

              <div className="panel" style={{ display: "grid", gap: 16, marginBottom: 18 }}>
                <div>
                  <div className="eyebrow">PLAYER ID</div>
                  <h2 style={{ marginTop: 8 }}>{playerId}</h2>
                  <p className="muted">Your permanent SkillArena ID on this device.</p>
                </div>

                <label style={{ display: "grid", gap: 8, color: "#c4b5fd" }}>
                  Custom Player Name
                  <input
                    value={playerName}
                    maxLength={20}
                    onChange={(event) => setPlayerName(event.target.value)}
                    placeholder="Enter your gaming name"
                    style={{ width: "100%", padding: 13, borderRadius: 10, border: "1px solid #494064", background: "#090914", color: "white" }}
                  />
                </label>

                <button className="primary" onClick={savePlayerProfile}>Save Player Profile</button>
                {profileMessage && <p className="muted">{profileMessage}</p>}
              </div>

              <div className="panel" style={{ display: "grid", gap: 14 }}>
                <div className="eyebrow">NEAR WALLET CONNECTION</div>
                <h2>Connect your wallet</h2>
                <p className="muted">Connect your NEAR wallet on testnet to link your player profile.</p>

                {nearAccount ? (
                  <>
                    <div style={{ padding: 14, borderRadius: 12, background: "#102b22", border: "1px solid #276749", overflowWrap: "anywhere" }}>
                      <div style={{ color: "#86efac", fontSize: 12, marginBottom: 7 }}>CONNECTED WALLET · TESTNET</div>
                      <strong>{nearAccount}</strong>
                    </div>
                    <button className="secondary" onClick={() => void disconnectNearWallet()}>Disconnect Wallet</button>
                  </>
                ) : (
                  <button className="primary" onClick={() => void connectNearWallet()}>Connect NEAR Wallet</button>
                )}

                <p className="muted" style={{ fontSize: 12 }}>{walletMessage}</p>

              </div>
            </section>
          )}

          {page === "leaderboard" && (
            <section className="game-view">
              <button className="back" onClick={() => setPage("dashboard")}>← Back to Dashboard</button>
              <div className="leaderboard-header">
                <div className="eyebrow">THE ARENA RANKINGS</div>
                <h1>Leaderboard</h1>
                <p>Track your best performance across all four SkillArena games.</p>
                <span className="local-pill">ONLINE RANKINGS · PUBLIC PROTOTYPE</span>
              </div>

              <div className="leaderboard-tabs">
                {(["all", "reflex", "memory", "precision", "clutch"] as const).map((tab) => (
                  <button
                    key={tab}
                    className={`leaderboard-tab ${selectedLeaderboard === tab ? "active" : ""}`}
                    onClick={() => setSelectedLeaderboard(tab)}
                  >
                    {tab === "all" ? "All Games" : tab === "reflex" ? "Reflex Rush" : tab === "memory" ? "Memory Matrix" : tab === "precision" ? "Precision Strike" : "Clutch Shot"}
                  </button>
                ))}
              </div>

              <div className="panel">
                <div className="section-head">
                  <h2>{selectedLeaderboard === "all" ? "Your Game Records" : selectedLeaderboard === "reflex" ? "Reflex Rush" : selectedLeaderboard === "memory" ? "Memory Matrix" : selectedLeaderboard === "precision" ? "Precision Strike" : "Clutch Shot"}</h2>
                  <span className="muted" style={{ fontSize: 12 }}>Player One</span>
                </div>

                {[
                  { id: "reflex", name: "Reflex Rush", record: bestReflex ? `${bestReflex} ms` : "—", detail: "Fastest reaction time · lower is better" },
                  { id: "memory", name: "Memory Matrix", record: bestMemory ? `Round ${bestMemory}` : "—", detail: "Highest completed round" },
                  { id: "precision", name: "Precision Strike", record: bestPrecision ? String(bestPrecision) : "—", detail: "Highest score" },
                  { id: "clutch", name: "Clutch Shot", record: bestClutch ? String(bestClutch) : "—", detail: "Highest solo challenge score" }
                ].filter((entry) => selectedLeaderboard === "all" || entry.id === selectedLeaderboard).map((entry) => (
                  <div className="leaderboard-row" key={entry.id}>
                    <div>
                      <strong>{entry.name}</strong>
                      <small>{entry.detail}</small>
                    </div>
                    <strong className="leaderboard-value">{entry.record}</strong>
                    <span className="leaderboard-status">
                      {entry.record === "—" ? "No record yet" : "Personal best"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="panel" style={{ marginTop: 18 }}>
                <div className="section-head">
                  <h2>Global Player Rankings</h2>
                  <span className="muted" style={{ fontSize: 12 }}>SUPABASE · TOP 50</span>
                </div>

                {onlineError && <p className="leaderboard-note">Could not load rankings: {onlineError}</p>}

                {!onlineError && onlineScores.length === 0 && (
                  <p className="leaderboard-note">No online scores yet. Set a new personal best to appear here.</p>
                )}

                {onlineScores.map((entry, index) => (
                  <div className="leaderboard-row" key={entry.id}>
                    <div>
                      <strong>#{index + 1} · {entry.player_name}</strong>
                      <small>
                        {entry.game === "reflex" ? "Reflex Rush" : entry.game === "memory" ? "Memory Matrix" : entry.game === "precision" ? "Precision Strike" : "Clutch Shot"}
                      </small>
                    </div>
                    <strong className="leaderboard-value">
                      {entry.game === "reflex" ? entry.score + " ms" : entry.score}
                    </strong>
                    <span className="leaderboard-status">ONLINE</span>
                  </div>
                ))}
              </div>

              <div className="leaderboard-note">
                Personal records remain saved on this device. Online rankings are shared through Supabase. Reflex Rush ranks lower times first; the other games rank higher scores first. Public score submissions are currently a prototype and are not cheat-proof.
              </div>
            </section>
          )}

          {page === "reflex" && (
            <section className="game-view">
              <button className="back" onClick={() => setPage("dashboard")}>← Back to Dashboard</button>
              <div className="game-box">
                <div className="eyebrow">REACTION CHALLENGE</div>
                <h1>Reflex Rush</h1>
                <p>Wait for green. Tap as quickly as you can.</p>
                <div className="status">{reflexMessage}</div>
                <button
                  onClick={reflexState === "go" || reflexState === "waiting" ? tapReflex : startReflex}
                  style={{
                    width: "100%", maxWidth: 520, height: 210, border: "2px solid #59477c",
                    borderRadius: 18, color: "white", fontSize: 25, fontWeight: 900,
                    background: reflexState === "go" ? "linear-gradient(135deg,#15803d,#22c55e)" : "linear-gradient(135deg,#282044,#171329)",
                  }}
                >
                  {reflexState === "go" ? "TAP NOW!" : reflexState === "waiting" ? "WAIT..." : reflexState === "result" ? `${reflexTime ? `${reflexTime} ms` : "TOO EARLY"}` : "START"}
                </button>
                <div className="big-number">{reflexTime ? `${reflexTime} ms` : "—"}</div>
                <p>Personal best: {bestReflex ? `${bestReflex} ms` : "Not set yet"}</p>
                <button className="primary" onClick={startReflex}>Try again</button>
              </div>
            </section>
          )}

          {page === "memory" && (
            <section className="game-view">
              <button className="back" onClick={() => setPage("dashboard")}>← Back to Dashboard</button>
              <div className="game-box">
                <div className="eyebrow">FOCUS CHALLENGE</div>
                <h1>Memory Matrix</h1>
                <p>Watch the glowing tiles, then repeat the sequence.</p>
                <div className="score-row">
                  <div className="score-cell"><small>ROUND</small><strong>{memoryRound}</strong></div>
                  <div className="score-cell"><small>BEST ROUND</small><strong>{bestMemory}</strong></div>
                </div>
                <div className="status">{memoryStatus}</div>
                <div className="memory-grid">
                  {Array.from({ length: 16 }, (_, i) => (
                    <button key={i} className={`memory-tile ${litTile === i ? "lit" : ""}`} onClick={() => chooseTile(i)} disabled={!memoryPlaying || memoryLock.current}>
                      {litTile === i ? "✦" : ""}
                    </button>
                  ))}
                </div>
                <button className="primary" onClick={() => { setSequence([]); setMemoryRound(0); startMemory(); }} disabled={memoryPlaying}>
                  {memoryRound ? "Start next round" : "Start game"}
                </button>
              </div>
            </section>
          )}

          {page === "precision" && (
            <section className="game-view">
              <button className="back" onClick={() => setPage("dashboard")}>← Back to Dashboard</button>
              <div className="game-box">
                <div className="eyebrow">ACCURACY CHALLENGE</div>
                <h1>Precision Strike</h1>
                <p>Strike the targets. Build a streak. Beat the clock.</p>
                <div className="score-row">
                  <div className="score-cell"><small>SCORE</small><strong>{precisionScore}</strong></div>
                  <div className="score-cell"><small>TIME LEFT</small><strong>{precisionTime}s</strong></div>
                  <div className="score-cell"><small>STREAK</small><strong>{streak}×</strong></div>
                  <div className="score-cell"><small>ACCURACY</small><strong>{accuracy}%</strong></div>
                </div>
                <div className="status">
                  {precisionStatus === "ready" ? "Ready? You have 30 seconds. Hit as many targets as you can." : precisionStatus === "playing" ? "Target acquired. Strike!" : "Time's up! Check your results below."}
                </div>
                <div className="arena" onClick={missTarget}>
                  {precisionStatus === "playing" && (
                    <button
                      className="target"
                      aria-label="Hit target"
                      onClick={hitTarget}
                      style={{ left: `${targetPosition.x}%`, top: `${targetPosition.y}%` }}
                    />
                  )}
                  {precisionStatus !== "playing" && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#b9add7" }}>{precisionStatus === "finished" ? "ROUND COMPLETE" : "TARGET ARENA"}</div>}
                </div>
                {precisionStatus === "finished" && (
                  <div className="panel" style={{ marginBottom: 18 }}>
                    <h2>Round results</h2>
                    <div className="score-row">
                      <div className="score-cell"><small>FINAL SCORE</small><strong>{precisionScore}</strong></div>
                      <div className="score-cell"><small>HITS</small><strong>{hits}</strong></div>
                      <div className="score-cell"><small>MISSES</small><strong>{misses}</strong></div>
                      <div className="score-cell"><small>ACCURACY</small><strong>{accuracy}%</strong></div>
                    </div>
                    <p>Personal best: {bestPrecision}</p>
                  </div>
                )}
                {precisionStatus !== "playing" && <button className="primary" onClick={startPrecision}>{precisionStatus === "finished" ? "Play again" : "Start game"}</button>}
                {precisionStatus === "playing" && <button className="secondary" onClick={() => setPrecisionStatus("finished")}>End round</button>}
                <p className="footer-note">Each hit earns 10 points, with bonus points for consecutive hits.</p>
              </div>
            </section>
          )}
                    {page === "clutch" && (
            <section className="game-view" style={{ maxWidth: "1200px" }}>
              <button className="back" onClick={() => setPage("dashboard")}>← Back to Dashboard</button>
              <div style={{ height: "min(78vh, 850px)", minHeight: "540px", overflow: "hidden", border: "1px solid #30294a", borderRadius: "18px", background: "#080d13" }}>
                <iframe title="Clutch Shot 3D Basketball" src="/clutch-shot.html" style={{ width: "100%", height: "100%", border: 0, display: "block" }} allow="autoplay; fullscreen" />
              </div>
            </section>
          )}

<div className="footer-note">SKILLARENA · TRAIN YOUR SKILLS · OWN YOUR RECORDS</div>
        </main>
      </div>
    </>
  );
}

