/* GROVA DOCUMENT — progressive GSAP motion, no business logic or data writes. */
(function () {
  "use strict";
  const reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gs = window.gsap;
  if (!gs || reducedMotion) return;

  gs.defaults({ ease: "power2.out", duration: 0.32 });

  function animatePage(page) {
    if (!page || !page.classList.contains("active")) return;
    gs.killTweensOf(page);
    gs.fromTo(page,
      { autoAlpha: 0, y: 7 },
      { autoAlpha: 1, y: 0, duration: 0.28, clearProps: "transform,opacity,visibility" }
    );

    if (page.id === "page-dashboard") {
      const items = page.querySelectorAll(".stats .stat, #documentGrid .doc-card, #documentsPageGrid .doc-card");
      if (items.length) {
        gs.killTweensOf(items);
        gs.fromTo(items,
          { y: 9, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.28, stagger: 0.045, clearProps: "transform,opacity,visibility", delay: 0.04 }
        );
      }
    }
  }

  document.addEventListener("click", function (event) {
    const nav = event.target.closest(".nav-item[data-page], [data-page-target]");
    if (!nav) return;
    // App's existing click handler remains responsible for authorization and navigation.
    window.requestAnimationFrame(function () {
      const page = document.getElementById("page-" + (nav.dataset.page || nav.dataset.pageTarget));
      animatePage(page);
    });
  });

  document.addEventListener("DOMContentLoaded", function () {
    animatePage(document.querySelector(".page.active"));
  });

  // Gentle feedback for primary/secondary buttons; do not intercept clicks or forms.
  document.addEventListener("pointerover", function (event) {
    const button = event.target.closest("button.primary, button.secondary");
    if (!button || button.disabled || button.matches(":active")) return;
    gs.to(button, { y: -1, duration: 0.16, overwrite: "auto" });
  });
  document.addEventListener("pointerout", function (event) {
    const button = event.target.closest("button.primary, button.secondary");
    if (!button) return;
    gs.to(button, { y: 0, duration: 0.16, overwrite: "auto" });
  });
})();
