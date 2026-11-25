(() => {
  const VERSION = "0.1.7";
  const HOST_ID = "ag-star-capsule-host";
  const STORE_KEY = "ag_star_capsule_prefs_v2";

  const loadPrefs = () => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {};
  };

  const savePrefs = (patch) => {
    try {
      const next = Object.assign(loadPrefs(), patch);
      localStorage.setItem(STORE_KEY, JSON.stringify(next));
    } catch (_) {}
  };

  const detectHostTheme = () => {
    try {
      const root = document.documentElement;
      const body = document.body;
      if (root.classList.contains("dark") || body.classList.contains("dark") || root.dataset.theme === "dark") {
        return "dark";
      }
      const bg = getComputedStyle(body).backgroundColor || "";
      const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m) {
        const lum = 0.299 * Number(m[1]) + 0.587 * Number(m[2]) + 0.114 * Number(m[3]);
        return lum < 140 ? "dark" : "light";
      }
    } catch (_) {}
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const fmtTokens = (n) => {
    if (n == null || !isFinite(n)) return "—";
    if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.00$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
    return String(Math.round(n));
  };

  const fmtCountdownMs = (ms) => {
    if (ms == null || !isFinite(ms)) return "";
    const sec = Math.max(0, Math.floor(ms / 1000));
    if (sec <= 60) return "即将重置";
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d > 0) return `${d}天${h}时`;
    if (h > 0) return `${h}时${m}分`;
    return `${m}分`;
  };

  const shortModel = (name) => {
    if (!name) return "等待对话";
    return String(name).replace(/^models\//i, "").trim();
  };

  const formatGroupName = (g) => {
    const id = String((g && g.id) || "").toLowerCase();
    const raw = String((g && g.name) || "").trim();
    if (id === "gemini" || raw.toLowerCase() === "gemini") return "Gemini 共享池";
    if (id === "3p" || raw.toLowerCase() === "3p") return "Claude / 第三方池";
    return raw || id || "共享额度池";
  };

  const STYLES = `
    :host {
      all: initial;
      position: fixed;
      z-index: 2147483000;
      pointer-events: none;
      font-family: "Segoe UI", "Microsoft YaHei UI", -apple-system, BlinkMacSystemFont, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    * { box-sizing: border-box; user-select: none; -webkit-user-select: none; }

    .wrap {
      --glass-pill: linear-gradient(135deg, rgba(255, 255, 255, 0.76) 0%, rgba(242, 246, 255, 0.62) 55%, rgba(249, 244, 255, 0.70) 100%);
      --glass-card: linear-gradient(155deg, rgba(255, 255, 255, 0.82) 0%, rgba(241, 246, 255, 0.72) 52%, rgba(248, 244, 255, 0.78) 100%);
      --glass-sub: rgba(255, 255, 255, 0.58);
      --glass-btn: rgba(255, 255, 255, 0.66);
      --glass-btn-hover: rgba(255, 255, 255, 0.90);
      --glass-border: rgba(255, 255, 255, 0.90);
      --glass-rim: rgba(99, 102, 241, 0.22);
      --glass-top: rgba(255, 255, 255, 0.96);
      --glass-sheen: linear-gradient(135deg, rgba(255, 255, 255, 0.74) 0%, rgba(255, 255, 255, 0.18) 36%, rgba(255, 255, 255, 0) 64%);
      --shadow-pill: 0 10px 28px rgba(79, 70, 229, 0.13), 0 2px 8px rgba(15, 23, 42, 0.06), inset 0 1px 0 var(--glass-top), inset 0 -1px 0 rgba(99, 102, 241, 0.10);
      --shadow-card: 0 20px 48px rgba(59, 66, 128, 0.17), 0 4px 14px rgba(15, 23, 42, 0.07), inset 0 1px 0 var(--glass-top), inset 0 -1px 0 rgba(99, 102, 241, 0.12);
      --text: #0f172a;
      --muted: #5b6b84;
      --sep: rgba(99, 102, 241, 0.14);
      --track: rgba(15, 23, 42, 0.08);
      --rainbow: linear-gradient(90deg, #60a5fa 0%, #a78bfa 38%, #fb923c 74%, #34d399 100%);
      --ring: linear-gradient(135deg, #60a5fa, #a78bfa, #fb923c, #34d399);
      --accent-blue: #2563eb;
      --accent-purple: #7c3aed;
      --accent-green: #059669;
      --accent-amber: #d97706;
      --accent-red: #e11d48;
      --orb-a: rgba(96, 165, 250, 0.30);
      --orb-b: rgba(167, 139, 250, 0.28);
      --orb-c: rgba(52, 211, 153, 0.20);
      --q-flow-1: #34d399;
      --q-flow-2: #a7f3d0;
      --q-flow-3: #059669;
      --q-glow: rgba(16, 185, 129, 0.46);
      --q-glow-soft: rgba(52, 211, 153, 0.24);
      position: relative;
      height: 44px;
      pointer-events: none;
      color: var(--text);
    }
    .wrap.dark {
      --glass-pill: linear-gradient(135deg, rgba(24, 34, 56, 0.76) 0%, rgba(18, 25, 44, 0.68) 60%, rgba(28, 26, 52, 0.74) 100%);
      --glass-card: linear-gradient(155deg, rgba(22, 31, 52, 0.84) 0%, rgba(15, 23, 40, 0.80) 55%, rgba(24, 24, 48, 0.84) 100%);
      --glass-sub: rgba(255, 255, 255, 0.065);
      --glass-btn: rgba(255, 255, 255, 0.085);
      --glass-btn-hover: rgba(255, 255, 255, 0.16);
      --glass-border: rgba(255, 255, 255, 0.20);
      --glass-rim: rgba(167, 139, 250, 0.28);
      --glass-top: rgba(255, 255, 255, 0.28);
      --glass-sheen: linear-gradient(135deg, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.04) 36%, rgba(255, 255, 255, 0) 64%);
      --shadow-pill: 0 12px 32px rgba(0, 0, 0, 0.48), 0 2px 10px rgba(0, 0, 0, 0.26), inset 0 1px 0 var(--glass-top), inset 0 -1px 0 rgba(167, 139, 250, 0.16);
      --shadow-card: 0 22px 52px rgba(0, 0, 0, 0.58), 0 4px 16px rgba(0, 0, 0, 0.32), inset 0 1px 0 var(--glass-top), inset 0 -1px 0 rgba(167, 139, 250, 0.18);
      --text: #f1f5f9;
      --muted: #9eb0c9;
      --sep: rgba(255, 255, 255, 0.11);
      --track: rgba(255, 255, 255, 0.11);
      --accent-blue: #60a5fa;
      --accent-purple: #c4b5fd;
      --accent-green: #34d399;
      --accent-amber: #fbbf24;
      --accent-red: #fb7185;
      --orb-a: rgba(96, 165, 250, 0.24);
      --orb-b: rgba(167, 139, 250, 0.26);
      --orb-c: rgba(52, 211, 153, 0.16);
    }

    /* 额度流光三档配色：绿宽裕 / 橙中等 / 红吃紧 / 离线星蓝 */
    .wrap.q-green {
      --q-flow-1: #34d399;
      --q-flow-2: #a7f3d0;
      --q-flow-3: #059669;
      --q-glow: rgba(16, 185, 129, 0.48);
      --q-glow-soft: rgba(52, 211, 153, 0.24);
    }
    .wrap.q-orange {
      --q-flow-1: #fb923c;
      --q-flow-2: #fde68a;
      --q-flow-3: #ea580c;
      --q-glow: rgba(249, 115, 22, 0.52);
      --q-glow-soft: rgba(251, 146, 60, 0.26);
    }
    .wrap.q-red {
      --q-flow-1: #fb7185;
      --q-flow-2: #fecdd3;
      --q-flow-3: #e11d48;
      --q-glow: rgba(244, 63, 94, 0.60);
      --q-glow-soft: rgba(251, 113, 133, 0.30);
    }
    .wrap.q-idle {
      --q-flow-1: #60a5fa;
      --q-flow-2: #c4b5fd;
      --q-flow-3: #818cf8;
      --q-glow: rgba(99, 102, 241, 0.36);
      --q-glow-soft: rgba(167, 139, 250, 0.20);
    }

    /* 贴边锚点对齐：彻底告别切态时的 JS 二次跳位 */
    .pill, .orb {
      position: absolute;
      top: 50%;
      will-change: transform, opacity;
    }
    .wrap.anchor-right .pill,
    .wrap.anchor-right .orb {
      right: 0;
      left: auto;
      transform-origin: right center;
    }
    .wrap.anchor-left .pill,
    .wrap.anchor-left .orb {
      left: 0;
      right: auto;
      transform-origin: left center;
    }

    /* ========== 图层一：横条液态玻璃胶囊（纯 GPU 切换） ========== */
    .pill {
      height: 38px;
      padding: 4px 10px 4px 5px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 9px;
      background: var(--glass-pill);
      backdrop-filter: blur(22px) saturate(195%);
      -webkit-backdrop-filter: blur(22px) saturate(195%);
      border: 1px solid var(--glass-border);
      box-shadow: var(--shadow-pill);
      cursor: grab;
      overflow: hidden;
      pointer-events: auto;
      opacity: 1;
      visibility: visible;
      transform: translate3d(0, -50%, 0) scale(1);
      transition:
        transform 0.26s cubic-bezier(0.22, 1.18, 0.36, 1),
        opacity 0.18s ease,
        visibility 0s linear 0s,
        border-color 0.22s ease;
    }
    .pill::before {
      content: "";
      position: absolute;
      inset: 0;
      background: var(--glass-sheen);
      pointer-events: none;
      z-index: 1;
    }
    .pill::after {
      content: "";
      position: absolute;
      inset: -1px;
      border-radius: inherit;
      background: radial-gradient(60% 120% at 12% 0%, var(--orb-a), transparent 65%),
                  radial-gradient(55% 120% at 92% 100%, var(--orb-b), transparent 65%);
      pointer-events: none;
      opacity: 0.50;
      z-index: 0;
    }
    .pill > * { position: relative; z-index: 2; }
    .pill:hover {
      transform: translate3d(0, calc(-50% - 1px), 0) scale(1);
      border-color: var(--glass-rim);
    }
    .pill.dragging {
      cursor: grabbing;
      transition: none;
      transform: translate3d(0, -50%, 0) scale(1.02);
    }
    .pill.warn {
      border-color: rgba(245, 158, 11, 0.78);
      animation: amberPulse 2.4s ease-in-out infinite;
    }
    @keyframes amberPulse {
      0%, 100% { box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.16), 0 10px 28px rgba(245, 158, 11, 0.22), inset 0 1px 0 var(--glass-top); }
      50% { box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.28), 0 12px 34px rgba(245, 158, 11, 0.34), inset 0 1px 0 var(--glass-top); }
    }

    /* 切到圆球时：横条纯 GPU 丝滑隐退 */
    .wrap.is-orb .pill {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transform: translate3d(0, -50%, 0) scale(0.84);
      transition:
        transform 0.18s cubic-bezier(0.4, 0, 0.2, 1),
        opacity 0.15s ease,
        visibility 0s linear 0.18s;
    }

    .avatar-ring {
      padding: 1.8px;
      border-radius: 50%;
      background: var(--ring);
      flex-shrink: 0;
      display: inline-flex;
      box-shadow: 0 2px 10px rgba(139, 92, 246, 0.26);
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .avatar-ring:hover { transform: scale(1.08); }
    .avatar-btn {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      padding: 0;
      border: none;
      background: #131826;
      overflow: hidden;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .avatar-btn img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      pointer-events: none;
    }

    .metrics {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 11.5px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.01em;
      white-space: nowrap;
    }
    .m-item { display: inline-flex; align-items: center; gap: 4px; }
    .m-lbl { font-size: 10px; font-weight: 500; color: var(--muted); }
    .m-val { color: var(--text); font-weight: 700; }
    .m-val.good { color: var(--accent-green); }
    .m-val.mid { color: var(--accent-blue); }
    .m-val.warn { color: var(--accent-amber); }
    .m-val.bad { color: var(--accent-red); }
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--accent-green);
      box-shadow: 0 0 8px var(--accent-green);
    }
    .dot.warn { background: var(--accent-amber); box-shadow: 0 0 8px var(--accent-amber); }
    .dot.bad { background: var(--accent-red); box-shadow: 0 0 8px var(--accent-red); }
    .dot.offline { background: var(--muted); box-shadow: none; }
    .sep { width: 1px; height: 12px; background: var(--sep); }

    .chev {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: none;
      background: transparent;
      color: var(--muted);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
      transition: transform 0.2s ease, background 0.15s ease, color 0.15s ease;
    }
    .chev:hover { background: var(--glass-sub); color: var(--text); }
    .wrap.expanded .chev { transform: rotate(180deg); }

    /* ========== 图层二：三色额度旋转流光水晶球（纯 GPU 切换） ========== */
    .orb {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: grab;
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transform: translate3d(0, -50%, 0) scale(0.64);
      box-shadow: 0 6px 20px var(--q-glow), 0 0 0 1px rgba(255, 255, 255, 0.28);
      transition:
        transform 0.18s cubic-bezier(0.4, 0, 0.2, 1),
        opacity 0.14s ease,
        visibility 0s linear 0.18s,
        box-shadow 0.25s ease;
    }
    .wrap.is-orb .orb {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
      transform: translate3d(0, -50%, 0) scale(1);
      transition:
        transform 0.28s cubic-bezier(0.22, 1.28, 0.36, 1),
        opacity 0.18s ease,
        visibility 0s linear 0s,
        box-shadow 0.25s ease;
    }
    .wrap.is-orb .orb:hover {
      transform: translate3d(0, calc(-50% - 2px), 0) scale(1.07);
      box-shadow: 0 8px 26px var(--q-glow), 0 0 16px var(--q-glow-soft);
    }
    .wrap.is-orb .orb.dragging {
      cursor: grabbing;
      transition: none;
      transform: translate3d(0, -50%, 0) scale(1.04);
    }
    .wrap.is-orb.q-red .orb {
      animation: redOrbBreath 1.8s ease-in-out infinite;
    }
    @keyframes redOrbBreath {
      0%, 100% { box-shadow: 0 4px 16px rgba(244, 63, 94, 0.45), 0 0 0 2px rgba(244, 63, 94, 0.20); }
      50% { box-shadow: 0 6px 26px rgba(244, 63, 94, 0.78), 0 0 0 4px rgba(244, 63, 94, 0.34); }
    }

    .orb-flow {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
    }
    .orb-flow::before {
      content: "";
      position: absolute;
      inset: -40%;
      background: conic-gradient(
        from 0deg,
        var(--q-flow-3) 0deg,
        var(--q-flow-1) 70deg,
        var(--q-flow-2) 130deg,
        var(--q-flow-3) 200deg,
        var(--q-flow-1) 290deg,
        var(--q-flow-2) 335deg,
        var(--q-flow-3) 360deg
      );
      animation: orbSpin 3.2s linear infinite;
      animation-play-state: paused;
      will-change: transform;
    }
    /* 仅当圆球可见且窗口在前台时运转流光，不白耗 GPU */
    .wrap.is-orb:not(.page-hidden) .orb-flow::before {
      animation-play-state: running;
    }
    @keyframes orbSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .orb-face {
      position: relative;
      z-index: 1;
      width: 38px;
      height: 38px;
      border-radius: 50%;
      overflow: hidden;
      background: #131826;
      box-shadow: inset 0 0 0 1.2px rgba(255, 255, 255, 0.48);
    }
    .orb-face::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: linear-gradient(155deg, rgba(255, 255, 255, 0.54) 0%, rgba(255, 255, 255, 0.10) 34%, transparent 56%);
      pointer-events: none;
    }
    .orb-face img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      pointer-events: none;
    }

    /* 圆球悬停液态玻璃预览条 */
    .orb-tip {
      position: absolute;
      top: 50%;
      right: calc(100% + 10px);
      transform: translate3d(6px, -50%, 0) scale(0.95);
      padding: 6px 11px;
      border-radius: 999px;
      background: var(--glass-pill);
      backdrop-filter: blur(20px) saturate(195%);
      -webkit-backdrop-filter: blur(20px) saturate(195%);
      border: 1px solid var(--glass-border);
      box-shadow: var(--shadow-pill);
      font-size: 11px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      color: var(--text);
      opacity: 0;
      pointer-events: none;
      will-change: transform, opacity;
      transition: opacity 0.18s ease, transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
      z-index: 3;
    }
    .wrap.anchor-left .orb-tip {
      right: auto;
      left: calc(100% + 10px);
      transform: translate3d(-6px, -50%, 0) scale(0.95);
    }
    .wrap.is-orb .orb:hover .orb-tip {
      opacity: 1;
      transform: translate3d(0, -50%, 0) scale(1);
    }
    .wrap.is-orb .orb.dragging .orb-tip {
      opacity: 0;
    }

    /* ========== 展开详情液态玻璃浮卡 ========== */
    .popover {
      position: absolute;
      right: 0;
      top: calc(100% + 8px);
      width: 308px;
      padding: 14px 14px 12px;
      border-radius: 22px;
      background: var(--glass-card);
      backdrop-filter: blur(28px) saturate(205%);
      -webkit-backdrop-filter: blur(28px) saturate(205%);
      border: 1px solid var(--glass-border);
      box-shadow: var(--shadow-card);
      overflow: hidden;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      will-change: transform, opacity;
      transform: translate3d(0, -8px, 0) scale(0.95);
      transform-origin: top right;
      transition:
        opacity 0.18s ease,
        transform 0.24s cubic-bezier(0.22, 1.12, 0.36, 1),
        visibility 0s linear 0.24s;
    }
    .popover::before {
      content: "";
      position: absolute;
      inset: 0;
      background: var(--glass-sheen);
      pointer-events: none;
      z-index: 0;
    }
    .wrap.anchor-left .popover {
      right: auto;
      left: 0;
      transform-origin: top left;
    }
    .popover.open-up {
      top: auto;
      bottom: calc(100% + 8px);
      transform: translate3d(0, 8px, 0) scale(0.95);
      transform-origin: bottom right;
    }
    .wrap.anchor-left .popover.open-up {
      transform-origin: bottom left;
    }
    .wrap.expanded .popover {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
      transform: translate3d(0, 0, 0) scale(1);
      transition:
        opacity 0.18s ease,
        transform 0.26s cubic-bezier(0.22, 1.12, 0.36, 1),
        visibility 0s linear 0s;
    }

    .pop-orb {
      position: absolute;
      border-radius: 999px;
      pointer-events: none;
      z-index: 0;
      opacity: 0.9;
    }
    .pop-orb.a { width: 170px; height: 170px; top: -58px; left: -48px; background: radial-gradient(circle, var(--orb-a) 0%, transparent 70%); }
    .pop-orb.b { width: 185px; height: 185px; bottom: -66px; right: -50px; background: radial-gradient(circle, var(--orb-b) 0%, transparent 70%); }
    .pop-orb.c { width: 130px; height: 130px; top: 34%; right: -42px; background: radial-gradient(circle, var(--orb-c) 0%, transparent 70%); }

    .pop-inner { position: relative; z-index: 1; }
    .pop-head { display: flex; align-items: center; gap: 11px; margin-bottom: 11px; }
    .pop-avatar-ring {
      padding: 2px;
      border-radius: 15px;
      background: var(--ring);
      flex-shrink: 0;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(139, 92, 246, 0.25);
      transition: transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .pop-avatar-ring:hover { transform: scale(1.06); }
    .pop-avatar-ring.wiggle { animation: catWiggle 0.42s ease-in-out; }
    @keyframes catWiggle {
      0%, 100% { transform: rotate(0deg) scale(1); }
      25% { transform: rotate(-7deg) scale(1.06); }
      55% { transform: rotate(7deg) scale(1.06); }
      80% { transform: rotate(-4deg) scale(1.02); }
    }
    .pop-avatar { width: 40px; height: 40px; border-radius: 13px; overflow: hidden; background: #131826; }
    .pop-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .pop-meta { min-width: 0; flex: 1; }
    .pop-title-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
    .pop-model { font-size: 12.5px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .live-chip {
      flex-shrink: 0;
      font-size: 9.5px;
      font-weight: 700;
      padding: 1.5px 6px;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.14);
      color: var(--accent-green);
    }
    .live-chip.warn { background: rgba(245, 158, 11, 0.16); color: var(--accent-amber); }
    .live-chip.offline { background: var(--track); color: var(--muted); }
    .pop-say { font-size: 11px; color: var(--muted); margin-top: 2px; line-height: 1.38; }
    .pop-say.warn { color: var(--accent-amber); font-weight: 600; }

    .glass-box {
      padding: 9px 11px;
      border-radius: 14px;
      background: var(--glass-sub);
      border: 1px solid var(--glass-border);
      box-shadow: inset 0 1px 0 var(--glass-top);
      margin-bottom: 8px;
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11.5px;
      margin-bottom: 6px;
      font-variant-numeric: tabular-nums;
    }
    .row:last-child { margin-bottom: 0; }
    .row-l { color: var(--muted); font-weight: 500; display: inline-flex; align-items: center; gap: 5px; }
    .row-r { font-weight: 700; color: var(--text); }
    .badge {
      font-size: 10px;
      padding: 1px 7px;
      border-radius: 999px;
      background: rgba(245, 158, 11, 0.18);
      color: var(--accent-amber);
      font-weight: 700;
    }
    .bar { width: 100%; height: 6px; border-radius: 999px; background: var(--track); overflow: hidden; }
    .bar.sm { height: 5px; }
    .bar-fill {
      height: 100%;
      border-radius: 999px;
      background: var(--rainbow);
      transition: width 0.36s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .bar-fill.warn { background: linear-gradient(90deg, #f59e0b, #fb923c); }
    .bar-fill.bad { background: linear-gradient(90deg, #f43f5e, #fb923c); }

    .grid2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; margin-bottom: 8px; }
    .stat-box {
      padding: 8px 10px;
      border-radius: 13px;
      background: var(--glass-sub);
      border: 1px solid var(--glass-border);
      box-shadow: inset 0 1px 0 var(--glass-top);
      font-variant-numeric: tabular-nums;
    }
    .stat-k { font-size: 10px; color: var(--muted); font-weight: 500; }
    .stat-v { font-size: 13px; font-weight: 700; margin-top: 2px; color: var(--text); }
    .stat-v.c-blue { color: var(--accent-blue); }
    .stat-v.c-purple { color: var(--accent-purple); }
    .stat-v.c-green { color: var(--accent-green); }

    .quota-card {
      padding: 8px 10px;
      border-radius: 13px;
      background: var(--glass-sub);
      border: 1px solid var(--glass-border);
      box-shadow: inset 0 1px 0 var(--glass-top);
      margin-bottom: 7px;
    }
    .quota-card:last-child { margin-bottom: 0; }
    .q-title { font-size: 11px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
    .q-win { margin-bottom: 6px; }
    .q-win:last-child { margin-bottom: 0; }
    .q-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 6px;
      font-size: 10.5px;
      margin-bottom: 3px;
      font-variant-numeric: tabular-nums;
    }
    .q-tag { color: var(--muted); font-weight: 600; flex-shrink: 0; }
    .q-right { text-align: right; }
    .q-val { color: var(--text); font-weight: 700; }
    .q-rst { color: var(--muted); font-weight: 500; font-size: 10px; margin-left: 4px; }
    .q-warn {
      display: inline-block;
      margin-left: 5px;
      font-size: 9.5px;
      font-weight: 700;
      padding: 0.5px 5px;
      border-radius: 999px;
      background: rgba(244, 63, 94, 0.14);
      color: var(--accent-red);
    }

    .pop-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
      padding-top: 9px;
      margin-top: 8px;
      border-top: 1px solid var(--sep);
    }
    .btn {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      border: 1px solid var(--glass-border);
      background: var(--glass-btn);
      box-shadow: inset 0 1px 0 var(--glass-top);
      color: var(--text);
      border-radius: 999px;
      padding: 5px 8px;
      font-size: 10.5px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.12s ease, border-color 0.15s ease;
    }
    .btn:hover { background: var(--glass-btn-hover); border-color: var(--glass-rim); }
    .btn:active { transform: scale(0.95); }

    .spark {
      position: fixed;
      pointer-events: none;
      font-size: 13px;
      font-weight: 700;
      z-index: 2147483600;
      will-change: transform, opacity;
      animation: sparkFly 0.72s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes sparkFly {
      0% { opacity: 1; transform: translate3d(0, 0, 0) scale(0.7) rotate(0deg); }
      100% { opacity: 0; transform: translate3d(var(--dx), var(--dy), 0) scale(1.25) rotate(120deg); }
    }

    /* 戳猫猫弹出的极轻液态玻璃台词气泡（单节点纯 GPU 显隐） */
    .speech-bubble {
      position: absolute;
      right: 0;
      top: calc(100% + 8px);
      max-width: 248px;
      padding: 6px 11px;
      border-radius: 14px;
      background: var(--glass-pill);
      backdrop-filter: blur(20px) saturate(195%);
      -webkit-backdrop-filter: blur(20px) saturate(195%);
      border: 1px solid var(--glass-border);
      box-shadow: var(--shadow-pill);
      font-size: 11px;
      font-weight: 600;
      line-height: 1.4;
      color: var(--text);
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      will-change: transform, opacity;
      transform: translate3d(0, -4px, 0) scale(0.94);
      transform-origin: top right;
      transition: opacity 0.18s ease, transform 0.22s cubic-bezier(0.22, 1.18, 0.36, 1), visibility 0s linear 0.2s;
      z-index: 5;
    }
    .wrap.anchor-left .speech-bubble {
      right: auto;
      left: 0;
      transform-origin: top left;
    }
    .speech-bubble.open-up {
      top: auto;
      bottom: calc(100% + 8px);
      transform: translate3d(0, 4px, 0) scale(0.94);
      transform-origin: bottom right;
    }
    .wrap.anchor-left .speech-bubble.open-up {
      transform-origin: bottom left;
    }
    .speech-bubble.show {
      opacity: 1;
      visibility: visible;
      transform: translate3d(0, 0, 0) scale(1);
      transition: opacity 0.18s ease, transform 0.24s cubic-bezier(0.22, 1.18, 0.36, 1), visibility 0s linear 0s;
    }
    .avatar-ring.wiggle, .orb.wiggle {
      animation: catWiggle 0.44s ease-in-out;
    }
  `;

  let host = null;
  let shadow = null;
  let avatars = {};
  let lastSnap = null;
  let prefs = loadPrefs();
  let expanded = false;
  let orbMode = Boolean(prefs.orbMode);
  let themeMode = prefs.themeMode || "auto";
  const SPEECH_POKE = [
    ["smug", "哼哼，本猫亲自盯着算力，稳得很 ✦"],
    ["happy", "呼噜…才、才没有被摸得很舒服呢 ✦"],
    ["curious", "别老戳耳朵啦，算力数据正跑着呢～"],
    ["smug", "投喂小鱼干的话，我可以帮你想快一点 ✦"],
    ["curious", "盯梢中…你写的代码我都看着呢"],
    ["sleepy", "再乱拉尾巴我就要哈气亮肉垫了哦…"],
    ["happy", "哼，看在你这么专心的份上陪你盯着吧 ✦"],
  ];

  // 锚点坐标系：{ anchor: 'right' | 'left', offset: px, top: px }
  let layout = prefs.layout || { anchor: "right", offset: 18, top: 44 };
  let pokeCount = 0;
  let lastPokeAt = 0;
  let speechCursor = 0;
  let manualMood = null; // { key, text } | null
  let manualMoodTimer = null;
  let lastQuotaHtml = "";
  let lastDragEndAt = 0;
  let themeObserver = null;
  let visHandler = null;
  let resizeHandler = null;
  let outsideHandler = null;
  let mqHandler = null;
  let mqList = null;
  let els = {};

  const applyTheme = () => {
    if (!els.wrap) return;
    const isDark = themeMode === "dark" || (themeMode === "auto" && detectHostTheme() === "dark");
    els.wrap.classList.toggle("dark", isDark);
    if (els.btnTheme) {
      els.btnTheme.textContent = themeMode === "auto" ? "🌓 自动" : themeMode === "dark" ? "🌙 深色" : "☀️ 浅色";
    }
  };

  const syncVisibilityClass = () => {
    if (els.wrap) {
      els.wrap.classList.toggle("page-hidden", Boolean(document.hidden));
    }
  };

  const applyLayout = (animateSnap = false) => {
    if (!host || !els.wrap) return;
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 800;
    const activeEl = orbMode ? els.orb : els.pill;
    const w = Math.max(44, (activeEl && activeEl.offsetWidth) || (orbMode ? 44 : 226));
    const maxOffset = Math.max(10, vw - w - 10);
    const offset = Math.min(Math.max(10, Math.round(layout.offset)), maxOffset);
    const top = Math.min(Math.max(8, Math.round(layout.top)), Math.max(8, vh - 54));

    layout = { anchor: layout.anchor === "left" ? "left" : "right", offset, top };
    host.style.transition = animateSnap ? "left 0.24s cubic-bezier(0.22, 1, 0.36, 1), right 0.24s cubic-bezier(0.22, 1, 0.36, 1), top 0.24s cubic-bezier(0.22, 1, 0.36, 1)" : "none";

    if (layout.anchor === "right") {
      host.style.right = `${offset}px`;
      host.style.left = "auto";
      els.wrap.classList.add("anchor-right");
      els.wrap.classList.remove("anchor-left");
    } else {
      host.style.left = `${offset}px`;
      host.style.right = "auto";
      els.wrap.classList.add("anchor-left");
      els.wrap.classList.remove("anchor-right");
    }
    host.style.top = `${top}px`;

    if (els.popover) {
      els.popover.classList.toggle("open-up", top + 380 > vh && top > 280);
    }
  };

  const resetPosition = () => {
    layout = { anchor: "right", offset: 18, top: 44 };
    applyLayout(true);
    savePrefs({ layout });
  };

  const spawnSparks = (clientX, clientY, count = 4) => {
    const colors = ["#60a5fa", "#a78bfa", "#fb923c", "#34d399", "#f472b6"];
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      s.className = "spark";
      s.textContent = "✦";
      s.style.left = `${clientX}px`;
      s.style.top = `${clientY}px`;
      s.style.color = colors[i % colors.length];
      const ang = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45;
      const dist = 24 + Math.random() * 24;
      s.style.setProperty("--dx", `${Math.round(Math.cos(ang) * dist)}px`);
      s.style.setProperty("--dy", `${Math.round(Math.sin(ang) * dist - 10)}px`);
      shadow.appendChild(s);
      setTimeout(() => s.remove(), 760);
    }
  };

  const hideBubble = () => {
    if (els.speechBubble) els.speechBubble.classList.remove("show");
  };

  const showBubble = (text) => {
    if (!els.speechBubble || expanded) return;
    const vh = window.innerHeight || 800;
    els.speechBubble.classList.toggle("open-up", layout.top + 110 > vh && layout.top > 90);
    els.speechBubble.textContent = text;
    els.speechBubble.classList.add("show");
  };

  const applyAvatarMood = (key, text, warn = false) => {
    const imgSrc = avatars[key] || avatars.happy || "";
    if (imgSrc) {
      if (els.pillImg && els.pillImg.src !== imgSrc) els.pillImg.src = imgSrc;
      if (els.orbImg && els.orbImg.src !== imgSrc) els.orbImg.src = imgSrc;
      if (els.popImg && els.popImg.src !== imgSrc) els.popImg.src = imgSrc;
    }
    if (els.popSay && text) {
      els.popSay.textContent = text;
      els.popSay.classList.toggle("warn", Boolean(warn));
    }
  };

  const triggerPoke = (clientX, clientY, targetEl) => {
    const now = Date.now();
    pokeCount = now - lastPokeAt < 2200 ? pokeCount + 1 : 1;
    lastPokeAt = now;

    if (pokeCount >= 5) {
      pokeCount = 0;
      manualMood = { key: "sleepy", text: "呜…算力过热要宕机了！不准再连戳啦 ✦" };
      applyAvatarMood(manualMood.key, manualMood.text, false);
      spawnSparks(clientX, clientY, 8);
      if (targetEl) {
        targetEl.classList.remove("wiggle");
        void targetEl.offsetWidth;
        targetEl.classList.add("wiggle");
        setTimeout(() => targetEl.classList.remove("wiggle"), 480);
      }
      showBubble(manualMood.text);
    } else {
      const [key, line] = SPEECH_POKE[speechCursor % SPEECH_POKE.length];
      speechCursor += 1;
      manualMood = { key, text: line };
      applyAvatarMood(key, line, false);
      spawnSparks(clientX, clientY, 4);
      showBubble(line);
    }

    clearTimeout(manualMoodTimer);
    manualMoodTimer = setTimeout(() => {
      manualMood = null;
      hideBubble();
      if (lastSnap) render(lastSnap);
    }, 5000);
  };

  const setExpanded = (flag) => {
    expanded = Boolean(flag);
    if (expanded) hideBubble();
    if (els.wrap) {
      els.wrap.classList.toggle("expanded", expanded);
      if (expanded && els.popover) {
        const vh = window.innerHeight || 800;
        els.popover.classList.toggle("open-up", layout.top + 380 > vh && layout.top > 280);
      }
    }
  };

  /* 纯 GPU 原地切换：不碰 left/right，零重排零跳位 */
  const setOrbMode = (flag) => {
    orbMode = Boolean(flag);
    if (els.wrap) els.wrap.classList.toggle("is-orb", orbMode);
    if (orbMode) setExpanded(false);
    if (els.btnOrb) els.btnOrb.textContent = orbMode ? "◎ 展开" : "◉ 圆球";
    savePrefs({ orbMode });
  };

  const pickMood = (snap) => {
    if (!snap || snap.connection === "offline") {
      return { key: "sleepy", text: "本地服务还没醒，先趴会儿…" };
    }
    const speed = snap.speed || {};
    const ctx = speed.context || {};
    const ctxPct = ctx.usedFraction != null ? ctx.usedFraction * 100 : null;
    const tps = speed.latestTps != null ? speed.latestTps : speed.tps;

    if (ctxPct != null && ctxPct >= 80) {
      return { key: "curious", text: `上下文已到 ${Math.round(ctxPct)}%，快用 /compact 减负`, warn: true };
    }
    if (tps != null && tps >= 75) {
      return { key: "smug", text: `全速巡航 ${tps.toFixed(1)} t/s，顺得很` };
    }
    if (tps != null && tps > 0) {
      return { key: "happy", text: `稳定输出 ${tps.toFixed(1)} t/s，一切正常` };
    }
    return { key: "happy", text: "星轨在线，随时盯着实时指标" };
  };

  const getWindowRemaining = (g, winKey) => {
    const w = g && g.windows && g.windows[winKey];
    if (w && w.available && typeof w.remaining === "number") return w.remaining;
    return null;
  };

  const pickPrimaryQuota = (groups, modelName) => {
    if (!Array.isArray(groups) || !groups.length) return null;
    const m = String(modelName || "").toLowerCase();
    const prefer3p = m.includes("claude") || m.includes("gpt") || m.includes("oss") || m.includes("opus") || m.includes("sonnet");
    const targetId = prefer3p ? "3p" : "gemini";
    const preferred = groups.find((g) => String(g.id || "").toLowerCase() === targetId);
    const ordered = preferred ? [preferred, ...groups.filter((g) => g !== preferred)] : groups;

    for (const g of ordered) {
      const r5 = getWindowRemaining(g, "5h");
      if (r5 != null) return r5;
      const rw = getWindowRemaining(g, "weekly");
      if (rw != null) return rw;
    }
    return null;
  };

  const render = (snap) => {
    lastSnap = snap;
    if (!els.wrap) return;
    syncVisibilityClass();

    const nowMs = (snap && snap.serverTimeMs) || Date.now();
    const conn = snap && snap.connection;
    const speed = (snap && snap.speed) || {};
    const ctx = speed.context || {};
    const cache = speed.cache || {};
    const groups = (snap && snap.groups) || [];

    const ctxPct = ctx.usedFraction != null ? Math.round(ctx.usedFraction * 100) : null;
    const tps = speed.latestTps != null ? speed.latestTps : speed.tps;
    const primaryRem = pickPrimaryQuota(groups, speed.model);
    const qPct = primaryRem != null ? Math.round(primaryRem * 100) : null;

    // 圆球流光颜色：绿宽裕(>50%) -> 橙偏低(21%~50%) -> 红吃紧(<=20%)
    els.wrap.classList.remove("q-green", "q-orange", "q-red", "q-idle");
    if (qPct == null) els.wrap.classList.add("q-idle");
    else if (qPct > 50) els.wrap.classList.add("q-green");
    else if (qPct > 20) els.wrap.classList.add("q-orange");
    else els.wrap.classList.add("q-red");

    const mood = manualMood || pickMood(snap);
    applyAvatarMood(mood.key, mood.text, Boolean(!manualMood && mood.warn));

    const highCtx = ctxPct != null && ctxPct >= 80;
    els.pill.classList.toggle("warn", highCtx);

    els.dot.className = "dot" + (conn === "offline" ? " offline" : highCtx ? " warn" : "");
    els.valCtx.textContent = ctxPct != null ? `${ctxPct}%` : "—";
    els.valCtx.className = "m-val" + (ctxPct == null ? "" : ctxPct >= 90 ? " bad" : ctxPct >= 80 ? " warn" : " good");

    els.valTps.textContent = tps != null ? `${tps.toFixed(1)} t/s` : "—";
    els.valTps.className = "m-val" + (tps != null && tps >= 70 ? " good" : " mid");

    els.valQuota.textContent = qPct != null ? `${qPct}%` : "—";
    els.valQuota.className = "m-val" + (qPct == null ? "" : qPct <= 20 ? " bad" : qPct <= 50 ? " warn" : " good");

    if (els.orbTip) {
      const p1 = ctxPct != null ? `上下文 ${ctxPct}%` : "上下文 —";
      const p2 = tps != null ? `${tps.toFixed(1)} t/s` : "—";
      const p3 = qPct != null ? `额度 ${qPct}%` : "额度 —";
      els.orbTip.textContent = `${p1} · ${p2} · ${p3}`;
    }

    els.popModel.textContent = shortModel(speed.model);
    if (els.liveChip) {
      if (conn === "offline") {
        els.liveChip.textContent = "离线";
        els.liveChip.className = "live-chip offline";
      } else if (highCtx) {
        els.liveChip.textContent = "高上下文";
        els.liveChip.className = "live-chip warn";
      } else {
        els.liveChip.textContent = "实时在线";
        els.liveChip.className = "live-chip";
      }
    }

    els.ctxText.textContent =
      ctx.usedTokens != null
        ? `${fmtTokens(ctx.usedTokens)} / ${fmtTokens(ctx.maxTokens)}${ctxPct != null ? ` (${ctxPct}%)` : ""}`
        : "暂无上下文数据";
    els.ctxBadge.style.display = highCtx ? "inline-block" : "none";
    els.ctxBar.style.width = `${Math.min(100, Math.max(0, ctxPct || 0))}%`;
    els.ctxBar.className = "bar-fill" + (ctxPct >= 90 ? " bad" : ctxPct >= 80 ? " warn" : "");

    els.stTps.textContent = speed.tps != null ? `${speed.tps.toFixed(1)} t/s` : "—";
    els.stPeak.textContent = speed.peakTps != null ? `${speed.peakTps.toFixed(1)} t/s` : "—";
    els.stTtft.textContent = speed.ttftSeconds != null ? `${speed.ttftSeconds.toFixed(2)} s` : "—";
    els.stHit.textContent = cache.hitRate != null ? `${Math.round(cache.hitRate * 100)}%` : "—";

    const nextQuotaHtml = groups.length
      ? groups
          .slice(0, 4)
          .map((g) => {
            const title = formatGroupName(g);
            const wins = [
              { key: "5h", label: "5小时" },
              { key: "weekly", label: "周额度" },
            ];
            const rowsHtml = wins
              .map(({ key, label }) => {
                const w = g.windows && g.windows[key];
                if (!w || !w.available || typeof w.remaining !== "number") return "";
                const pct = Math.round(w.remaining * 100);
                const cls = pct <= 20 ? " bad" : pct <= 50 ? " warn" : "";
                const rst = w.resetMs != null ? fmtCountdownMs(w.resetMs - nowMs) : "";
                const fc = w.forecast;
                const exhaustHtml =
                  fc && fc.willExhaust && fc.exhaustInMs != null
                    ? `<span class="q-warn">约${fmtCountdownMs(fc.exhaustInMs)}耗尽</span>`
                    : "";
                return `
                  <div class="q-win">
                    <div class="q-head">
                      <span class="q-tag">${label}</span>
                      <span class="q-right"><span class="q-val">${pct}%</span>${rst ? `<span class="q-rst">· ${rst}重置</span>` : ""}${exhaustHtml}</span>
                    </div>
                    <div class="bar sm"><div class="bar-fill${cls}" style="width:${Math.min(100, Math.max(0, pct))}%"></div></div>
                  </div>
                `;
              })
              .filter(Boolean)
              .join("");

            return `
              <div class="quota-card">
                <div class="q-title"><span>${title}</span></div>
                ${rowsHtml || `<div class="q-rst">暂无可用窗口</div>`}
              </div>
            `;
          })
          .join("")
      : `<div class="quota-card"><div class="q-rst">暂无额度池信息</div></div>`;

    if (nextQuotaHtml !== lastQuotaHtml) {
      els.quotaList.innerHTML = nextQuotaHtml;
      lastQuotaHtml = nextQuotaHtml;
    }
  };

  /* 纯 GPU translate3d + rAF 合帧拖拽：零重排、零卡顿、拖动自动收浮卡 */
  const attachDrag = (el) => {
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startY = 0;
    let origLeft = 0;
    let origTop = 0;
    let elemW = 44;
    let vw = 1280;
    let vh = 800;
    let clampedDx = 0;
    let clampedDy = 0;
    let rafId = 0;

    const flushDrag = () => {
      rafId = 0;
      if (!dragging || !moved || !host) return;
      host.style.transform = `translate3d(${clampedDx}px, ${clampedDy}px, 0)`;
    };

    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      dragging = true;
      moved = false;
      clampedDx = 0;
      clampedDy = 0;
      const rect = el.getBoundingClientRect();
      vw = window.innerWidth || 1280;
      vh = window.innerHeight || 800;
      startX = e.clientX;
      startY = e.clientY;
      origLeft = rect.left;
      origTop = layout.top;
      elemW = Math.max(44, rect.width);
      host.style.transition = "none";
      host.style.willChange = "transform";
      el.setPointerCapture(e.pointerId);
    });

    el.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const rawDx = e.clientX - startX;
      const rawDy = e.clientY - startY;
      if (!moved && Math.hypot(rawDx, rawDy) > 5) {
        moved = true;
        hideBubble();
        if (expanded) setExpanded(false);
        el.classList.add("dragging");
      }
      if (moved) {
        const minDx = 10 - origLeft;
        const maxDx = Math.max(minDx, vw - elemW - 10 - origLeft);
        const minDy = 8 - origTop;
        const maxDy = Math.max(minDy, vh - 54 - origTop);
        clampedDx = Math.round(Math.min(Math.max(rawDx, minDx), maxDx));
        clampedDy = Math.round(Math.min(Math.max(rawDy, minDy), maxDy));
        if (!rafId) rafId = requestAnimationFrame(flushDrag);
      }
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      el.classList.remove("dragging");
      try {
        el.releasePointerCapture(e.pointerId);
      } catch (_) {}
      host.style.willChange = "";

      if (moved) {
        lastDragEndAt = performance.now();
        const finalLeft = origLeft + clampedDx;
        const finalTop = origTop + clampedDy;
        const centerX = finalLeft + elemW / 2;
        if (centerX >= vw / 2) {
          layout = { anchor: "right", offset: vw - (finalLeft + elemW), top: finalTop };
        } else {
          layout = { anchor: "left", offset: finalLeft, top: finalTop };
        }
        host.style.transform = "";
        applyLayout(false);

        if (layout.offset < 28) {
          requestAnimationFrame(() => {
            layout.offset = 14;
            applyLayout(true);
            savePrefs({ layout });
          });
        } else {
          savePrefs({ layout });
        }
        moved = false;
      }
    };

    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);

    return () => moved || performance.now() - lastDragEndAt < 180;
  };

  const bindEvents = () => {
    const isPillMoved = attachDrag(els.pill);
    const isOrbMoved = attachDrag(els.orb);

    els.avatarBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isPillMoved()) return;
      triggerPoke(e.clientX, e.clientY, els.avatarRing);
    });

    els.pill.addEventListener("click", () => {
      if (isPillMoved()) return;
      setExpanded(!expanded);
    });

    els.pill.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      setOrbMode(true);
    });

    els.orb.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isOrbMoved()) return;
      spawnSparks(e.clientX, e.clientY, 4);
      setOrbMode(false);
    });

    els.orb.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isOrbMoved()) return;
      triggerPoke(e.clientX, e.clientY, els.orb);
    });

    els.popAvatarRing.addEventListener("click", (e) => {
      e.stopPropagation();
      triggerPoke(e.clientX, e.clientY, els.popAvatarRing);
    });

    els.btnTheme.addEventListener("click", (e) => {
      e.stopPropagation();
      themeMode = themeMode === "auto" ? "dark" : themeMode === "dark" ? "light" : "auto";
      savePrefs({ themeMode });
      applyTheme();
    });

    els.btnOrb.addEventListener("click", (e) => {
      e.stopPropagation();
      setOrbMode(!orbMode);
    });

    els.btnReset.addEventListener("click", (e) => {
      e.stopPropagation();
      resetPosition();
    });

    outsideHandler = (e) => {
      if (!expanded || !host) return;
      if (e.target === host || host.contains(e.target)) return;
      setExpanded(false);
    };
    window.addEventListener("pointerdown", outsideHandler);

    resizeHandler = () => applyLayout(false);
    window.addEventListener("resize", resizeHandler);

    visHandler = () => syncVisibilityClass();
    document.addEventListener("visibilitychange", visHandler);

    // 监听客户端深/浅主题变化，秒同步
    if (typeof MutationObserver !== "undefined") {
      themeObserver = new MutationObserver(() => {
        if (themeMode === "auto") applyTheme();
      });
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
      if (document.body) {
        themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
      }
    }
    if (window.matchMedia) {
      mqList = window.matchMedia("(prefers-color-scheme: dark)");
      mqHandler = () => { if (themeMode === "auto") applyTheme(); };
      if (mqList.addEventListener) mqList.addEventListener("change", mqHandler);
    }
  };

  const mount = (avatarMap) => {
    avatars = avatarMap || avatars || {};
    const existing = document.getElementById(HOST_ID);
    if (existing && host === existing && shadow) {
      return { status: "already_mounted" };
    }
    if (existing) existing.remove();

    host = document.createElement("div");
    host.id = HOST_ID;
    shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>${STYLES}</style>
      <div class="wrap q-idle anchor-right" id="wrap">
        <div class="pill" id="pill" title="点头像戳猫猫 · 点右侧展开详情 · 拖动移位 · 双击缩成圆球">
          <div class="avatar-ring" id="avatarRing" title="点一下戳戳星海猫猫 ✦">
            <button class="avatar-btn" id="avatarBtn" type="button" aria-label="戳戳猫猫">
              <img id="pillImg" alt="cat" />
            </button>
          </div>
          <div class="metrics">
            <span class="m-item"><span class="dot" id="dot"></span><span class="m-lbl">上下文</span><span class="m-val" id="valCtx">—</span></span>
            <span class="sep"></span>
            <span class="m-item"><span class="m-val" id="valTps">—</span></span>
            <span class="sep"></span>
            <span class="m-item"><span class="m-lbl">额度</span><span class="m-val" id="valQuota">—</span></span>
          </div>
          <button class="chev" id="chev" type="button" aria-label="展开">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>

        <div class="orb" id="orb" title="左键展开胶囊 · 右键戳猫猫 · 拖动移位">
          <div class="orb-flow"></div>
          <div class="orb-tip" id="orbTip">星轨就绪</div>
          <div class="orb-face"><img id="orbImg" alt="cat" /></div>
        </div>

        <div class="speech-bubble" id="speechBubble"></div>

        <div class="popover" id="popover">
          <div class="pop-orb a"></div>
          <div class="pop-orb b"></div>
          <div class="pop-orb c"></div>
          <div class="pop-inner">
            <div class="pop-head">
              <div class="pop-avatar-ring" id="popAvatarRing" title="戳戳猫猫">
                <div class="pop-avatar"><img id="popImg" alt="cat" /></div>
              </div>
              <div class="pop-meta">
                <div class="pop-title-row">
                  <div class="pop-model" id="popModel">等待对话</div>
                  <span class="live-chip" id="liveChip">实时在线</span>
                </div>
                <div class="pop-say" id="popSay">星轨连接中…</div>
              </div>
            </div>

            <div class="glass-box">
              <div class="row">
                <span class="row-l">上下文窗口 <span class="badge" id="ctxBadge" style="display:none">建议 /compact</span></span>
                <span class="row-r" id="ctxText">—</span>
              </div>
              <div class="bar"><div class="bar-fill" id="ctxBar" style="width:0%"></div></div>
            </div>

            <div class="grid2">
              <div class="stat-box"><div class="stat-k">平均速率</div><div class="stat-v c-blue" id="stTps">—</div></div>
              <div class="stat-box"><div class="stat-k">峰值速率</div><div class="stat-v c-purple" id="stPeak">—</div></div>
              <div class="stat-box"><div class="stat-k">首字延迟</div><div class="stat-v" id="stTtft">—</div></div>
              <div class="stat-box"><div class="stat-k">缓存命中</div><div class="stat-v c-green" id="stHit">—</div></div>
            </div>

            <div id="quotaList"></div>

            <div class="pop-foot">
              <button class="btn" id="btnTheme" type="button">🌓 自动</button>
              <button class="btn" id="btnOrb" type="button">◉ 圆球</button>
              <button class="btn" id="btnReset" type="button">↺ 复位</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const q = (id) => shadow.getElementById(id);
    els = {
      wrap: q("wrap"),
      pill: q("pill"),
      orb: q("orb"),
      orbTip: q("orbTip"),
      orbImg: q("orbImg"),
      avatarRing: q("avatarRing"),
      avatarBtn: q("avatarBtn"),
      speechBubble: q("speechBubble"),
      pillImg: q("pillImg"),
      dot: q("dot"),
      valCtx: q("valCtx"),
      valTps: q("valTps"),
      valQuota: q("valQuota"),
      popover: q("popover"),
      popAvatarRing: q("popAvatarRing"),
      popImg: q("popImg"),
      popModel: q("popModel"),
      liveChip: q("liveChip"),
      popSay: q("popSay"),
      ctxText: q("ctxText"),
      ctxBadge: q("ctxBadge"),
      ctxBar: q("ctxBar"),
      stTps: q("stTps"),
      stPeak: q("stPeak"),
      stTtft: q("stTtft"),
      stHit: q("stHit"),
      quotaList: q("quotaList"),
      btnTheme: q("btnTheme"),
      btnOrb: q("btnOrb"),
      btnReset: q("btnReset"),
    };

    document.documentElement.appendChild(host);
    applyTheme();
    syncVisibilityClass();
    if (orbMode) {
      els.wrap.classList.add("is-orb");
      els.btnOrb.textContent = "◎ 展开";
    }
    bindEvents();
    requestAnimationFrame(() => applyLayout(false));

    return { status: "mounted" };
  };

  const update = (snap) => {
    if (!host || !document.contains(host)) {
      return { status: "need_mount" };
    }
    render(snap);
    return {
      status: "updated",
      hidden: Boolean(document.hidden),
      href: location.href,
      title: document.title,
    };
  };

  const hint = () => ({
    mounted: Boolean(host && document.contains(host)),
    hidden: Boolean(document.hidden),
    href: location.href,
    title: document.title,
  });

  const destroy = () => {
    clearTimeout(manualMoodTimer);
    if (themeObserver) { themeObserver.disconnect(); themeObserver = null; }
    if (outsideHandler) { window.removeEventListener("pointerdown", outsideHandler); outsideHandler = null; }
    if (resizeHandler) { window.removeEventListener("resize", resizeHandler); resizeHandler = null; }
    if (visHandler) { document.removeEventListener("visibilitychange", visHandler); visHandler = null; }
    if (mqList && mqHandler && mqList.removeEventListener) { mqList.removeEventListener("change", mqHandler); }
    mqList = null;
    mqHandler = null;
    if (host && host.parentNode) host.parentNode.removeChild(host);
    const leftOver = document.getElementById(HOST_ID);
    if (leftOver) leftOver.remove();
    host = null;
    shadow = null;
    els = {};
    return { status: "destroyed" };
  };

  window.__agCapsule = {
    version: VERSION,
    mount,
    update,
    hint,
    destroy,
    isMounted: () => Boolean(host && document.contains(host)),
  };
})();
