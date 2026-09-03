import fs from "fs";

function stripMedia(css) {
  let out = "";
  let i = 0;
  while (i < css.length) {
    if (css.slice(i, i + 6) === "@media") {
      let j = css.indexOf("{", i);
      if (j === -1) break;
      let depth = 0;
      while (j < css.length) {
        if (css[j] === "{") depth++;
        else if (css[j] === "}") {
          depth--;
          if (depth === 0) {
            i = j + 1;
            break;
          }
        }
        j++;
      }
    } else {
      out += css[i];
      i++;
    }
  }
  return out;
}

const html = fs.readFileSync("/tmp/plan-design.html", "utf8");
const blocks = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((x) => x[1]);
const cssRaw = blocks.find((b) => b.includes(":root")) ?? blocks.at(-1);

let css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, "");
css = stripMedia(css);
const varsMatch = css.match(/:root\{([^}]+)\}/);
const vars = varsMatch ? varsMatch[1] : "";
css = css.replace(/:root\{[^}]+\}/, "");
css = css.replace(/\*(\{[^}]+\})/g, ".plan-v3 *$1");
css = css.replace(/\bbody(\{[^}]+\})/g, ".plan-v3$1");

const scoped = css.replace(/(^|})([^{@]+)\{/g, (full, before, sel) => {
  if (before !== "}") return full;
  const out = sel
    .split(",")
    .map((s) => {
      const t = s.trim();
      if (!t || t.startsWith(".plan-v3")) return t;
      return `.plan-v3 ${t}`;
    })
    .join(",");
  return `}${out}{`;
});

const header = `.plan-v3{${vars};font-family:Inter,system-ui,sans-serif;color:var(--ink-900);font-size:15px;-webkit-font-smoothing:antialiased;min-height:100%;background:linear-gradient(180deg,#f6f8fc 0%,#eef2f9 100%);}
.plan-v3 button{font:inherit;color:inherit}
.plan-v3 a{color:var(--brand-700);text-decoration:none}
.plan-v3 a:hover{color:var(--brand-600)}
.plan-v3 .sidebar{display:none!important}
.plan-v3 .shell{display:block;min-height:100%}
.plan-v3 .main{min-width:0}
.plan-v3 .scrim,.plan-v3 .drawer,.plan-v3 .toast{position:fixed}
`;

const mediaCss = `
@media(max-width:1440px){.plan-v3 .hero{grid-template-columns:minmax(0,1fr) minmax(360px,520px)}}
@media(max-width:1200px){.plan-v3 .hero{grid-template-columns:1fr}.plan-v3 .hero-img{display:none}}
@media(max-width:1240px){.plan-v3 .prow{gap:10px}.plan-v3 .prow-cell .kick{font-size:10px}}
@media(max-width:1000px){.plan-v3 .wkrow,.plan-v3 .month{grid-template-columns:repeat(2,minmax(0,1fr))}.plan-v3 .mhead{display:none}}
`;

fs.writeFileSync("components/v2/agency/plan/plan-design.css", header + scoped + mediaCss);
console.log("ok", (header + scoped).length);
