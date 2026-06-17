/**
 * P7-PR-10 — Static first-launch Language Gate shell (zero-React LCP).
 * Discoverable from first HTML byte — no Element Render Delay waiting for App.tsx.
 */
import { escapeHtml } from "./og-share-meta.mjs";

export const P7_LANGUAGE_GATE_MARKER = "<!-- P7-PR-10:LANGUAGE_GATE -->";

/** Gate copy — gate/ar.json SSOT (Arabic default for first paint). */
export const LANGUAGE_GATE_COPY = {
  title: "اختر لغة التطبيق",
  subtitle: "حدّد اللغة التي تفضّل استخدامها في سوق العرب.",
  ar: "العربية",
  en: "English",
  de: "Deutsch",
  recommended: "افتراضي",
  confirm: "متابعة",
  note: "يمكنك تغيير اللغة لاحقاً من الإعدادات",
};

/** Inline critical CSS — mirrors AUTH_* tokens without Tailwind runtime. */
export const LANGUAGE_GATE_CRITICAL_CSS = `
#p7-language-gate-shell{position:fixed;inset:0;z-index:100;display:none;align-items:center;justify-content:center;padding:40px 16px;box-sizing:border-box;background:#0a0a0a;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
#p7-language-gate-shell.p7-lang-gate-visible{display:flex}
#p7-language-gate-shell .p7-lang-gate-card{width:100%;max-width:28rem;border-radius:1rem;border:1px solid rgba(194,235,108,.4);background:rgba(10,10,10,.75);padding:1.25rem 1.5rem;box-shadow:0 0 22px -12px rgba(194,235,108,.18);box-sizing:border-box}
#p7-language-gate-shell .p7-lang-gate-title{margin:0;font-size:1.125rem;font-weight:600;line-height:1.35;color:#fafafa;text-align:right}
#p7-language-gate-shell .p7-lang-gate-subtitle{margin:.25rem 0 0;font-size:.875rem;line-height:1.45;color:rgba(250,250,250,.55);text-align:right}
#p7-language-gate-shell .p7-lang-gate-options{margin-top:1rem;display:flex;flex-direction:column;gap:.375rem}
#p7-language-gate-shell .p7-lang-gate-row{display:flex;width:100%;align-items:center;gap:.5rem;border-radius:.75rem;border:1px solid transparent;padding:.75rem .75rem;font-size:.875rem;line-height:1.35;color:#fafafa;text-align:right;background:transparent}
#p7-language-gate-shell .p7-lang-gate-row-selected{border-color:rgba(194,235,108,.4);background:rgba(10,10,10,.9);box-shadow:0 0 14px -10px rgba(194,235,108,.25)}
#p7-language-gate-shell .p7-lang-gate-badge{margin-inline-start:.375rem;flex-shrink:0;border-radius:9999px;border:1px solid rgba(194,235,108,.35);background:rgba(194,235,108,.1);padding:.125rem .5rem;font-size:10px;font-weight:600;color:#c2eb6c}
#p7-language-gate-shell .p7-lang-gate-confirm{margin-top:1.25rem;display:flex;width:100%;height:3rem;align-items:center;justify-content:center;border-radius:9999px;border:1px solid rgba(194,235,108,.48);background:rgba(10,10,10,.95);font-size:.875rem;font-weight:600;color:#c2eb6c;box-shadow:0 0 20px -10px rgba(194,235,108,.38)}
#p7-language-gate-shell .p7-lang-gate-note{margin:1rem 0 0;font-size:.75rem;line-height:1.5;color:rgba(250,250,250,.55);text-align:right}
`.trim();

export function buildLanguageGateShellHtml(copy = LANGUAGE_GATE_COPY) {
  const title = escapeHtml(copy.title);
  const subtitle = escapeHtml(copy.subtitle);
  const ar = escapeHtml(copy.ar);
  const en = escapeHtml(copy.en);
  const de = escapeHtml(copy.de);
  const recommended = escapeHtml(copy.recommended);
  const confirm = escapeHtml(copy.confirm);
  const note = escapeHtml(copy.note);

  return `<div id="p7-language-gate-shell" data-p7-language-gate="static" data-nosnippet dir="rtl" aria-busy="true">
      <div class="p7-lang-gate-card" data-testid="language-gate-static">
        <h1 class="p7-lang-gate-title" id="p7-language-gate-lcp">${title}</h1>
        <p class="p7-lang-gate-subtitle">${subtitle}</p>
        <div class="p7-lang-gate-options" role="listbox" aria-label="${title}">
          <div class="p7-lang-gate-row p7-lang-gate-row-selected" role="option" aria-selected="true"><span>${ar}</span><span class="p7-lang-gate-badge">${recommended}</span></div>
          <div class="p7-lang-gate-row" role="option" aria-selected="false"><span>${en}</span></div>
          <div class="p7-lang-gate-row" role="option" aria-selected="false"><span>${de}</span></div>
        </div>
        <div class="p7-lang-gate-confirm" role="button" aria-disabled="true">${confirm}</div>
        <p class="p7-lang-gate-note">${note}</p>
      </div>
    </div>`;
}

