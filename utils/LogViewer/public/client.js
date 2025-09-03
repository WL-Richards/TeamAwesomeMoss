// client.js — full file: sidebar categories + highlighting + robust autoscroll

(function () {
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  function init() {
    // ---- Elements ----
    const logEl        = document.getElementById("log");
    const searchEl     = document.getElementById("search");      // top text filter
    const autoscrollEl = document.getElementById("autoscroll");
    const pauseEl      = document.getElementById("pause");
    const clearBtn     = document.getElementById("clear");
    const countEl      = document.getElementById("count");
    const connDot      = document.getElementById("conn-dot");
    const connText     = document.getElementById("conn-text");
    const tcpInfo      = document.getElementById("tcp-info");

    // Sidebar (inside log area)
    const catListEl    = document.getElementById("cat-list");
    const catSearchEl  = document.getElementById("cat-search");
    const catShowAllEl = document.getElementById("cat-show-all");

    if (!logEl || !catListEl || !catShowAllEl) {
      console.error("Required elements missing in index.html");
      return;
    }

    // ---- State ----
    const socket = io();
    let allLines = []; // [{ raw, category }]
    const MAX_LINES = 3000;

    // cat -> { checked: boolean, el: { row, input, label } }
    const categories = new Map();

    // ---- Connection indicators ----
    socket.on("connect", () => setConnState(true));
    socket.on("disconnect", () => setConnState(false));
    function setConnState(ok) {
      if (connDot) connDot.className = "dot" + (ok ? " on" : "");
      if (connText) connText.textContent = ok ? "Connected" : "Disconnected";
    }

    // ---- Category helpers ----
    function ensureCategory(cat) {
      if (categories.has(cat)) return categories.get(cat);

      const checked = catShowAllEl.checked; // new categories follow master toggle

      const row = document.createElement("div");
      row.className = "cat-item";
      row.dataset.cat = cat;

      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = checked;
      input.id = `cat-${btoa(cat).replace(/=/g, "")}`;

      const label = document.createElement("label");
      label.setAttribute("for", input.id);
      label.textContent = cat;

      input.addEventListener("change", () => {
        const entry = categories.get(cat);
        entry.checked = input.checked;
        syncShowAllCheckbox();
        render(/*fromAppend*/ false);
      });

      row.appendChild(input);
      row.appendChild(label);
      catListEl.appendChild(row);

      const entry = { checked, el: { row, input, label } };
      categories.set(cat, entry);
      syncShowAllCheckbox();
      return entry;
    }

    function syncShowAllCheckbox() {
      if (categories.size === 0) {
        catShowAllEl.indeterminate = false;
        catShowAllEl.checked = true;
        return;
      }
      const vals = [...categories.values()].map(e => e.checked);
      const allOn = vals.every(Boolean);
      const allOff = vals.every(v => !v);
      catShowAllEl.indeterminate = !allOn && !allOff;
      catShowAllEl.checked = allOn;
    }

    // Master toggle
    catShowAllEl.addEventListener("change", () => {
      const turnOn = catShowAllEl.checked;
      categories.forEach((entry) => {
        entry.checked = turnOn;
        entry.el.input.checked = turnOn;
      });
      catShowAllEl.indeterminate = false;
      render(false);
    });

    // Filter visible rows in the sidebar list (doesn’t change checked state)
    if (catSearchEl) {
      catSearchEl.addEventListener("input", () => {
        const q = catSearchEl.value.trim().toLowerCase();
        categories.forEach((entry, cat) => {
          const match = !q || cat.toLowerCase().includes(q);
          entry.el.row.style.display = match ? "" : "none";
        });
      });
    }

    // ---- Socket: incoming logs ----
    socket.on("log", (payload) => {
      if (pauseEl && pauseEl.checked) return;

      const raw = String(payload?.raw ?? "");
      const parsedCat = extractCategory(raw) ?? payload?.category ?? "uncategorized";

      if (payload?.clientIP && payload?.clientPort && tcpInfo) {
        tcpInfo.textContent = `${payload.clientIP}:${payload.clientPort}`;
      }

      ensureCategory(parsedCat);
      allLines.push({ raw, category: parsedCat });
      if (allLines.length > MAX_LINES) allLines = allLines.slice(-MAX_LINES);
      render(true);
    });

    // ---- Render (with reliable autoscroll + highlighting) ----
    function render(fromAppend) {
      const q = (searchEl?.value ?? "").trim();
      let regex = null;
      if (q) {
        try { regex = new RegExp(q, "i"); } catch { /* ignore invalid regex */ }
      }

      const activeCats = new Set(
        [...categories.entries()].filter(([, e]) => e.checked).map(([k]) => k)
      );

      const shown = allLines.filter(({ raw, category }) => {
        if (!activeCats.has(category)) return false;           // hide unchecked
        if (regex && !regex.test(raw)) return false;           // text filter
        return true;
      });

      // Use innerHTML so our token spans style correctly
      logEl.innerHTML = shown.map(({ raw }) => highlightLine(raw)).join("\n");
      if (countEl) countEl.textContent = String(shown.length);

      // Robust autoscroll:
      // - honor the checkbox
      // - run after the DOM paints so scrollHeight is final
      if (!autoscrollEl || autoscrollEl.checked) {
        requestAnimationFrame(() => {
          logEl.scrollTop = logEl.scrollHeight;
        });
      }
    }

    // Also autoscroll when window resizes (layout changes content height)
    window.addEventListener("resize", () => {
      if (!autoscrollEl || autoscrollEl.checked) {
        requestAnimationFrame(() => {
          logEl.scrollTop = logEl.scrollHeight;
        });
      }
    });

    // ---- Top controls ----
    if (searchEl) searchEl.addEventListener("input", () => render(false));
    if (autoscrollEl) autoscrollEl.addEventListener("change", () => render(false));
    if (pauseEl) pauseEl.addEventListener("change", () => render(false));
    if (clearBtn) clearBtn.addEventListener("click", () => { allLines = []; render(false); });

    // Keyboard nicety: ESC clears text filter
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && searchEl) {
        searchEl.value = "";
        render(false);
      }
    });

    // ---- Utilities ----
    function extractCategory(raw) {
      const m = raw.match(/^\s*\[([^\]]*)\]/);
      return m ? m[1] : null;
    }

    function highlightLine(raw) {
      const match = raw.match(/^\s*\[([^\]]*)\]\s*(?:\[([^\]]*)\]\s*)?(?:\[([^\]]*)\]\s*)?(.*)$/);
      if (!match) {
        return `<span class="token-msg">${escapeHtml(raw)}</span>`;
      }
      const category = match[1] ?? "";
      const g2 = match[2] ?? "";
      const g3 = match[3] ?? "";
      const rest = (match[4] ?? "").trim();

      const isIso = (s) => /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s);

      const catSpan = category
        ? `<span class="token-cat">${escapeHtml(category)}</span>`
        : "";

      const g2Span = g2
        ? `<span class="${isIso(g2) ? "token-ts" : "token-meta"}">[${escapeHtml(g2)}]</span>`
        : "";

      const g3Span = g3
        ? `<span class="token-meta">[${escapeHtml(g3)}]</span>`
        : "";

      const msgSpan = rest
        ? `<span class="token-msg">${escapeHtml(rest)}</span>`
        : "";

      return `${catSpan}${g2Span}${g3Span} ${msgSpan}`.trim();
    }

    function escapeHtml(s) {
      return s.replace(/[&<>"']/g, (c) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[c]));
    }

    // Initial render (empty)
    render(false);
  }
})();
