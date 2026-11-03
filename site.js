/* Channel Keys: fills the refresh ledger and the weekly change feed from data/*.json. */
(function () {
  var fmt = function (n) { return n == null ? "–" : Math.round(n).toLocaleString("en-US"); };
  var money = function (n) { return n == null ? "–" : "$" + (n / 1e9).toFixed(2) + "B"; };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function countUp(el, target) {
    if (reduce || target == null || target < 1000) { el.textContent = fmt(target); return; }
    var start = performance.now(), from = Math.max(0, target * 0.92), dur = 900;
    function tick(t) {
      var p = Math.min(1, (t - start) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (target - from) * e);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function dateLong(iso) {
    if (!iso) return "";
    var d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso);
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }
  function quarterLabel(yq) { if (!yq) return "–"; var s = String(Math.round(yq)); return "Q" + s.slice(4) + " " + s.slice(0, 4); }

  function fillStats(s) {
    document.querySelectorAll("[data-stat]").forEach(function (el) {
      var k = el.getAttribute("data-stat"), v = s[k];
      if (k === "op_total_usd") el.textContent = money(v);
      else if (k === "sdud_latest_quarter") el.textContent = quarterLabel(v);
      else if (k === "refreshed_on") el.textContent = dateLong(v);
      else if (k === "op_years") el.textContent = (v || []).join(" and ");
      else countUp(el, v);
    });
    var srcDates = s.sources || {};
    document.querySelectorAll("[data-source-date]").forEach(function (el) {
      var raw = srcDates[el.getAttribute("data-source-date")];
      if (!raw) return;
      var d = new Date(raw); if (isNaN(d)) return;
      el.textContent = "agency file " + d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    });
  }

  function fillChanges(c) {
    var deltas = {};
    (c.by_table || []).forEach(function (r) { deltas[r.table] = r; });
    document.querySelectorAll("[data-delta]").forEach(function (el) {
      var r = deltas[el.getAttribute("data-delta")];
      if (!r) { el.textContent = "baseline"; return; }
      var parts = [];
      if (r.added) parts.push("+" + fmt(r.added));
      if (r.removed) parts.push("−" + fmt(r.removed));
      if (r.changed) parts.push(fmt(r.changed) + " edited");
      el.innerHTML = parts.length ? "<b>" + parts.join(" ") + "</b>" : "no change";
    });
    var counts = document.getElementById("change-counts"), hl = document.getElementById("change-highlights");
    if (!counts) return;
    var wrap = counts.closest(".changes");
    if (!c.by_table || !c.by_table.length) {
      counts.innerHTML = "";
      if (wrap) wrap.classList.add("is-baseline");
      if (hl) hl.innerHTML = '<div class="empty"><b>This refresh is the baseline.</b> Row-level adds, removals and edits appear here after the next Sunday refresh, and in the <code>CHANGE_LOG</code> table in the listing.</div>';
      return;
    }
    if (wrap) wrap.classList.remove("is-baseline");
    var since = c.prev_snapshot_date ? " since " + dateLong(c.prev_snapshot_date) : "";
    var html = "";
    c.by_table.forEach(function (r) {
      html += '<div><span class="t">' + r.table + '</span><span class="n up">' + (r.added ? "+" + fmt(r.added) : "") +
        '</span><span class="n down">' + (r.removed ? "−" + fmt(r.removed) : "") + '</span><span class="n chg">' + (r.changed ? fmt(r.changed) : "") + "</span></div>";
    });
    html += '<div class="legend"><span>added</span><span>removed</span><span>edited' + since + "</span></div>";
    counts.innerHTML = html;
    if (hl) {
      if (!c.highlights || !c.highlights.length) { hl.innerHTML = '<div class="empty">No notable adds this week. Counts above cover every tracked table.</div>'; return; }
      hl.innerHTML = c.highlights.map(function (h) {
        return "<h3>" + h.title + "</h3><ul>" + h.items.map(function (i) {
          return "<li><code>" + (i.key || "") + "</code><span>" + (i.detail || "") + "</span></li>";
        }).join("") + "</ul>";
      }).join("");
    }
  }

  function load(url) { return fetch(url, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }); }
  var root = document.body.getAttribute("data-root") || "";
  load(root + "data/stats.json").then(fillStats).catch(function () {});
  load(root + "data/changes.json").then(fillChanges).catch(function () {});
})();
