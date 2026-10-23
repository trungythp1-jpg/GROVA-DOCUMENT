/* GROVA DOCUMENT — native print/PDF restoration.
 * The html2pdf canvas fallback and injected preview button were disabled because
 * they rendered form controls instead of the document. Each template's own print
 * styles and existing print/export handlers are the source of truth.
 * Do not override window.print() here.
 */
(function () {
  "use strict";
  // Intentionally no-op. Let each template's native print/export implementation run.
  window.__grovaPwaPdfFallbackInstalled = false;
})();
