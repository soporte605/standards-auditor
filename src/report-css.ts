/**
 * Report theme. Surfaces, ink and status colors come from a validated palette;
 * status never relies on color alone (icon + text accompany it).
 */
export const reportCss = `
:root{color-scheme:light;--page:#f9f9f7;--surface:#fcfcfb;--raise:#f1f0ec;--line:#e1e0d9;--axis:#c3c2b7;--ink:#0b0b0b;--ink2:#52514e;--muted:#6f6d68;--good:#0ca30c;--good-ink:#006300;--good-bg:#e4f5e4;--warn:#fab219;--warn-ink:#7a4f00;--warn-bg:#fff3d1;--crit:#d03b3b;--crit-ink:#b42525;--crit-bg:#fde8e8;--accent:#2a78d6;--accent-ink:#1c5cab;--accent-bg:#e4effc;--c0:#cde2fb;--c1:#9ec5f4;--c2:#5598e7;--c3:#2a78d6;--c4:#184f95;--sans:"Inter","Inter var",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue","Noto Sans",Arial,sans-serif;--mono:ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace}
@media(prefers-color-scheme:dark){:root{color-scheme:dark;--page:#0d0d0d;--surface:#1a1a19;--raise:#242422;--line:#2c2c2a;--axis:#383835;--ink:#fff;--ink2:#c3c2b7;--muted:#a3a198;--good:#0ca30c;--good-ink:#4cc94c;--good-bg:rgba(12,163,12,.16);--warn:#fab219;--warn-ink:#fab219;--warn-bg:rgba(250,178,25,.15);--crit:#d03b3b;--crit-ink:#f06a6a;--crit-bg:rgba(208,59,59,.18);--accent:#3987e5;--accent-ink:#86b6ef;--accent-bg:rgba(57,135,229,.16);--c0:#184f95;--c1:#1c5cab;--c2:#256abf;--c3:#3987e5;--c4:#86b6ef}}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--page);color:var(--ink);font:14px/1.55 var(--sans);font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased}
main{max-width:1180px;margin:0 auto;padding:28px 28px 56px}
h1,h2,h3,p{margin:0}
button,input,select{font:inherit;color:inherit}
button,summary,select,[role=tab]{cursor:pointer}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:4px}
code,.mono{font:12px/1.5 var(--mono);overflow-wrap:anywhere}
[hidden]{display:none!important}
.icon{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none;vertical-align:-3px}
.top{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:22px}
.brand{display:flex;align-items:center;gap:10px;min-width:0}
.logo{width:34px;height:34px;border-radius:9px;background:var(--accent);color:#fff;display:grid;place-items:center;font:700 13px var(--mono);flex:none}
.brand h1{font-size:20px;font-weight:650;letter-spacing:-.02em;overflow-wrap:anywhere}
.brand p{color:var(--ink2);font-size:12px}
time{color:var(--ink2);font-size:12px;white-space:nowrap}
.tabs{display:none;position:sticky;top:0;z-index:5;gap:2px;margin:0 -28px 22px;padding:0 28px;background:color-mix(in srgb,var(--page) 88%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--line);overflow-x:auto}
.js .tabs{display:flex}
[role=tab]{border:0;background:none;padding:12px 14px;color:var(--ink2);font-weight:550;white-space:nowrap;border-bottom:2px solid transparent;margin-bottom:-1px}
[role=tab]:hover{color:var(--ink)}
[role=tab][aria-selected=true]{color:var(--ink);border-bottom-color:var(--accent)}
.tab-count{margin-left:6px;font-size:11px;padding:1px 7px;border-radius:99px;background:var(--raise);color:var(--ink2)}
.tab-count[data-tone=crit]{background:var(--crit-bg);color:var(--crit-ink)}
.tab-count[data-tone=warn]{background:var(--warn-bg);color:var(--warn-ink)}
.panel-title{font-size:12px;font-weight:650;letter-spacing:.06em;text-transform:uppercase;color:var(--ink2);margin:30px 0 12px}
.panel-title:first-child{margin-top:0}
.verdict{display:flex;gap:16px;align-items:center;padding:20px 24px;background:var(--surface);border:1px solid var(--line);border-radius:14px;border-left:5px solid var(--axis)}
.verdict[data-tone=crit]{border-left-color:var(--crit)}.verdict[data-tone=warn]{border-left-color:var(--warn)}.verdict[data-tone=good]{border-left-color:var(--good)}
.verdict .icon{width:28px;height:28px}
.verdict[data-tone=crit] .icon{color:var(--crit-ink)}.verdict[data-tone=warn] .icon{color:var(--warn-ink)}.verdict[data-tone=good] .icon{color:var(--good-ink)}
.verdict h2{font-size:20px;font-weight:650;letter-spacing:-.02em}
.verdict p{color:var(--ink2);font-size:13px;margin-top:2px}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-top:14px}
.kpi{all:unset;box-sizing:border-box;display:block;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px 20px;cursor:pointer;transition:border-color .15s}
.kpi:hover{border-color:var(--accent)}
.kpi:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.kpi-label{font-size:12px;color:var(--ink2);display:flex;justify-content:space-between;gap:8px}
.kpi-value{font-size:44px;line-height:1.05;font-weight:650;letter-spacing:-.035em;margin:10px 0 2px}
.kpi-value small{font-size:16px;font-weight:500;color:var(--ink2);letter-spacing:0;margin-left:4px}
.kpi-note{font-size:12px;color:var(--ink2);margin-top:10px}
.kpi-value[data-tone=crit]{color:var(--crit-ink)}.kpi-value[data-tone=good]{color:var(--good-ink)}
.meter{position:relative;height:8px;border-radius:4px;background:var(--raise);margin-top:12px}
.meter>span{display:block;height:100%;border-radius:4px;background:var(--accent)}
.meter[data-tone=good]>span{background:var(--good)}.meter[data-tone=warn]>span{background:var(--warn)}.meter[data-tone=crit]>span{background:var(--crit)}.meter[data-tone=idle]>span{background:var(--axis)}
.meter-marker{position:absolute;top:-3px;width:2px;height:14px;background:var(--ink);border-radius:1px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:6px 0;overflow:hidden}
.row{display:flex;align-items:center;gap:12px;padding:12px 20px;border-top:1px solid var(--line)}
.row:first-child{border-top:0}
.row-main{flex:1;min-width:0}
.row-title{font-weight:550}
.row-sub{color:var(--ink2);font-size:12px;margin-top:1px}
.go{border:1px solid var(--line);background:var(--surface);border-radius:8px;padding:6px 12px;font-size:12px;font-weight:550;color:var(--ink);display:inline-flex;gap:6px;align-items:center}
.go:hover{border-color:var(--accent);color:var(--accent-ink)}
.status-icon{width:22px;height:22px;border-radius:50%;display:grid;place-items:center;flex:none}
.status-icon .icon{width:13px;height:13px;stroke-width:2.2}
[data-s=pass]>.status-icon,.status-icon[data-s=pass]{background:var(--good-bg);color:var(--good-ink)}
[data-s=fail]>.status-icon,.status-icon[data-s=fail]{background:var(--crit-bg);color:var(--crit-ink)}
[data-s=warn]>.status-icon,.status-icon[data-s=warn]{background:var(--warn-bg);color:var(--warn-ink)}
[data-s=idle]>.status-icon,.status-icon[data-s=idle]{background:var(--raise);color:var(--ink2)}
.pill{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;background:var(--raise);color:var(--ink2);white-space:nowrap}
.pill[data-tone=crit]{background:var(--crit-bg);color:var(--crit-ink)}.pill[data-tone=warn]{background:var(--warn-bg);color:var(--warn-ink)}.pill[data-tone=good]{background:var(--good-bg);color:var(--good-ink)}.pill[data-tone=accent]{background:var(--accent-bg);color:var(--accent-ink)}
.bars{display:grid;gap:10px;padding:14px 20px 16px}
.bar-row{display:grid;grid-template-columns:minmax(120px,260px) 1fr auto;gap:12px;align-items:center;font-size:13px}
.bar-row .mono{color:var(--ink)}
.bar-track{height:14px;background:var(--raise);border-radius:3px;position:relative}
.bar-fill{position:absolute;inset:0 auto 0 0;background:var(--accent);border-radius:3px 4px 4px 3px}
.bar-val{font-weight:600;min-width:30px;text-align:right}
.rule{border-top:1px solid var(--line);padding:14px 20px}
.rule:first-child{border-top:0}
.rule-head{display:flex;gap:12px;align-items:flex-start}
.rule-title{font-weight:600}
.rule-meta{display:flex;gap:6px;flex-wrap:wrap;margin-left:auto}
.rule-id{color:var(--ink2);margin-top:2px}
.how{margin:10px 0 0 34px;padding:10px 12px;background:var(--accent-bg);border-radius:8px;color:var(--ink);font-size:13px}
.how b{color:var(--accent-ink)}
.files{margin:10px 0 0 34px}
.files>summary{color:var(--ink2);font-size:12px;font-weight:550;list-style:none}
.files>summary::before{content:'▸ '}.files[open]>summary::before{content:'▾ '}
.files ul{list-style:none;margin:8px 0 0;padding:0;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.files li{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:7px 12px;border-top:1px solid var(--line)}
.files li:first-child{border-top:0}
.fix{display:inline-flex;gap:8px;align-items:center;color:var(--ink2);font-size:12px}
.fix code{color:var(--good-ink)}
.copy{border:1px solid var(--line);background:var(--surface);border-radius:6px;padding:2px 8px;font-size:11px;font-weight:550;display:inline-flex;gap:4px;align-items:center}
.copy:hover{border-color:var(--accent);color:var(--accent-ink)}
.more{color:var(--ink2);font-size:12px;padding:8px 12px}
.passed{margin-top:14px}
.passed>summary{font-weight:600;padding:12px 20px;list-style:none;display:flex;gap:8px;align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:14px}
.passed[open]>summary{border-bottom-left-radius:0;border-bottom-right-radius:0;border-bottom:0}
.passed>.card{border-top-left-radius:0;border-top-right-radius:0}
.toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:14px}
.seg{display:inline-flex;border:1px solid var(--line);border-radius:9px;overflow:hidden;background:var(--surface)}
.seg button{border:0;background:none;padding:7px 12px;font-size:12px;font-weight:550;color:var(--ink2)}
.seg button+button{border-left:1px solid var(--line)}
.seg button[aria-pressed=true]{background:var(--accent);color:#fff}
input[type=search],select{background:var(--surface);border:1px solid var(--line);border-radius:9px;padding:7px 11px;font-size:13px;min-width:0}
input[type=search]{flex:1;min-width:180px;max-width:360px}
.spacer{flex:1}
.legend{display:flex;gap:16px;flex-wrap:wrap;color:var(--ink2);font-size:12px;align-items:center}
.legend span{display:inline-flex;gap:6px;align-items:center}
.sw{width:12px;height:12px;border-radius:3px;display:inline-block}
.sw.has{background:var(--good)}.sw.no{background:var(--crit);background-image:repeating-linear-gradient(45deg,transparent 0 2px,rgba(255,255,255,.55) 2px 3.5px)}.sw.oth{background:var(--axis)}
.sw.c0{background:var(--c0)}.sw.c1{background:var(--c1)}.sw.c2{background:var(--c2)}.sw.c3{background:var(--c3)}.sw.c4{background:var(--c4)}
.groups{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}
.group{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:12px 14px}
.group-head{display:flex;justify-content:space-between;gap:8px;margin-bottom:10px;align-items:baseline}
.group-head .mono{font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.group-head span{color:var(--ink2);font-size:12px;white-space:nowrap}
.cells{display:flex;flex-wrap:wrap;gap:3px}
.cell{width:14px;height:14px;border-radius:3px;border:0;padding:0;background:var(--axis)}
.cell:hover,.cell[aria-expanded=true]{outline:2px solid var(--ink);outline-offset:1px}
[data-mode=tests] .cell[data-has="1"]{background:var(--good)}
[data-mode=tests] .cell[data-has="0"]{background:var(--crit);background-image:repeating-linear-gradient(45deg,transparent 0 2px,rgba(255,255,255,.55) 2px 3.5px)}
[data-mode=coverage] .cell[data-cov="0"]{background:var(--c0)}[data-mode=coverage] .cell[data-cov="1"]{background:var(--c1)}[data-mode=coverage] .cell[data-cov="2"]{background:var(--c2)}[data-mode=coverage] .cell[data-cov="3"]{background:var(--c3)}[data-mode=coverage] .cell[data-cov="4"]{background:var(--c4)}
.detail{margin-top:14px;background:var(--surface);border:1px solid var(--accent);border-radius:12px;padding:14px 18px}
.detail h3{font-size:13px;font-weight:600}
.detail dl{display:grid;grid-template-columns:auto 1fr;gap:4px 14px;margin:10px 0 0;font-size:13px}
.detail dt{color:var(--ink2)}.detail dd{margin:0;overflow-wrap:anywhere}
.tree{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 14px}
.tree ul{list-style:none;margin:0;padding-left:18px;border-left:1px solid var(--line)}
.tree>ul{padding-left:0;border:0}
.tree summary{padding:5px 2px;font-size:13px;list-style:none}
.tree summary::-webkit-details-marker{display:none}
.tree-folder>details>summary{font-weight:600}
.tree-folder>details>summary::before{content:'▸ ';color:var(--ink2)}.tree-folder>details[open]>summary::before{content:'▾ '}
.tree-file summary{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.file-info{padding:2px 4px 10px 18px;color:var(--ink2);font-size:12px}
.file-info p{margin:6px 0}
.meters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.cov-empty{padding:26px 24px;display:flex;gap:16px;align-items:flex-start}
.cov-empty h3{font-size:15px;font-weight:600}
.cov-empty p{color:var(--ink2);margin-top:4px;max-width:70ch}
.cov-empty pre{margin:12px 0 0;background:var(--raise);border-radius:8px;padding:10px 12px;overflow:auto;font:12px/1.55 var(--mono)}
.table{width:100%;border-collapse:collapse}
.table th{text-align:left;font-size:12px;color:var(--ink2);font-weight:600;padding:10px 20px;border-bottom:1px solid var(--line)}
.table td{padding:10px 20px;border-top:1px solid var(--line);vertical-align:top}
.table tr:first-child td{border-top:0}
.num{text-align:right}
.finding{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:flex-start;padding:11px 20px;border-top:1px solid var(--line)}
.finding:first-child{border-top:0}
.finding-main{min-width:0}
.finding-msg{color:var(--ink2);font-size:12px;margin-top:2px}
.notes{list-style:none;margin:0;padding:0}
.note{display:flex;gap:12px;padding:12px 20px;border-top:1px solid var(--line);align-items:flex-start}
.note:first-child{border-top:0}
.note .status-icon{margin-top:1px}
.empty{padding:26px;text-align:center;color:var(--ink2)}
footer{margin-top:36px;padding-top:16px;border-top:1px solid var(--line);color:var(--ink2);font-size:12px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}
@media(max-width:900px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.meters{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){main{padding:18px 16px 40px}.tabs{margin:0 -16px 18px;padding:0 10px}.kpis,.meters{grid-template-columns:1fr}.top{flex-wrap:wrap}.bar-row{grid-template-columns:1fr auto}.bar-track{grid-column:1/-1;order:3}.row,.rule,.finding,.note{padding-left:14px;padding-right:14px}.how,.files{margin-left:0}.finding{grid-template-columns:auto minmax(0,1fr)}.finding>.finding-aside{grid-column:2}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.kpi{transition:none}}
@media print{:root{color-scheme:light;--page:#fff;--surface:#fff;--raise:#f0f0ee;--line:#ccc;--ink:#111;--ink2:#444}.tabs,.copy,.go,.toolbar{display:none!important}[role=tabpanel][hidden]{display:block!important}.card,.group,.kpi{break-inside:avoid}}
`;
