// Sidebar, theme, and diagram rendering.
// Every page declares <body data-root=".."> so links resolve from any depth.

const NAV = [
  { group: "Start", items: [["index.html", "Overview"]] },
  {
    group: "Concepts",
    items: [
      ["concepts/example.html", "The running example"],
      ["concepts/ontology.html", "Entities and identity"],
      ["concepts/types.html", "Blueprints, state, ports"],
      ["concepts/space.html", "Space and appearance"],
      ["concepts/composites.html", "Composites"],
      ["concepts/processes.html", "Processes"],
      ["concepts/runtime.html", "The runtime"],
      ["concepts/relationships.html", "Relationships and authority"],
      ["concepts/schema.html", "The document"],
      ["concepts/trace.html", "One click, row by row"],
      ["concepts/trace-run.html", "The manager's tick"],
    ],
  },
  {
    group: "Performance",
    items: [
      ["performance/index.html", "Why performance"],
      ["performance/engine.html", "The engine loop"],
      ["performance/data.html", "Data and indexes"],
      ["performance/scale.html", "Scaling out"],
      ["performance/experience.html", "Drawing and observing"],
      ["performance/techniques.html", "Techniques and tradeoffs"],
    ],
  },
  {
    group: "Reference",
    items: [
      ["decisions.html", "Decision log"],
      ["glossary.html", "Glossary"],
    ],
  },
];

const THEME_KEY = "blockies-theme";
const MODES = ["system", "light", "dark"];

const ICONS = {
  system:
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="1.75" y="2.75" width="12.5" height="8.5" rx="1.2"/><path d="M5.5 14h5M8 11.25V14"/></svg>',
  light:
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="3"/><path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3.05 3.05l1.13 1.13M11.82 11.82l1.13 1.13M12.95 3.05l-1.13 1.13M4.18 11.82l-1.13 1.13"/></svg>',
  dark:
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M13.2 9.4A5.6 5.6 0 0 1 6.6 2.8a5.6 5.6 0 1 0 6.6 6.6Z"/></svg>',
};

function readMode() {
  try {
    return localStorage.getItem(THEME_KEY) || "system";
  } catch (e) {
    return "system";
  }
}

function applyMode(mode) {
  const root = document.documentElement;
  if (mode === "system") delete root.dataset.theme;
  else root.dataset.theme = mode;
}

function saveMode(mode) {
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch (e) {
    /* storage may be unavailable on file:// in some browsers */
  }
  applyMode(mode);
}

function buildNav(root, here) {
  const nav = document.getElementById("nav");
  if (!nav) return;
  const hereDir = location.pathname.replace(/[^/]*$/, "");
  const parts = [
    `<a class="brand" href="${root}/index.html">Blockies<span>.</span></a>`,
    `<span class="tag">a field guide to the architecture</span>`,
  ];
  for (const g of NAV) {
    parts.push(`<div class="group">${g.group}</div>`);
    for (const [href, label] of g.items) {
      const abs = new URL(root + "/" + href, location.href).pathname;
      const active = hereDir + here === abs ? " active" : "";
      parts.push(`<a class="item${active}" href="${root}/${href}">${label}</a>`);
    }
  }
  parts.push(`<div class="spacer"></div>`);
  parts.push(
    `<button class="theme-toggle" type="button" aria-label="Change colour theme">` +
      `<span class="icon"></span><span>Theme</span><span class="mode"></span></button>`
  );
  nav.innerHTML = parts.join("");

  const btn = nav.querySelector(".theme-toggle");
  const icon = btn.querySelector(".icon");
  const label = btn.querySelector(".mode");

  function paint(mode) {
    icon.innerHTML = ICONS[mode];
    label.textContent = mode;
    btn.title = "Theme: " + mode + " (click to change)";
  }

  let mode = readMode();
  applyMode(mode);
  paint(mode);

  btn.addEventListener("click", () => {
    mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    saveMode(mode);
    paint(mode);
  });
}

// Diagram source is stored as raw text inside a <script type="text/plain"> so that
// constructs like <br/> survive HTML parsing. Reading textContent directly from the
// div would drop those elements and silently glue words together.
function diagramSource(el) {
  const holder = el.querySelector('script[type="text/plain"]');
  if (holder) return holder.textContent.trim();
  // Fallback for markup written the old way: rebuild <br> as literal <br/> text.
  const clone = el.cloneNode(true);
  clone.querySelectorAll("br").forEach((br) => {
    br.replaceWith(document.createTextNode("<br/>"));
  });
  return clone.textContent.trim();
}

function renderDiagrams() {
  if (!window.pele) return;
  document.querySelectorAll(".mermaid").forEach((el) => {
    const source = diagramSource(el);
    if (!source) return;
    try {
      pele.mount(el, source);
    } catch (err) {
      el.classList.add("diagram-error");
      el.textContent = source;
      console.error("Diagram failed to render:", err);
    }
  });
}

(function () {
  const root = document.body.dataset.root || ".";
  const here = location.pathname.split("/").pop() || "index.html";
  buildNav(root, here);
  // Let layout settle so diagrams measure their container correctly.
  requestAnimationFrame(renderDiagrams);
})();
