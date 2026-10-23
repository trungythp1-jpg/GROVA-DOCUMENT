/* GROVA DOCUMENT — iOS Home Screen PWA PDF support.
 * Adds a non-mutating PDF preview and a final export fallback only in iOS standalone PWA.
 * Safari/browser print behavior and existing document numbering handlers remain unchanged.
 */
(function () {
  "use strict";
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  if (!isIOS || !isStandalone || window.__grovaPwaPdfFallbackInstalled) return;
  window.__grovaPwaPdfFallbackInstalled = true;

  let busy = false;
  let previewUrl = null;

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
      .replace(/\\s*[-|—].*$/, "")
      .replace(/[^\\p{L}\\p{N} _-]/gu, "")
      .trim().replace(/\\s+/g, "-");
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
          }
        }
      }
    } catch (_) {}
    return "portrait";
  }

  async function createPdfBlob() {
    const style = document.createElement("style");
    style.id = "grova-pwa-pdf-export-style";
    style.textContent = `
      .toolbar, .topbar, .control-pane, .no-print, [data-no-print],
      .btn-back, .btn-export, .export-actions, .toast-container,
      #grova-pdf-preview-overlay { display:none!important; }
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
          scale: 2, useCORS: true, allowTaint: false,
          backgroundColor: "#ffffff", logging: false,
          scrollX: 0, scrollY: 0,
          windowWidth: document.documentElement.scrollWidth
        },
        jsPDF: { unit: "mm", format: "a4", orientation: pageOrientation(), compress: true },
        pagebreak: { mode: ["css", "legacy"], avoid: [".no-break", ".no-break-inside", ".signature-block", ".finish-gallery-card"] }
      };
      return await html2pdf().set(options).from(document.body).toPdf().outputPdf("blob");
    } finally {
      document.getElementById("grova-pwa-pdf-export-style")?.remove();
      document.body.classList.remove("grova-pwa-pdf-exporting");
    }
  }

  function closePreview() {
    document.getElementById("grova-pdf-preview-overlay")?.remove();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }

  async function previewPdf() {
    if (busy) return;
    busy = true;
    try {
      const blob = await createPdfBlob();
      closePreview();
      previewUrl = URL.createObjectURL(blob);
      const overlay = document.createElement("div");
      overlay.id = "grova-pdf-preview-overlay";
      overlay.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:#202124;display:flex;flex-direction:column;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom);";
      const bar = document.createElement("div");
      bar.style.cssText = "display:flex;gap:8px;align-items:center;padding:10px;background:#202124;color:#fff;font:14px Arial,sans-serif;";
      const title = document.createElement("strong");
      title.textContent = "Xem trước PDF";
      title.style.cssText = "flex:1;min-width:0;";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "Sửa lại";
      edit.style.cssText = "border:0;border-radius:6px;padding:10px 12px;background:#666;color:#fff;font-weight:700;";
      edit.onclick = closePreview;
      const exportButton = document.createElement("button");
      exportButton.type = "button";
      exportButton.textContent = "Xuất PDF";
      exportButton.style.cssText = "border:0;border-radius:6px;padding:10px 12px;background:#b08b3b;color:#fff;font-weight:700;";
      exportButton.onclick = async () => {
        const file = new File([blob], filename(), { type: "application/pdf" });
        try {
          if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: filename() });
          } else {
            const link = document.createElement("a");
            link.href = previewUrl;
            link.download = filename();
            link.click();
            alert("Đã tạo PDF. Nếu chưa lưu được, mở tệp rồi chọn Chia sẻ → Lưu vào Tệp.");
          }
        } catch (error) {
          if (error?.name !== "AbortError") alert("Chưa xuất được PDF. Vui lòng thử lại.");
        }
      };
      bar.append(title, edit, exportButton);
      const frame = document.createElement("iframe");
      frame.title = "Bản xem trước PDF";
      frame.src = previewUrl;
      frame.style.cssText = "border:0;background:#fff;flex:1;width:100%;min-height:0;";
      overlay.append(bar, frame);
      document.body.appendChild(overlay);
    } catch (error) {
      console.error("GROVA PWA PDF preview failed:", error);
      alert("Chưa tạo được bản xem trước PDF. Hãy kiểm tra kết nối mạng rồi thử lại.");
    } finally {
      busy = false;
    }
  }

  async function exportPdf() {
    if (busy) return;
    busy = true;
    try {
      const blob = await createPdfBlob();
      const file = new File([blob], filename(), { type: "application/pdf" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename() });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename();
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        alert("Đã tạo PDF. Nếu chưa lưu được, mở tệp rồi chọn Chia sẻ → Lưu vào Tệp.");
      }
    } catch (error) {
      console.error("GROVA PWA PDF export failed:", error);
      alert("Chưa xuất được PDF trong app. Hãy kiểm tra mạng và thử lại. Nếu vẫn lỗi, mở cùng văn bản trong Safari để xuất.");
    } finally {
      busy = false;
    }
  }

  // Add a preview action beside the existing controls; it only renders a PDF blob.
  // It never calls existing export/numbering handlers or writes to Firestore.
  function addPreviewButton() {
    const toolbar = document.querySelector(".toolbar, .topbar, [data-document-toolbar]");
    if (!toolbar || toolbar.querySelector("[data-grova-pdf-preview]")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Xem trước PDF";
    button.setAttribute("data-grova-pdf-preview", "true");
    button.style.cssText = "border:1px solid #b08b3b;border-radius:6px;padding:10px 14px;background:#fff;color:#8b6a25;font-weight:700;cursor:pointer;";
    button.addEventListener("click", previewPdf);
    toolbar.appendChild(button);
  }

  // Keep the established final export path. Preview is a separate, read-only action.
  window.print = function () { void exportPdf(); };
  window.__grovaPwaExportPdf = exportPdf;
  window.__grovaPwaPreviewPdf = previewPdf;
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addPreviewButton, { once: true });
  } else {
    addPreviewButton();
  }
})();