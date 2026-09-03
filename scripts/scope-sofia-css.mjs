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

const html = fs.readFileSync("/tmp/sofia-design.html", "utf8");
const blocks = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((x) => x[1]);
const cssRaw = blocks.find((b) => b.includes(":root")) ?? blocks.at(-1);

let css = cssRaw.replace(/\/\*[\s\S]*?\*\//g, "");
css = stripMedia(css);
const varsMatch = css.match(/:root\{([^}]+)\}/);
const vars = varsMatch ? varsMatch[1] : "";
css = css.replace(/:root\{[^}]+\}/, "");
css = css.replace(/\*(\{[^}]+\})/g, ".sofia-v3 *$1");
css = css.replace(/\bbody(\{[^}]+\})/g, ".sofia-v3$1");

const scoped = css.replace(/(^|})([^{@]+)\{/g, (full, before, sel) => {
  if (before !== "}") return full;
  const out = sel
    .split(",")
    .map((s) => {
      const t = s.trim();
      if (!t || t.startsWith(".sofia-v3")) return t;
      return `.sofia-v3 ${t}`;
    })
    .join(",");
  return `}${out}{`;
});

const header = `.sofia-v3{${vars};font-family:Inter,system-ui,sans-serif;color:var(--ink-900);font-size:15px;-webkit-font-smoothing:antialiased;min-height:100%;background:linear-gradient(180deg,#f6f8fc 0%,#eef2f9 100%);}
.sofia-v3 button{font:inherit;color:inherit}
.sofia-v3 a{color:var(--brand-700);text-decoration:none}
.sofia-v3 a:hover{color:var(--brand-600)}
.sofia-v3 .sidebar{display:none!important}
.sofia-v3 .shell{display:block;min-height:100%}
.sofia-v3 .main{min-width:0}
.sofia-v3 .page{padding:24px 32px 32px;display:flex;flex-direction:column;gap:20px;max-width:1760px;min-height:0;flex:1}
.sofia-v3 .grid{height:auto;min-height:520px;flex:1}
.sofia-v3 .scrim,.sofia-v3 .modal,.sofia-v3 .toast{position:fixed}
`;

const mediaCss = `
@media(max-width:1440px){.sofia-v3 .hero{grid-template-columns:minmax(0,1fr) minmax(320px,470px)}}
@media(max-width:1240px){.sofia-v3 .grid{grid-template-columns:1fr}.sofia-v3 .ctx{position:static;max-height:none}}
@media(max-width:1200px){.sofia-v3 .hero{grid-template-columns:1fr}.sofia-v3 .hero-img{display:none}}
`;

fs.mkdirSync("components/v2/agency/sofia", { recursive: true });
fs.writeFileSync("components/v2/agency/sofia/sofia-design.css", header + scoped + mediaCss);
console.log("ok", (header + scoped).length);
