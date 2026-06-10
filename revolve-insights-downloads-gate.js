/* Revolve Insights — downloadable documents + free / email-gated download model.
   v1.0.0 — externalised CDN script (footer is at the 50K cap; this loads via <script src> +defer).
   Scope: /insights/{slug} detail pages. No-op elsewhere. Barba-safe + idempotent.

   CMS-driven via data-attrs bound in the Designer:
     [data-insight-download]            wrapper (conditional-visible only when a file is set)
       data-gated="true" | "false"      gate this download behind email capture (Insights.gated)
     a[data-download-url]               the "Download Now" button. data-download-url = file URL.
                                        href = "#" (NOT the file URL) so a JS failure can't leak a
                                        gated file (Phoenix #6).
       data-download-name               Insights.name (filename hint)
     form.insight-gate_form / .w-form   a REAL Webflow Form Block inside the wrapper, hidden by CSS
                                        until the gate opens. Webflow's own runtime handles the
                                        submit, storage and email notification — we do NOT post it.

   CSS (head custom code), so the form never flashes before JS boots (Phoenix #4):
     [data-insight-download] .w-form{display:none}
     [data-insight-download].is-gate-open .w-form{display:block}

   FREE  (data-gated!=="true"): button becomes a native link to the file. No friction.
   GATED (data-gated==="true"): click -> open the Webflow form -> Webflow stores email + notifies
                                -> on its success state (.w-form-done) we start the download and set
                                a sessionStorage flag so further gated downloads that session skip
                                the form ("unlock + remember", CEO 2026-06-10).
   FAIL MODE: gated item with no/broken form -> see GATE_FAIL_MODE below (CEO call, Phoenix #3). */
!function () {
  // ── CEO call (Phoenix #3): "closed" = refuse the download if a gated item's form is missing
  //    (no silent capture loss). "open" = let them download anyway. Default closed (protect capture).
  var GATE_FAIL_MODE = "closed";

  var SS_KEY = "revolve_insights_unlocked";
  function onIns() { return 0 === (location.pathname || "").indexOf("/insights/"); }
  function unlocked() { try { return "1" === sessionStorage.getItem(SS_KEY); } catch (e) { return false; } }
  function setUnlocked() { try { sessionStorage.setItem(SS_KEY, "1"); } catch (e) {} }

  // Phoenix #1: make sure Webflow's forms module is bound to forms that arrived via a Barba swap,
  // else the in-container form submits to its default action and the email is dropped.
  function rebindWebflowForms() {
    try {
      if (window.Webflow && typeof window.Webflow.require === "function") {
        var f = window.Webflow.require("forms");
        f && typeof f.ready === "function" && f.ready();
      }
    } catch (e) {}
  }

  function startDownload(url, name) {
    if (!url) return;
    var a = document.createElement("a");
    a.href = url; a.rel = "noopener"; a.target = "_blank";
    a.setAttribute("download", name || ""); // ignored cross-origin (Webflow CDN) — file opens in a new tab, by design
    document.body.appendChild(a); a.click();
    setTimeout(function () { a.parentNode && a.parentNode.removeChild(a); }, 0);
  }

  // Webflow swaps the form for .w-form-done on a successful AJAX submit; observe that, fire once.
  function watchSuccess(formBlock, url, name) {
    if (formBlock.__gateWatched) return;
    formBlock.__gateWatched = true;
    var done = formBlock.querySelector(".w-form-done");
    function check() {
      var visible = done && (done.style.display === "block" || getComputedStyle(done).display !== "none");
      if (visible && !formBlock.__fired) {
        formBlock.__fired = true;
        setUnlocked();
        startDownload(url, name);
      }
    }
    try {
      new MutationObserver(check).observe(formBlock, { attributes: true, childList: true, subtree: true, attributeFilter: ["style", "class"] });
    } catch (e) {}
  }

  function wire(root) {
    if (!onIns()) return;
    var scope = root && root.querySelectorAll ? root : document;
    [].forEach.call(scope.querySelectorAll("[data-insight-download]"), function (wrap) {
      if (wrap.dataset.gateWired === "1") return;
      wrap.dataset.gateWired = "1";

      var btn = wrap.querySelector("a[data-download-url]") || wrap.querySelector("a[href]");
      if (!btn) return;
      var url = btn.getAttribute("data-download-url") || "";
      var name = btn.getAttribute("data-download-name") || "";

      if (!url || url === "#") { wrap.style.display = "none"; return; }      // no file bound -> hide cleanly
      var gated = (wrap.getAttribute("data-gated") || "").toLowerCase() === "true";

      if (!gated) {                                                          // FREE: native link to the file
        btn.setAttribute("href", url);
        btn.setAttribute("rel", "noopener");
        btn.setAttribute("target", "_blank");
        return;
      }

      // GATED
      wrap.classList.add("is-gated");
      var formBlock = wrap.querySelector(".w-form") || wrap.querySelector(".insight-gate_form") || null;
      if (formBlock) watchSuccess(formBlock, url, name);

      btn.addEventListener("click", function (e) {
        e.preventDefault();
        if (unlocked()) { startDownload(url, name); return; }               // remembered -> straight to file
        if (!formBlock) {                                                    // gated item with no working form
          if (GATE_FAIL_MODE === "open") {                                  // fail OPEN (loud): leak the file
            console.error("[insight-gate] gated item missing form — LEAKING download without capture", { url: url });
            wrap.dataset.gateLeak = "1";
            startDownload(url, name);
          } else {                                                          // fail CLOSED (default): protect capture
            console.error("[insight-gate] gated item missing form — refusing download", { url: url });
            wrap.dataset.gateBroken = "1";
            btn.textContent = "Download unavailable — please refresh";
          }
          return;
        }
        wrap.classList.add("is-gate-open");                                 // CSS reveals .w-form (no FOUC)
        var inp = formBlock.querySelector('input[type="email"], input[name="email"], input[name="Email"]');
        inp && inp.focus();
      });
    });
  }

  function run(c) { wire(c || document); }
  "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", function () { run(); }) : run();
  window.addEventListener("load", function () { run(); });
  window.barba && window.barba.hooks && window.barba.hooks.afterEnter(function (d) {
    rebindWebflowForms();                                                   // Phoenix #1 — before wiring the swapped container
    run(d && d.next && d.next.container || document);
  });
}();
