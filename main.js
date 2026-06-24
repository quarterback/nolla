/* Nolla Nolla — minimal progressive enhancement.
   Everything degrades gracefully without JS. */
(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var reduceMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Mobile nav toggle ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var menu = document.getElementById("nav-menu");
  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    // Close after tapping a link.
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a") && menu.classList.contains("is-open")) {
        menu.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Reveal on scroll ---------- */
  var faders = document.querySelectorAll("[data-fade]");
  if (!faders.length) return;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    faders.forEach(function (el) { el.classList.add("is-visible"); });
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08 }
  );

  var vh = window.innerHeight || 800;
  faders.forEach(function (el) {
    // Anything already near the top of the viewport shows immediately.
    if (el.getBoundingClientRect().top > vh * 0.82) {
      io.observe(el);
    } else {
      el.classList.add("is-visible");
    }
  });
})();
