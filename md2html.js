const fs = require("fs");
const [,, inPath, outPath] = process.argv;
const md = fs.readFileSync(inPath, "utf8").split("\n");

const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function inline(text) {
  let out = "", i = 0, bold = false, italic = false;
  while (i < text.length) {
    const c = text[i];
    if (c === "`") {
      const j = text.indexOf("`", i + 1);
      if (j > i) { out += `<code>${esc(text.slice(i + 1, j))}</code>`; i = j + 1; continue; }
    }
    if (text.startsWith("**", i)) { out += bold ? "</strong>" : "<strong>"; bold = !bold; i += 2; continue; }
    if (c === "*") { out += italic ? "</em>" : "<em>"; italic = !italic; i += 1; continue; }
    out += esc(c); i++;
  }
  return out;
}

const blocks = [];
let i = 0;
while (i < md.length) {
  const line = md[i];
  if (line.startsWith("```")) {
    const lines = []; i++;
    while (i < md.length && !md[i].startsWith("```")) { lines.push(md[i]); i++; }
    i++; blocks.push({ type: "code", text: lines.join("\n") }); continue;
  }
  if (!line.trim()) { i++; continue; }
  if (line.trim() === "---") { blocks.push({ type: "hr" }); i++; continue; }
  const img = line.match(/^!\[(.*?)\]\((.*?)\)\s*$/);
  if (img) { blocks.push({ type: "image", alt: img[1], src: img[2] }); i++; continue; }
  if (line.startsWith("# ")) { blocks.push({ type: "h1", text: line.slice(2) }); i++; continue; }
  if (line.startsWith("## ")) { blocks.push({ type: "h2", text: line.slice(3) }); i++; continue; }
  if (line.startsWith("### ")) { blocks.push({ type: "h3", text: line.slice(4) }); i++; continue; }
  if (line.startsWith("|")) {
    const rows = [];
    while (i < md.length && md[i].startsWith("|")) {
      const cells = md[i].split("|").slice(1, -1).map(c => c.trim());
      if (!cells.every(c => /^-+$/.test(c))) rows.push(cells);
      i++;
    }
    blocks.push({ type: "table", rows }); continue;
  }
  if (line.startsWith("- ")) {
    const items = [];
    while (i < md.length && md[i].startsWith("- ")) { items.push(md[i].slice(2)); i++; }
    blocks.push({ type: "ul", items }); continue;
  }
  if (/^\d+\. /.test(line)) {
    const items = [];
    while (i < md.length && /^\d+\. /.test(md[i])) { items.push(md[i].replace(/^\d+\. /, "")); i++; }
    blocks.push({ type: "ol", items }); continue;
  }
  const parts = [];
  while (i < md.length && md[i].trim() && !/^(#|\||- |\d+\. |```|---|!\[)/.test(md[i])) { parts.push(md[i].trim()); i++; }
  blocks.push({ type: "p", text: parts.join(" ") });
}

// ---------- build ----------
const title = (blocks.find(b => b.type === "h1") || { text: "Build plan" }).text;
const sections = blocks.filter(b => b.type === "h2").map(b => {
  const parts = b.text.split(" — ");
  return { id: slug(b.text), text: b.text, num: /^Phase (\d+)/.test(parts[0]) ? parts[0].replace("Phase ", "") : "",
    name: parts.length > 1 ? parts[1] : parts[0], dur: parts.length > 2 ? parts[2] : "" };
});

let body = "";
let sectionIdx = 0;
let skipNext = false;
for (let k = 0; k < blocks.length; k++) {
  const b = blocks[k];
  switch (b.type) {
    case "h1": break;
    case "h2": {
      const s = sections[sectionIdx++];
      const label = s.num ? `<span class="phase">Phase ${s.num}</span>` : "";
      const dur = s.dur ? `<span class="dur">${esc(s.dur)}</span>` : "";
      if (sectionIdx > 1) body += `</section>\n`;
      body += `<section id="${s.id}" data-title="${esc(s.name)}">\n<h2>${label}<span class="h2name">${inline(s.name)}</span>${dur}</h2>\n`;
      break;
    }
    case "h3": body += `<h3>${inline(b.text)}</h3>\n`; break;
    case "p":
      if (b.text.startsWith("*Keep `harness_diagram")) break;
      body += `<p>${inline(b.text)}</p>\n`; break;
    case "hr": break;
    case "ul": body += `<ul>\n${b.items.map(it => `<li>${inline(it)}</li>`).join("\n")}\n</ul>\n`; break;
    case "ol": body += `<ol>\n${b.items.map(it => `<li>${inline(it)}</li>`).join("\n")}\n</ol>\n`; break;
    case "code":
      body += `<div class="cmd"><pre><code>${esc(b.text)}</code></pre><button class="copy" type="button" aria-label="Copy command">Copy</button></div>\n`; break;
    case "image": {
      const next = blocks[k + 1];
      let cap = "";
      if (next && next.type === "p" && next.text.startsWith("*") && next.text.endsWith("*")) { cap = `<figcaption>${inline(next.text.slice(1, -1))}</figcaption>`; k++; }
      const path = require("path");
      const file = path.resolve(path.dirname(inPath), b.src);
      const src = fs.existsSync(file) ? `data:image/png;base64,${fs.readFileSync(file).toString("base64")}` : b.src;
      body += `<figure><img src="${src}" alt="${esc(b.alt)}">${cap}</figure>\n`; break;
    }
    case "table": {
      const [head, ...rows] = b.rows;
      body += `<div class="tbl"><table>\n<thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join("")}</tr></thead>\n<tbody>\n` +
        rows.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join("")}</tr>`).join("\n") + `\n</tbody></table></div>\n`; break;
    }
  }
}
if (sectionIdx > 0) body += `</section>\n`;

const firstSectionAt = body.indexOf("<section");
const introHtml = body.slice(0, firstSectionAt);
const sectionsHtml = body.slice(firstSectionAt);

const playlist = sections.map(s => `<li><a href="#${s.id}"><span class="n">${s.num ? esc(s.num) : "–"}</span><span class="t">${esc(s.name)}</span><span class="d">${esc(s.dur)}</span></a></li>`).join("\n");

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="Bill of materials and step-by-step build plan for a wearable VLC media player Halloween costume: a Raspberry Pi and touchscreen slab on a strap harness.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Condensed:wght@600&family=IBM+Plex+Sans:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
<style>
:root{
  --orange:#EE7A16; --orange-deep:#B14E08; --ink:#1F1E1B; --ink-2:#5B5954; --paper:#FCFBF9;
  --chrome:#E8E6E0; --chrome-line:#CFCCC3; --code-bg:#F2F0EB; --line:#DEDBD3; --stripe:#F6F4EF;
  --sans:"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif;
  --cond:"IBM Plex Sans Condensed","IBM Plex Sans",system-ui,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:5.5rem}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);font-size:1.0625rem;line-height:1.65;-webkit-font-smoothing:antialiased}
a{color:var(--orange-deep)}
a:focus-visible,button:focus-visible{outline:3px solid var(--orange);outline-offset:2px}

/* player bar */
.player{position:sticky;top:0;z-index:10;background:var(--chrome);border-bottom:1px solid var(--chrome-line);font-family:var(--sans);font-size:.875rem}
.player .row{max-width:46rem;margin:0 auto;padding:.5rem 1.25rem .55rem;display:grid;grid-template-columns:auto 1fr auto;gap:.35rem .9rem;align-items:center}
.player .doc{font-weight:500;white-space:nowrap}
.player .now{color:var(--ink-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.player .count{font-family:var(--mono);font-size:.8rem;color:var(--ink-2);white-space:nowrap}
.seek{grid-column:1 / -1;height:14px;display:flex;align-items:center;cursor:pointer}
.seek .track{position:relative;width:100%;height:5px;background:#fff;border:1px solid var(--chrome-line);border-radius:3px}
.seek .fill{position:absolute;left:0;top:0;bottom:0;width:0;background:var(--orange);border-radius:3px}
.seek .knob{position:absolute;top:50%;width:13px;height:13px;margin:-7px 0 0 -7px;background:#fff;border:2px solid var(--orange-deep);border-radius:50%;left:0}

/* content */
main{max-width:46rem;margin:0 auto;padding:2.5rem 1.25rem 5rem}
h1{font-family:var(--cond);font-weight:600;font-size:clamp(2.2rem,6vw,3.4rem);line-height:1.02;letter-spacing:-.01em;margin:0 0 1.25rem}
.lede p{font-size:1.125rem}
.playlist{margin:2rem 0 3rem;border:1px solid var(--line);background:#fff;border-radius:8px;overflow:hidden}
.playlist h2{font-family:var(--sans);font-size:.875rem;font-weight:500;margin:0;padding:.6rem 1rem;background:var(--chrome);border-bottom:1px solid var(--line);color:var(--ink-2)}
.playlist ol{list-style:none;margin:0;padding:0}
.playlist li+li{border-top:1px solid var(--line)}
.playlist a{display:grid;grid-template-columns:2.5rem 1fr auto;gap:.75rem;align-items:baseline;padding:.6rem 1rem;color:var(--ink);text-decoration:none}
.playlist a:hover{background:var(--stripe)}
.playlist .n{font-family:var(--mono);color:var(--orange-deep);font-size:.9rem}
.playlist .d{font-family:var(--mono);font-size:.8rem;color:var(--ink-2);text-align:right}
section{padding-top:1rem;margin-top:2.5rem;border-top:3px solid var(--orange)}
h2{font-family:var(--cond);font-weight:600;font-size:1.9rem;line-height:1.1;margin:.25rem 0 1rem;display:flex;flex-wrap:wrap;gap:.35rem .75rem;align-items:baseline}
h2 .phase{font-family:var(--mono);font-size:.95rem;font-weight:500;color:var(--orange-deep)}
h2 .dur{font-family:var(--mono);font-size:.85rem;font-weight:400;color:var(--ink-2);margin-left:auto}
h3{font-family:var(--sans);font-weight:500;font-size:1.15rem;margin:2rem 0 .6rem}
p{margin:0 0 1rem}
ul,ol{padding-left:1.4rem;margin:0 0 1.25rem}
li{margin:.35rem 0}
li::marker{color:var(--orange-deep);font-family:var(--mono)}
code{font-family:var(--mono);font-size:.9em;background:var(--code-bg);border:1px solid var(--line);border-radius:4px;padding:.05em .35em}
.cmd{position:relative;margin:1rem 0 1.25rem}
.cmd pre{margin:0;background:var(--code-bg);border:1px solid var(--line);border-left:4px solid var(--orange);border-radius:6px;padding:.9rem 5.5rem .9rem 1rem;white-space:pre-wrap;overflow-wrap:anywhere;font-family:var(--mono);font-size:.875rem;line-height:1.55}
.cmd pre code{background:none;border:0;padding:0;font-size:inherit}
.copy{position:absolute;top:.55rem;right:.55rem;font:500 .78rem var(--sans);color:var(--orange-deep);background:#fff;border:1px solid var(--line);border-radius:4px;padding:.25rem .6rem;cursor:pointer}
.copy:hover{border-color:var(--orange-deep)}
.tbl{overflow-x:auto;margin:1rem 0 1.5rem;border:1px solid var(--line);border-radius:8px}
table{border-collapse:collapse;width:100%;font-size:.95rem;line-height:1.45}
th,td{text-align:left;vertical-align:top;padding:.55rem .75rem;border-bottom:1px solid var(--line)}
th{background:var(--chrome);font-weight:500}
tbody tr:nth-child(even){background:var(--stripe)}
tbody tr:last-child td{border-bottom:0}
figure{margin:1.5rem 0 2rem}
figure img{display:block;width:100%;height:auto;border-radius:8px}
figcaption{font-size:.9rem;color:var(--ink-2);margin-top:.6rem;line-height:1.5}
@media (max-width:600px){
  body{font-size:1rem}
  .player .row{grid-template-columns:1fr auto}
  .player .doc{display:none}
  h2 .dur{margin-left:0;flex-basis:100%}
  .cmd pre{padding-right:1rem;padding-top:2.4rem}
}
</style>
</head>
<body>
<header class="player" aria-label="Reading progress">
  <div class="row">
    <div class="doc">${esc(title)}</div>
    <div class="now" id="now">Start</div>
    <div class="count" id="count">0 / ${sections.length}</div>
    <div class="seek" id="seek" role="progressbar" aria-label="Page position" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">
      <div class="track"><div class="fill" id="fill"></div><div class="knob" id="knob"></div></div>
    </div>
  </div>
</header>
<main>
<h1>${esc(title)}</h1>
<div class="lede">
${introHtml}</div>
<nav class="playlist" aria-label="Sections">
<h2>Playlist</h2>
<ol>
${playlist}
</ol>
</nav>
${sectionsHtml}</main>
<script>
(function(){
  var fill=document.getElementById('fill'),knob=document.getElementById('knob'),seek=document.getElementById('seek');
  var now=document.getElementById('now'),count=document.getElementById('count');
  var secs=[].slice.call(document.querySelectorAll('main section'));
  function pos(){
    var max=document.documentElement.scrollHeight-window.innerHeight;
    var f=max>0?Math.min(1,Math.max(0,window.scrollY/max)):0;
    fill.style.width=(f*100)+'%';knob.style.left=(f*100)+'%';
    seek.setAttribute('aria-valuenow',Math.round(f*100));
    var cur=-1,line=window.scrollY+120;
    for(var i=0;i<secs.length;i++){if(secs[i].offsetTop<=line)cur=i;}
    now.textContent=cur<0?'Start':secs[cur].getAttribute('data-title');
    count.textContent=(cur+1)+' / '+secs.length;
  }
  window.addEventListener('scroll',pos,{passive:true});window.addEventListener('resize',pos);pos();
  seek.addEventListener('click',function(e){
    var r=seek.getBoundingClientRect();var f=(e.clientX-r.left)/r.width;
    window.scrollTo({top:f*(document.documentElement.scrollHeight-window.innerHeight),behavior:'smooth'});
  });
  seek.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();window.scrollBy({top:(e.key==='ArrowRight'?1:-1)*window.innerHeight*0.8,behavior:'smooth'});}
  });
  document.querySelectorAll('.copy').forEach(function(btn){
    btn.addEventListener('click',function(){
      var text=btn.parentNode.querySelector('code').textContent;
      navigator.clipboard.writeText(text).then(function(){btn.textContent='Copied';setTimeout(function(){btn.textContent='Copy';},1500);});
    });
  });
})();
</script>
</body>
</html>
`;
fs.writeFileSync(outPath, html);
console.log("wrote", outPath, html.length, "chars;", sections.length, "sections");