export function applyLanguageGateShellToHtml(html) {
  const cssBlock = `<style id="p7-language-gate-critical">${LANGUAGE_GATE_CRITICAL_CSS}</style>`;
  let out = html;
  if (!out.includes('id="p7-language-gate-critical"')) {
    out = out.replace("</head>", `    ${cssBlock}\n  </head>`);
  }
  if (out.includes(P7_LANGUAGE_GATE_MARKER)) {
    out = out.replace(P7_LANGUAGE_GATE_MARKER, buildLanguageGateShellHtml());
  } else if (!out.includes('id="p7-language-gate-shell"')) {
    out = out.replace(
      '<div id="root"></div>',
      `${buildLanguageGateShellHtml()}\n    <div id="root"></div>`,
    );
  }
  return out;
}

/** Client-side bootstrap — show gate on first launch Home only. */
export const LANGUAGE_GATE_BOOTSTRAP_SCRIPT = `(function(){
  function isHomePath(){
    var p=location.pathname.replace(/\\/$/,"")||"/";
    return p==="/";
  }
  function hasLocale(){
    try{return!!localStorage.getItem("app_locale");}catch(e){return false;}
  }
  function stripHomeShell(){
    var hs=document.getElementById("p7-header-shell");if(hs)hs.remove();
    var ly=document.getElementById("p7-lcp-layer");if(ly)ly.remove();
    var pl=document.getElementById("p7-lcp-hero-preload");if(pl)pl.remove();
    document.documentElement.classList.remove("p7-await-handoff");
  }
  if(!isHomePath()){
    stripHomeShell();
    var g=document.getElementById("p7-language-gate-shell");if(g)g.remove();
    return;
  }
  if(hasLocale()){
    stripHomeShell();
    var gate=document.getElementById("p7-language-gate-shell");if(gate)gate.remove();
    return;
  }
  stripHomeShell();
  var shell=document.getElementById("p7-language-gate-shell");
  if(!shell)return;
  shell.classList.add("p7-lang-gate-visible");
  var selected="ar";
  try{var raw=(navigator.language||"").toLowerCase();if(raw.indexOf("en")===0)selected="en";else if(raw.indexOf("de")===0)selected="de";}catch(e){}
  var rows=shell.querySelectorAll(".p7-lang-gate-row");
  function syncRows(){for(var i=0;i<rows.length;i++){var row=rows[i];var text=row.textContent||"";var on=(selected==="ar"&&text.indexOf("العربية")>=0)||(selected==="en"&&text.indexOf("English")>=0)||(selected==="de"&&text.indexOf("Deutsch")>=0);row.classList.toggle("p7-lang-gate-row-selected",on);row.setAttribute("aria-selected",on?"true":"false");}}
  syncRows();
  for(var r=0;r<rows.length;r++){(function(row){row.style.cursor="pointer";row.addEventListener("click",function(){var text=row.textContent||"";if(text.indexOf("English")>=0)selected="en";else if(text.indexOf("Deutsch")>=0)selected="de";else selected="ar";syncRows();});})(rows[r]);}
  var confirm=shell.querySelector(".p7-lang-gate-confirm");
  if(confirm){confirm.setAttribute("aria-disabled","false");confirm.setAttribute("tabindex","0");confirm.style.cursor="pointer";function proceed(){try{localStorage.setItem("app_locale",selected);}catch(e){}shell.classList.remove("p7-lang-gate-visible");shell.remove();document.dispatchEvent(new CustomEvent("p7-locale-saved",{detail:{locale:selected}}));}confirm.addEventListener("click",proceed);confirm.addEventListener("keydown",function(ev){if(ev.key==="Enter"||ev.key===" "){ev.preventDefault();proceed();}});}
})();`;
