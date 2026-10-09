/** Developer-tool look: dark by default, light when the system asks for it. */
export const devTheme = `
:root{color-scheme:dark;--bg:#0d1117;--surface:#161b22;--surface2:#21262d;--line:#30363d;--text:#e6edf3;--muted:#8b949e;--green:#3fb950;--red:#f85149;--amber:#d29922;--accent:#2f81f7;--red-bg:rgba(248,81,73,.16);--amber-bg:rgba(210,153,34,.18);--green-bg:rgba(63,185,80,.16);--ink:var(--text);--paper:var(--bg);--orange:var(--amber)}
@media(prefers-color-scheme:light){:root{color-scheme:light;--bg:#f6f8fa;--surface:#fff;--surface2:#eaeef2;--line:#d0d7de;--text:#1f2328;--muted:#59636e;--green:#1a7f37;--red:#cf222e;--amber:#9a6700;--accent:#0969da;--red-bg:#ffebe9;--amber-bg:#fff8c5;--green-bg:#dafbe1}}
body{font:13px/1.6 ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;background:var(--bg);color:var(--text)}
h1,h2,h3{letter-spacing:-.01em}
.logo{background:var(--accent);color:#fff;border-radius:6px}
.brand{font-weight:600}
.eyebrow{text-transform:none;letter-spacing:0;font-size:12px;color:var(--muted)}
.eyebrow:before{content:'$ ';color:var(--green)}
.status .eyebrow:before,.hero .eyebrow:before{content:''}
.panel,.disclosure,.finding,.health-rule{background:var(--surface);border-color:var(--line);border-radius:8px}
.finding,.health-rule{background:var(--bg)}
.status{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--muted);border-radius:8px;padding:18px 22px;margin-bottom:18px}
.status[data-tone="error"]{border-left-color:var(--red)}
.status[data-tone="warning"]{border-left-color:var(--amber)}
.status[data-tone="ok"]{border-left-color:var(--green)}
.status-main{display:flex;gap:14px;align-items:center}
.status-icon{font-size:26px;line-height:1}
.status[data-tone="error"] .status-icon{color:var(--red)}
.status[data-tone="warning"] .status-icon{color:var(--amber)}
.status[data-tone="ok"] .status-icon{color:var(--green)}
.status h2{font-size:18px;margin:0}
.status p{margin:2px 0 0;color:var(--muted);font-size:12px}
.status-counts{display:flex;gap:10px;flex-wrap:wrap}
.chip{border:1px solid var(--line);background:var(--bg);border-radius:6px;padding:5px 10px;font-size:12px;color:var(--muted)}
.chip b{font-size:15px;color:var(--text);margin-right:4px}
.chip.error b{color:var(--red)}.chip.warning b{color:var(--amber)}.chip.ok b{color:var(--green)}
.filters button[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:#fff}
.filters button,input{background:var(--bg);color:var(--text);border-color:var(--line)}
.badge.positive{color:var(--green)}
.coverage-empty{min-height:0}.coverage-empty>span{font-size:30px}
.health-bar{background:var(--surface2)}
.health-rule-top strong{font-weight:600}
.rule-id{margin:0}
.rule-findings{margin-top:6px}
.rule-findings summary{color:var(--muted);font-size:12px}
.rule-findings ul{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:6px}
.rule-findings li{display:flex;gap:10px;align-items:center;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:6px}
.fix{display:inline-flex;gap:8px;align-items:center;color:var(--muted)}
.fix code{color:var(--green)}
.copy{border:1px solid var(--line);background:var(--surface2);color:var(--text);border-radius:5px;padding:2px 8px;font-size:11px}
.copy:hover{border-color:var(--accent)}
.more{color:var(--muted);font-size:12px}
@media print{:root{color-scheme:light;--bg:#fff;--surface:#fff;--surface2:#eee;--line:#ccc;--text:#111;--muted:#555}.copy{display:none!important}}
`;
