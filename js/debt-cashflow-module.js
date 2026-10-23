/* GROVA DOCUMENT — Admin-only debt & cashflow module.
 * New isolated collections only: project_debt_records, debt_partner_settings.
 * Does not write to existing project/contract records.
 */
(function () {
  "use strict";

  const ADMIN_UID = "nJmKgjEILgVOEjWKYWTsuonxbO03";
  const ROOT_ID = "debtModuleRoot";
  let records = [];
  let settings = [];
  let projects = [];
  let selectedRecordId = "";
  let loading = false;

  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
  const money = (value) => (Number(value) || 0).toLocaleString("vi-VN") + " ₫";
  const db = () => window.firebase && firebase.apps && firebase.apps.length ? firebase.firestore() : null;
  const auth = () => window.firebase && firebase.auth ? firebase.auth() : null;
  const stamp = () => new Date().toISOString();
  const fmtDate = (value) => value ? new Date(value + (String(value).length === 10 ? "T00:00:00" : "")).toLocaleDateString("vi-VN") : "Chưa xác định";

  async function isAdmin() {
    const user = auth()?.currentUser;
    if (!user) return false;
    if (user.uid === ADMIN_UID) return true;
    try {
      const snap = await db().collection("users").doc(user.uid).get();
      const profile = snap.exists ? snap.data() : null;
      return !!profile && profile.status === "active" && profile.role === "admin";
    } catch (error) {
      console.warn("GROVA DEBT: không xác minh được quyền Admin", error);
      return false;
    }
  }

  function toast(message) {
    const node = document.createElement("div");
    node.className = "debt-toast";
    node.textContent = message;
    Object.assign(node.style, {
      position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)",
      zIndex: "99999", padding: "12px 16px", background: "#17221d", color: "#fff",
      borderRadius: "12px", boxShadow: "0 8px 30px #0002", maxWidth: "90vw"
    });
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 3500);
  }

  function root() { return document.getElementById(ROOT_ID); }

  async function loadData() {
    if (!await isAdmin()) throw new Error("ADMIN_ONLY");
    const firestore = db();
    if (!firestore) throw new Error("FIRESTORE_UNAVAILABLE");
    const [recordsSnap, settingsSnap] = await Promise.all([
      firestore.collection("project_debt_records").get(),
      firestore.collection("debt_partner_settings").get()
    ]);
    records = recordsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    settings = settingsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    try {
      if (window.GROVA_PERMISSIONS && typeof window.GROVA_PERMISSIONS.getProjects === "function") {
        projects = window.GROVA_PERMISSIONS.getProjects();
      } else {
        projects = [];
      }
    } catch (error) {
      console.warn("GROVA DEBT: không tải được danh sách công trình", error);
      projects = [];
    }
  }

  function installmentPaid(item) {
    const tx = Array.isArray(item.transactions) ? item.transactions : [];
    // Legacy records use paidAmount; the transaction ledger is authoritative when present.
    return tx.length ? tx.reduce((sum, t) => sum + (t.status === "void" ? 0 : (Number(t.amount) || 0)), 0) : (Number(item.paidAmount) || 0);
  }

  function totals(record) {
    const installments = Array.isArray(record.installments) ? record.installments : [];
    const due = installments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const paid = installments.reduce((sum, item) => sum + installmentPaid(item), 0);
    return { due, paid, balance: Math.max(0, due - paid) };
  }

  function statusLabel(record) {
    const t = totals(record);
    if (t.balance <= 0 && t.due > 0) return "Đã tất toán";
    if (record.recordType === "receivable" && (record.installments || []).some((x) => x.conditionType === "partner_receipt" && !x.conditionMetAt)) return "Có khoản chờ điều kiện";
    if (t.paid > 0) return "Đã thanh toán một phần";
    return record.legacy ? "Công trình cũ — cần đối soát" : "Đang theo dõi";
  }

  function render() {
    const container = root();
    if (!container) return;
    if (loading) {
      container.innerHTML = '<div class="debt-card">Đang tải dữ liệu công nợ…</div>';
      return;
    }
    if (!auth()?.currentUser) {
      container.innerHTML = '<div class="debt-card"><h3>Yêu cầu đăng nhập</h3><p>Vui lòng đăng nhập tài khoản Admin để sử dụng phân hệ.</p></div>';
      return;
    }
    if (!window.GROVA_PERMISSIONS?.isAdminUser?.() && auth().currentUser.uid !== ADMIN_UID) {
      container.innerHTML = '<div class="debt-card"><h3>Không có quyền truy cập</h3><p>Phân hệ Công nợ & Dòng tiền chỉ dành cho tài khoản Admin.</p></div>';
      return;
    }

    const totalReceivable = records.filter((x) => x.recordType === "receivable").reduce((s, x) => s + totals(x).balance, 0);
    const totalPayable = records.filter((x) => x.recordType === "payable").reduce((s, x) => s + totals(x).balance, 0);
    const pendingConditions = records.reduce((s, x) => s + (x.installments || []).filter((i) => i.conditionType === "partner_receipt" && !i.conditionMetAt && Number(i.amount) > Number(i.paidAmount || 0)).length, 0);
    const projectOptions = projects.map((p) => '<option value="' + esc(p.id) + '">' + esc((p.code ? p.code + " · " : "") + (p.name || "Công trình")) + '</option>').join("");
    const selected = records.find((x) => x.id === selectedRecordId);
    const listHtml = records.length ? records.map((record) => {
      const t = totals(record);
      return '<article class="debt-record"><div class="debt-record-main"><b>' + esc(record.projectName || record.partnerName || "Chưa đặt tên") + '</b><div class="debt-muted">' + esc(record.projectCode || "Không có mã") + ' · ' + (record.recordType === "payable" ? "Phải trả" : "Phải thu") + (record.legacy ? " · Dữ liệu lịch sử" : "") + '</div><div class="debt-muted">' + esc(record.partnerName || "Chưa nhập đối tác") + '</div></div><div class="debt-record-money"><b>' + money(t.balance) + '</b><span class="debt-muted">Còn lại · ' + esc(statusLabel(record)) + '</span></div><button class="debt-btn debt-btn-secondary" data-debt-edit="' + esc(record.id) + '">Mở</button></article>';
    }).join("") : '<div class="debt-empty"><b>Chưa có hồ sơ công nợ</b><p>Chọn công trình và tạo hồ sơ đầu tiên. Có thể nhập dữ liệu lịch sử của công trình cũ.</p></div>';

    container.innerHTML = `
      <style>
        #debtModuleRoot{color:var(--text,#17221d)} .debt-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:14px 0}
        .debt-card{background:var(--card,#fff);border:1px solid var(--border,#e5e7eb);border-radius:16px;padding:16px;margin:12px 0;min-width:0}
        .debt-kpi{background:var(--surface-secondary,#f5f7f6);border-radius:12px;padding:14px}.debt-kpi span,.debt-muted{display:block;color:var(--muted,#6b7280);font-size:13px;margin-top:5px}
        .debt-kpi b{font-size:clamp(18px,2.5vw,25px);display:block;margin-top:5px}.debt-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between}
        .debt-btn{border:0;border-radius:10px;padding:10px 14px;cursor:pointer;font-weight:700;min-height:40px}.debt-btn-primary{background:#0b7a5a;color:#fff}.debt-btn-secondary{background:var(--surface-secondary,#edf1ef);color:inherit;border:1px solid var(--border,#ddd)}
        .debt-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.debt-fields label{display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:650}.debt-fields input,.debt-fields select,.debt-fields textarea{width:100%;min-width:0;padding:10px;border:1px solid var(--border,#d5d9d7);border-radius:9px;background:var(--card,#fff);color:inherit;font:inherit}
        .debt-fields .full{grid-column:1/-1}.debt-record{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid var(--border,#eee)}.debt-record:last-child{border-bottom:0}
        .debt-record-money{text-align:right}.debt-empty{padding:20px;text-align:center;color:var(--muted,#6b7280)}.debt-installment{border:1px solid var(--border,#e5e7eb);border-radius:12px;padding:14px;margin:12px 0}
        .debt-installment-head{display:flex;justify-content:space-between;gap:10px;align-items:center}.debt-alert{padding:10px 12px;background:#fff5df;color:#805600;border-radius:10px;margin:10px 0}
        .debt-chip{display:inline-block;background:var(--surface-secondary,#eef2ef);border-radius:999px;padding:5px 9px;font-size:12px}.debt-title{margin:0 0 6px}.debt-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
        @media(max-width:680px){.debt-grid{grid-template-columns:1fr}.debt-fields{grid-template-columns:1fr}.debt-record{grid-template-columns:minmax(0,1fr) auto}.debt-record-money{text-align:left;grid-column:1}.debt-record .debt-btn{grid-column:2;grid-row:1/3}.debt-fields .full{grid-column:auto}}
      </style>
      <div class="debt-grid">
        <div class="debt-kpi"><span>Tổng còn phải thu</span><b>${money(totalReceivable)}</b></div>
        <div class="debt-kpi"><span>Tổng còn phải trả</span><b>${money(totalPayable)}</b></div>
        <div class="debt-kpi"><span>Đợt chờ xác nhận điều kiện</span><b>${pendingConditions}</b></div>
      </div>
      <div class="debt-card">
        <div class="debt-toolbar"><div><h3 class="debt-title">Tạo / cập nhật công nợ công trình</h3><div class="debt-muted">Chỉ Admin · Tỷ lệ thanh toán linh hoạt · Lưu dữ liệu riêng, không ghi đè công trình gốc</div></div><button class="debt-btn debt-btn-secondary" data-debt-new>＋ Hồ sơ mới</button></div>
        <div id="debtEditor" style="display:none;margin-top:16px"></div>
      </div>
      <div class="debt-card"><h3 class="debt-title">Danh sách công nợ</h3><div class="debt-muted">Bản ghi mới và dữ liệu lịch sử; các khoản chờ điều kiện không tự gán ngày đáo hạn.</div><div style="margin-top:10px">${listHtml}</div></div>
      <div class="debt-card">
        <div class="debt-toolbar"><div><h3 class="debt-title">Lịch thanh toán theo đối tác</h3><div class="debt-muted">Cấu hình kỳ thanh toán và hạn chốt theo từng đối tác.</div></div></div>
        <form id="debtSettingsForm" class="debt-fields" style="margin-top:14px">
          <label>Tên đối tác<input name="partnerName" required placeholder="Tên công ty đối tác"></label>
          <label>Kỳ thanh toán (ngày trong tháng)<input name="cycleDays" required value="15,25" placeholder="15,25"></label>
          <label>Hạn chốt hồ sơ (ngày trong tháng)<input name="cutoffDays" required placeholder="Ví dụ: 10,20"></label>
          <label>Số ngày làm việc chuẩn bị trước<input name="prepDays" type="number" min="1" max="30" value="5" required></label>
          <div class="full"><button class="debt-btn debt-btn-primary" type="submit">Lưu cấu hình đối tác</button></div>
        </form>
        <div style="margin-top:12px">${settings.length ? settings.map((x) => '<div class="debt-record"><div><b>' + esc(x.partnerName) + '</b><div class="debt-muted">Kỳ: ' + esc((x.cycleDays || []).join(", ")) + ' · Chốt: ' + esc((x.cutoffDays || []).join(", ")) + ' · Chuẩn bị: ' + esc(x.prepDays || 5) + ' ngày làm việc</div></div><button class="debt-btn debt-btn-secondary" data-debt-setting="' + esc(x.id) + '">Sửa</button></div>').join("") : '<div class="debt-muted">Chưa có cấu hình đối tác.</div>'}</div>
      </div>
    `;
    const editor = $("#debtEditor");
    if (selected) renderEditor(selected);
    bindEvents();
  }

  function renderEditor(record = null) {
    const editor = $("#debtEditor");
    if (!editor) return;
    const installments = Array.isArray(record?.installments) && record.installments.length
      ? record.installments : [{ name: "Đợt 1", percent: 100, condition: "Theo hợp đồng", conditionType: "manual", amount: 0, paidAmount: 0, conditionMetAt: "", transactions: [] }];
    const projectOptions = projects.map((p) => '<option value="' + esc(p.id) + '" ' + (record?.projectId === p.id ? "selected" : "") + '>' + esc((p.code ? p.code + " · " : "") + (p.name || "Công trình")) + '</option>').join("");
    editor.style.display = "block";
    editor.innerHTML = `
      <form id="debtRecordForm">
        <div class="debt-fields">
          <label>Công trình<select name="projectId" required><option value="">Chọn công trình</option>${projectOptions}</select></label>
          <label>Loại công nợ<select name="recordType"><option value="receivable" ${record?.recordType !== "payable" ? "selected" : ""}>Phải thu</option><option value="payable" ${record?.recordType === "payable" ? "selected" : ""}>Phải trả</option></select></label>
          <label>Đối tác<input name="partnerName" required value="${esc(record?.partnerName || "")}" placeholder="Khách hàng / nhà cung cấp / đội thi công"></label>
          <label>Giá trị hợp đồng / nghĩa vụ (VNĐ)<input name="contractValue" type="number" min="0" step="1" required value="${esc(record?.contractValue ?? "")}"></label>
          <label>Ngày ký / ngày phát sinh<input name="startDate" type="date" value="${esc(record?.startDate || "")}"></label>
          <label class="full">Ghi chú<input name="note" value="${esc(record?.note || "")}" placeholder="Ghi chú nghiệp vụ"></label>
          <label><span>Nhập dữ liệu lịch sử</span><select name="legacy"><option value="false" ${!record?.legacy ? "selected" : ""}>Không</option><option value="true" ${record?.legacy ? "selected" : ""}>Có — công trình cũ</option></select></label>
          <label>Trạng thái đối soát<select name="reconcileStatus"><option value="not_started" ${record?.reconcileStatus === "not_started" || !record?.reconcileStatus ? "selected" : ""}>Chưa đối soát</option><option value="in_progress" ${record?.reconcileStatus === "in_progress" ? "selected" : ""}>Đang đối soát</option><option value="reconciled" ${record?.reconcileStatus === "reconciled" ? "selected" : ""}>Đã đối soát</option></select></label>
        </div>
        <div class="debt-toolbar" style="margin-top:18px"><h3 class="debt-title">Các đợt thanh toán</h3><button type="button" class="debt-btn debt-btn-secondary" data-debt-add-installment>＋ Thêm đợt</button></div>
        <div id="debtInstallments"></div>
        <div id="debtPercentSummary" class="debt-alert"></div>
        <div class="debt-actions"><button class="debt-btn debt-btn-primary" type="submit">Lưu công nợ</button><button class="debt-btn debt-btn-secondary" type="button" data-debt-cancel>Đóng</button></div>
      </form>
    `;
    const list = $("#debtInstallments");
    installments.forEach((item, i) => list.appendChild(installmentElement(item, i)));
    updatePercentSummary();
    $("#debtRecordForm").addEventListener("input", updatePercentSummary);
    $("#debtRecordForm").addEventListener("submit", saveRecord);
    $("[data-debt-add-installment]", editor).addEventListener("click", () => {
      const count = list.children.length;
      if (count >= 10) return toast("Tối đa 10 đợt trong một lịch thanh toán.");
      list.appendChild(installmentElement({ name: "Đợt " + (count + 1), percent: 0, condition: "", conditionType: "manual", amount: 0, paidAmount: 0, transactions: [] }, count));
      updatePercentSummary();
    });
    $("[data-debt-cancel]", editor).addEventListener("click", () => { selectedRecordId = ""; editor.style.display = "none"; });
  }

  function installmentElement(item, i) {
    const div = document.createElement("div");
    div.className = "debt-installment";
    div.innerHTML = `
      <div class="debt-installment-head"><b>Đợt ${i + 1}</b><button type="button" class="debt-btn debt-btn-secondary" data-remove-installment>Loại bỏ đợt</button></div>
      <div class="debt-fields" style="margin-top:10px">
        <label>Tên đợt<input data-field="name" required value="${esc(item.name || "Đợt " + (i + 1))}"></label>
        <label>Tỷ lệ (%)<input data-field="percent" type="number" min="0" max="100" step="0.01" required value="${esc(item.percent ?? 0)}"></label>
        <label class="full">Điều kiện thanh toán<input data-field="condition" required value="${esc(item.condition || "")}" placeholder="Ví dụ: ký hợp đồng, nghiệm thu, đối tác thu đủ tiền"></label>
        <label>Loại điều kiện<select data-field="conditionType"><option value="manual" ${item.conditionType !== "partner_receipt" ? "selected" : ""}>Theo hợp đồng / Admin xác nhận</option><option value="partner_receipt" ${item.conditionType === "partner_receipt" ? "selected" : ""}>Chờ đối tác thu đủ tiền đợt cuối</option></select></label>
        <label>Ngày xác nhận đủ điều kiện<input data-field="conditionMetAt" type="date" value="${esc(item.conditionMetAt || "")}"></label>
        <label>Số tiền đã thu/trả (VNĐ)<input data-field="paidAmount" type="number" min="0" step="1" value="${esc(item.paidAmount || 0)}"></label>
        <label>Ngày dự kiến (nếu biết)<input data-field="expectedDate" type="date" value="${esc(item.expectedDate || "")}"></label>
      </div>
      <div class="debt-muted" data-amount-preview>Giá trị đợt được tính khi lưu.</div>
      <div style="margin-top:12px"><b>Sổ giao dịch thực tế</b><div class="debt-muted">Ghi nhận từng khoản thu/chi; ngày dự kiến không phải giao dịch thực tế.</div><div data-tx-list></div><div class="debt-fields" style="margin-top:8px"><label>Ngày giao dịch<input data-tx-date type="date"></label><label>Số tiền (VNĐ)<input data-tx-amount type="number" min="1" step="1"></label><label>Phương thức<input data-tx-method placeholder="Chuyển khoản / tiền mặt"></label><label>Mã chứng từ<input data-tx-ref placeholder="Số phiếu / UNC"></label><label class="full">Ghi chú<input data-tx-note></label><div class="full"><button type="button" class="debt-btn debt-btn-secondary" data-add-tx>＋ Ghi nhận thu/chi</button></div></div></div>
    `;
    div.dataset.transactions = JSON.stringify(Array.isArray(item.transactions) ? item.transactions : []);
    renderTransactions(div);
    $("[data-add-tx]", div).addEventListener("click", () => addTransaction(div));
    $("[data-remove-installment]", div).addEventListener("click", () => { div.remove(); updatePercentSummary(); });
    const pct = $("[data-field='percent']", div);
    pct.addEventListener("input", updatePercentSummary);
    return div;
  }

  function renderTransactions(box) {
    const list = $("[data-tx-list]", box);
    if (!list) return;
    let tx = [];
    try { tx = JSON.parse(box.dataset.transactions || "[]"); } catch (_) {}
    list.innerHTML = tx.length ? tx.map((t, i) => '<div class="debt-record"><div><b>' + money(t.amount) + '</b><div class="debt-muted">' + esc(fmtDate(t.date)) + ' · ' + esc(t.method || "Chưa nhập phương thức") + '</div><div class="debt-muted">' + esc(t.reference || "Không có mã chứng từ") + (t.note ? " · " + esc(t.note) : "") + (t.status === "void" ? " · ĐÃ HỦY" : "") + '</div></div><button type="button" class="debt-btn debt-btn-secondary" data-void-tx="' + i + '" ' + (t.status === "void" ? "disabled" : "") + '>Hủy giao dịch</button></div>').join("") : '<div class="debt-muted">Chưa có giao dịch thực tế.</div>';
    list.querySelectorAll("[data-void-tx]").forEach((button) => button.addEventListener("click", () => {
      let items = []; try { items = JSON.parse(box.dataset.transactions || "[]"); } catch (_) {}
      const i = Number(button.dataset.voidTx);
      if (!items[i] || items[i].status === "void") return;
      items[i] = { ...items[i], status: "void", voidedAt: stamp(), voidedBy: auth()?.currentUser?.uid || "", voidReason: "Hủy bởi Admin" };
      box.dataset.transactions = JSON.stringify(items); renderTransactions(box); updatePercentSummary();
    }));
  }

  function addTransaction(box) {
    const date = $("[data-tx-date]", box).value;
    const amount = Number($("[data-tx-amount]", box).value);
    const method = $("[data-tx-method]", box).value.trim();
    const reference = $("[data-tx-ref]", box).value.trim();
    const note = $("[data-tx-note]", box).value.trim();
    if (!date || !Number.isFinite(amount) || amount <= 0) return toast("Nhập ngày và số tiền giao dịch hợp lệ.");
    let items = []; try { items = JSON.parse(box.dataset.transactions || "[]"); } catch (_) {}
    if (reference && items.some((t) => t.status !== "void" && t.reference && t.reference.toLowerCase() === reference.toLowerCase())) return toast("Mã chứng từ trùng trong đợt; hãy kiểm tra lại.");
    const id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ("tx-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9));
    items.push({ id, date, amount, method, reference, note, status: "posted", createdAt: stamp(), createdBy: auth()?.currentUser?.uid || "" });
    box.dataset.transactions = JSON.stringify(items);
    ["[data-tx-date]", "[data-tx-amount]", "[data-tx-method]", "[data-tx-ref]", "[data-tx-note]"].forEach((sel) => { $(sel, box).value = ""; });
    renderTransactions(box); updatePercentSummary();
  }

  function updatePercentSummary() {
    const form = $("#debtRecordForm");
    if (!form) return;
    const total = Array.from(form.querySelectorAll('[data-field="percent"]')).reduce((s, input) => s + (Number(input.value) || 0), 0);
    const value = Number(form.elements.contractValue.value) || 0;
    const summary = $("#debtPercentSummary");
    summary.textContent = "Tổng tỷ lệ: " + total.toLocaleString("vi-VN") + "% · Giá trị cơ sở: " + money(value) + (Math.abs(total - 100) > 0.001 ? " — Tổng tỷ lệ phải bằng 100% mới lưu được." : " — Tỷ lệ hợp lệ.");
    summary.style.background = Math.abs(total - 100) > 0.001 ? "#fff0df" : "#e7f5eb";
    summary.style.color = Math.abs(total - 100) > 0.001 ? "#805600" : "#1d6a40";
    form.querySelectorAll(".debt-installment").forEach((box) => {
      const pct = Number($('[data-field="percent"]', box).value) || 0;
      $('[data-amount-preview]', box).textContent = "Giá trị đợt: " + money(value * pct / 100);
    });
  }

  async function saveRecord(event) {
    event.preventDefault();
    if (!await isAdmin()) return toast("Chỉ Admin được lưu công nợ.");
    const form = event.currentTarget;
    const projectId = form.elements.projectId.value;
    const project = projects.find((p) => p.id === projectId);
    if (!project) return toast("Vui lòng chọn công trình hợp lệ.");
    const contractValue = Number(form.elements.contractValue.value);
    if (!Number.isFinite(contractValue) || contractValue < 0) return toast("Giá trị nghĩa vụ không hợp lệ.");
    const boxes = Array.from(form.querySelectorAll(".debt-installment"));
    const installments = boxes.map((box, installmentIndex) => {
      const get = (name) => $('[data-field="' + name + '"]', box)?.value || "";
      const percent = Number(get("percent")) || 0;
      return {
        id: box.dataset.installmentId || ((window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ("inst-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9))),
        name: get("name").trim(),
        percent,
        amount: Math.round(contractValue * percent / 100),
        condition: get("condition").trim(),
        conditionType: get("conditionType"),
        conditionMetAt: get("conditionMetAt"),
        expectedDate: get("expectedDate"),
        paidAmount: Number(get("paidAmount")) || 0,
        transactions: (() => { try { return JSON.parse(box.dataset.transactions || "[]"); } catch (_) { return []; } })()
      };
    });
    const percentTotal = installments.reduce((s, item) => s + item.percent, 0);
    if (!installments.length || Math.abs(percentTotal - 100) > 0.001) return toast("Tổng tỷ lệ các đợt phải bằng 100%.");
    if (installments.some((item) => { const paid = item.transactions.length ? item.transactions.reduce((sum, t) => sum + (t.status === "void" ? 0 : (Number(t.amount) || 0)), 0) : item.paidAmount; return item.paidAmount < 0 || paid > item.amount || (!item.transactions.length && item.paidAmount > item.amount); })) return toast("Tổng giao dịch thực tế / số dư lịch sử không được vượt giá trị đợt.");
    const old = records.find((r) => r.id === selectedRecordId);
    const now = stamp();
    const data = {
      projectId,
      projectCode: project.code || "",
      projectName: project.name || "",
      recordType: form.elements.recordType.value,
      partnerName: form.elements.partnerName.value.trim(),
      contractValue,
      startDate: form.elements.startDate.value,
      note: form.elements.note.value.trim(),
      legacy: form.elements.legacy.value === "true",
      reconcileStatus: form.elements.reconcileStatus.value,
      installments,
      updatedAt: now,
      updatedBy: auth().currentUser.uid,
      createdAt: old?.createdAt || now,
      createdBy: old?.createdBy || auth().currentUser.uid,
      schemaVersion: 1
    };
    if (!data.partnerName) return toast("Vui lòng nhập đối tác.");
    try {
      const ref = db().collection("project_debt_records").doc(old?.id || undefined);
      await ref.set(data, { merge: false });
      selectedRecordId = ref.id;
      toast("Đã lưu hồ sơ công nợ.");
      await loadData();
      render();
    } catch (error) {
      console.error("GROVA DEBT: save record failed", error);
      toast(error.code === "permission-denied" ? "Firestore từ chối quyền. Kiểm tra Rules và tài khoản Admin." : "Không thể lưu công nợ. Kiểm tra kết nối và thử lại.");
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    if (!await isAdmin()) return toast("Chỉ Admin được cấu hình đối tác.");
    const form = event.currentTarget;
    const partnerName = form.elements.partnerName.value.trim();
    const cycleDays = parseDays(form.elements.cycleDays.value);
    const cutoffDays = parseDays(form.elements.cutoffDays.value);
    const prepDays = Number(form.elements.prepDays.value) || 5;
    if (!partnerName || !cycleDays.length || !cutoffDays.length) return toast("Vui lòng nhập kỳ thanh toán và ngày chốt hồ sơ.");
    const id = partnerName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 100);
    try {
      await db().collection("debt_partner_settings").doc(id).set({
        partnerName, cycleDays, cutoffDays, prepDays, updatedAt: stamp(), updatedBy: auth().currentUser.uid, schemaVersion: 1
      }, { merge: true });
      toast("Đã lưu cấu hình đối tác.");
      await loadData(); render();
    } catch (error) {
      console.error(error); toast("Không thể lưu cấu hình đối tác.");
    }
  }

  function parseDays(value) {
    return [...new Set(String(value || "").split(",").map((x) => Number(x.trim())).filter((x) => Number.isInteger(x) && x >= 1 && x <= 31))].sort((a,b)=>a-b);
  }

  function bindEvents() {
    const container = root();
    if (!container) return;
    container.querySelectorAll("[data-debt-new]").forEach((button) => button.addEventListener("click", () => {
      selectedRecordId = "";
      renderEditor(null);
    }));
    container.querySelectorAll("[data-debt-edit]").forEach((button) => button.addEventListener("click", () => {
      selectedRecordId = button.dataset.debtEdit;
      renderEditor(records.find((x) => x.id === selectedRecordId) || null);
    }));
    container.querySelectorAll("[data-debt-setting]").forEach((button) => button.addEventListener("click", () => {
      const setting = settings.find((x) => x.id === button.dataset.debtSetting);
      const form = $("#debtSettingsForm");
      if (!setting || !form) return;
      form.elements.partnerName.value = setting.partnerName || "";
      form.elements.cycleDays.value = (setting.cycleDays || []).join(",");
      form.elements.cutoffDays.value = (setting.cutoffDays || []).join(",");
      form.elements.prepDays.value = setting.prepDays || 5;
      form.scrollIntoView({ behavior: "smooth", block: "center" });
    }));
    const settingsForm = $("#debtSettingsForm");
    if (settingsForm) settingsForm.addEventListener("submit", saveSettings);
  }

  async function open() {
    if (!await isAdmin()) {
      if (root()) root().innerHTML = '<div class="debt-card"><h3>Không có quyền truy cập</h3><p>Phân hệ này chỉ dành cho tài khoản Admin.</p></div>';
      const nav = document.querySelector('.nav-item[data-page="debt"]');
      if (nav) nav.style.display = "none";
      return;
    }
    loading = true; render();
    try {
      await loadData();
      loading = false;
      render();
    } catch (error) {
      loading = false;
      console.error("GROVA DEBT: load failed", error);
      if (root()) root().innerHTML = '<div class="debt-card"><h3>Không tải được dữ liệu công nợ</h3><p>Kiểm tra đăng nhập, kết nối Firestore và Rules của hai collection mới.</p></div>';
    }
  }

  window.GROVA_DEBT_CASHFLOW = {
    render: open,
    refresh: open,
    openForProject: async function (projectId) {
      await open();
      if (projectId) {
        const record = records.find((x) => x.projectId === projectId);
        selectedRecordId = record?.id || "";
        if (root() && record) renderEditor(record);
        else if (root()) renderEditor({ projectId });
      }
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    const authObject = auth();
    if (authObject) authObject.onAuthStateChanged(() => {
      const nav = document.querySelector('.nav-item[data-page="debt"]');
      const button = document.getElementById("openProjectDebtButton");
      const allowed = authObject.currentUser?.uid === ADMIN_UID || !!window.GROVA_PERMISSIONS?.isAdminUser?.();
      if (nav) { nav.style.display = allowed ? "" : "none"; nav.setAttribute("aria-hidden", allowed ? "false" : "true"); }
      if (button) button.style.display = allowed ? "" : "none";
      if (document.querySelector("#page-debt.active") && window.GROVA_DEBT_CASHFLOW) {
        // Clear any previously rendered financial data immediately when the session/role changes.
        window.GROVA_DEBT_CASHFLOW.render();
      }
    });
    document.addEventListener("click", (event) => {
      const target = event.target.closest('[data-page-target="debt"]');
      if (target) {
        event.preventDefault();
        if (window.GROVA_PERMISSIONS?.isAdminUser?.() || auth()?.currentUser?.uid === ADMIN_UID) {
          document.querySelector('.nav-item[data-page="debt"]')?.click();
        } else toast("Chỉ Admin được mở phân hệ công nợ.");
      }
    });
  });
})();
