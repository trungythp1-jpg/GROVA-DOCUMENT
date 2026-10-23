/* GROVA DOCUMENT — iOS Home Screen PWA PDF fallback
 * Intercepts window.print() only when launched as a standalone iOS PWA.
 * Safari/browser printing remains unchanged.
 */
(function () {
  "use strict";
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  if (!isIOS || !isStandalone || window.__grovaPwaPdfFallbackInstalled) return;
  window.__grovaPwaPdfFallbackInstalled = true;

  const originalPrint = window.print ? window.print.bind(window) : null;
  let exporting = false;

  function loadHtml2Pdf() {
    if (window.html2pdf) return Promise.resolve(window.html2pdf);
    if (window.__grovaHtml2PdfPromise) return window.__grovaHtml2PdfPromise;
    window.__grovaHtml2PdfPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.onload = () => window.html2pdf ? resolve(window.html2pdf) : reject(new Error("Không tải được thư viện PDF."));
      script.onerror = () => reject(new Error("Không tải được thư viện PDF. Hãy kiểm tra kết nối mạng."));
      document.head.appendChild(script);
    });
    return window.__grovaHtml2PdfPromise;
  }

  function filename() {
    const title = (document.title || "GROVA-DOCUMENT")
      .replace(/\s*[-|—].*$/, "")
      .replace(/[^\p{L}\p{N} _-]/gu, "")
      .trim()
      .replace(/\s+/g, "-");
    return (title || "GROVA-DOCUMENT") + ".pdf";
  }

  function pageOrientation() {
    try {
      for (const sheet of Array.from(document.styleSheets)) {
        let rules;
        try { rules = sheet.cssRules; } catch (_) { continue; }
        for (const rule of Array.from(rules || [])) {
          if (rule.type === CSSRule.PAGE_RULE) {
            const size = String(rule.style.getPropertyValue("size") || "").toLowerCase();
            if (size.includes("landscape")) return "landscape";
            if (size.includes("portrait")) return "portrait";
          }
        }
      }
    } catch (_) {}
    return "portrait";
  }

  async function exportPdf() {
    if (exporting) return;
    exporting = true;
    const oldText = document.title;
    const style = document.createElement("style");
    style.id = "grova-pwa-pdf-export-style";
    style.textContent = `
      .toolbar, .topbar, .control-pane, .no-print, .no-print *, [data-no-print],
      button, .btn-back, .btn-export, .export-actions, .toast-container { 
        /* Buttons within the actual document are excluded from capture. */
      }
      .toolbar, .topbar, .control-pane, .no-print, [data-no-print],
      .btn-back, .btn-export, .export-actions, .toast-container { display:none!important; }
      html, body { background:#fff!important; }
      * { -webkit-print-color-adjust:exact!important; print-color-adjust:exact!important; }
    `;
    try {
      document.head.appendChild(style);
      document.body.classList.add("grova-pwa-pdf-exporting");
      const html2pdf = await loadHtml2Pdf();
      const options = {
        margin: 0,
        filename: filename(),
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: "#ffffff",
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: document.documentElement.scrollWidth
        },
        jsPDF: { unit: "mm", format: "a4", orientation: pageOrientation(), compress: true },
        pagebreak: { mode: ["css", "legacy"], avoid: [".no-break", ".no-break-inside", ".signature-block", ".finish-gallery-card"] }
      };
      const worker = html2pdf().set(options).from(document.body).toPdf();
      const blob = await worker.outputPdf("blob");
      const file = new File([blob], options.filename, { type: "application/pdf" });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: options.filename });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = options.filename;
        link.target = "_blank";
        link.rel = "noopener";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        alert("Đã tạo PDF. Nếu iPhone chưa lưu tệp, hãy mở PDF rồi dùng Chia sẻ → Lưu vào Tệp.");
      }
    } catch (error) {
      console.error("GROVA PWA PDF export failed:", error);
      alert("Chưa xuất được PDF trong app. Hãy kiểm tra mạng và thử lại. Nếu vẫn lỗi, mở cùng văn bản trong Safari để xuất.");
    } finally {
      document.getElementById("grova-pwa-pdf-export-style")?.remove();
      document.body.classList.remove("grova-pwa-pdf-exporting");
      document.title = oldText;
      exporting = false;
    }
  }

  // Preserve existing validation/numbering handlers: only replace the final print action.
  window.print = function () {
    void exportPdf();
  };
  window.__grovaPwaExportPdf = exportPdf;
})();
