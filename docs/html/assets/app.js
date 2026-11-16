// Sidebar, active state, and diagram rendering.
// Every page declares <body data-root=".."> so links resolve from any depth.

const NAV = [
  { group: "Start", items: [["index.html", "Overview"]] },
  {
    group: "Concepts",
    items: [
      ["concepts/ontology.html", "Entities and identity"],
      ["concepts/types.html", "Types, state, ports"],
      ["concepts/space.html", "Space and appearance"],
      ["concepts/composites.html", "Composites"],
      ["concepts/processes.html", "Processes"],
      ["concepts/runtime.html", "The runtime"],
      ["concepts/relationships.html", "Relationships and authority"],
      ["concepts/schema.html", "The document"],
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

(function () {
  const root = document.body.dataset.root || ".";
  const here = location.pathname.split("/").pop() || "index.html";
  const hereDir = location.pathname.replace(/[^/]*$/, "");

  const nav = document.getElementById("nav");
  if (nav) {
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
    nav.innerHTML = parts.join("");
  }

  if (window.mermaid) {
    mermaid.initialize({
      startOnLoad: false,
      theme: "neutral",
      securityLevel: "loose",
      flowchart: { curve: "basis", htmlLabels: true },
      sequence: { mirrorActors: false },
    });
    mermaid.run({ querySelector: ".mermaid" }).catch(() => {});
  }
})();
