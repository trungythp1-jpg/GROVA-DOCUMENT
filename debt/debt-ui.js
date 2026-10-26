/* GROVA DOCUMENT — Admin-only debt UI. UI visibility only; Firestore Rules unchanged. */
(function (root) {
  "use strict";
  const money = (n) => new Intl.NumberFormat("vi-VN").format(Number(n || 0)) + " ₫";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  let selectedDebt = null;
  let txItems = [];

  function context() {
    const c = root.GROVA_DEBT_CONTEXT;
    if (!c || !c.isAdmin || !c.isAdmin()) throw new Error("Chỉ Admin được sử dụng mục Công nợ.");
    const db = c.getDb();
    if (!db) throw new Error("Firestore chưa sẵn sàng.");
    return { c, db };
  }

  function notify(message) {
    if (root.GROVA_DEBT_CONTEXT && root.GROVA_DEBT_CONTEXT.toast) root.GROVA_DEBT_CONTEXT.toast(message);
    else alert(message);
  }

  async function render() {
    const host = document.getElementById("debtPageContent");
    if (!host) return;
    try {
      const { c, db } = context();
      const debts = (await root.GROVA_DEBT_SERVICE.listDebts(db)).sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")));
      const projects = c.getProjects().filter(p => p && p.id);
      const debtIds = new Set(debts.map(d=>String(d.projectId || d.id)));
      const available = projects.filter(p => !debtIds.has(String(p.id)));
      host.innerHTML = `
        <div class="debt-toolbar">
          <div><h3>Danh sách công nợ</h3><p>Mỗi công trình chỉ có một hồ sơ công nợ.</p></div>
          <button class="primary" type="button" data-debt-action="new">＋ Thêm công nợ</button>
        </div>
        <div class="debt-list-tools">
          <label class="debt-search-label">Tìm kiếm công trình<input id="debtSearchInput" type="search" placeholder="Nhập mã công trình, tên công trình hoặc khách hàng..."></label>
          <label class="debt-search-label">Lọc theo khách hàng<input id="debtCustomerFilter" type="search" placeholder="Nhập tên khách hàng..."></label>
          <label class="debt-search-label">Lọc theo công nợ<select id="debtBalanceFilter"><option value="all">Tất cả công nợ</option><option value="receivable-open">Còn phải thu</option><option value="receivable-settled">Đã thu đủ</option><option value="payable-open">Còn phải trả nhân viên</option><option value="payable-settled">Đã trả đủ nhân viên</option></select></label>
          <div class="debt-print-actions"><span id="debtSelectedCount">Đã chọn 0 công trình</span><button class="secondary" type="button" data-debt-action="print-selected">In công trình đã chọn</button><button class="secondary" type="button" data-debt-action="print-all">In toàn bộ</button></div>
        </div>
        <div class="debt-summary">
          <div><small>Tổng phải thu</small><strong>${money(debts.reduce((s,d)=>s+Number(d.receivableAmount||0),0))}</strong></div>
          <div><small>Đã thu</small><strong>${money(debts.reduce((s,d)=>s+Number(d.receivedAmount||0),0))}</strong></div>
          <div><small>Còn phải thu</small><strong>${money(debts.reduce((s,d)=>s+Math.max(0,Number(d.receivableAmount||0)-Number(d.receivedAmount||0)),0))}</strong></div>
          <div><small>Còn phải trả</small><strong>${money(debts.reduce((s,d)=>s+Math.max(0,Number(d.payableAmount||0)-Number(d.paidAmount||0)),0))}</strong></div>
        </div>
        <div id="debtEditor" class="debt-editor" hidden></div>
        <div class="debt-table-wrap"><table class="debt-table"><thead><tr><th class="debt-select-col">Chọn in</th><th>Công trình</th><th>Khách hàng</th><th>Giá trị hợp đồng</th><th>Phải thu</th><th>Đã thu</th><th>Còn thu</th><th>Tiền công dự kiến</th><th>Đã trả nhân viên</th><th>Còn trả nhân viên</th><th></th></tr></thead><tbody>
        ${debts.map(d=>`<tr data-debt-row data-search="${esc([d.projectCode,d.projectName].join(" ").toLocaleLowerCase("vi"))}" data-customer="${esc(String(d.customerName||"").toLocaleLowerCase("vi"))}" data-receivable-left="${Math.max(0,Number(d.receivableAmount||0)-Number(d.receivedAmount||0))}" data-payable-left="${Math.max(0,Number(d.payableAmount||0)-Number(d.paidAmount||0))}"><td class="debt-select-col"><input type="checkbox" class="debt-print-check" data-id="${esc(d.id)}" aria-label="Chọn ${esc(d.projectCode||d.projectName||"công trình")} để in"></td><td><b>${esc(d.projectCode||"—")}</b><div>${esc(d.projectName||"")}</div></td><td>${esc(d.customerName||"—")}</td><td>${money(d.contractAmount)}</td><td>${money(d.receivableAmount)}</td><td>${money(d.receivedAmount)}</td><td>${money(Math.max(0,Number(d.receivableAmount||0)-Number(d.receivedAmount||0)))}</td><td>${money(d.payableAmount)}</td><td>${money(d.paidAmount)}</td><td>${money(Math.max(0,Number(d.payableAmount||0)-Number(d.paidAmount||0)))}</td><td><div class="debt-actions-inline"><button class="secondary" data-debt-action="detail" data-id="${esc(d.id)}">Chi tiết</button><button class="danger" data-debt-action="delete" data-id="${esc(d.id)}">Xóa</button></div></td></tr>`).join("")}
        ${debts.length ? "" : '<tr><td colspan="11" class="debt-empty">Chưa có hồ sơ công nợ.</td></tr>'}
        </tbody></table></div><div class="debt-pagination" id="debtPagination"><span id="debtPageCount" aria-live="polite"></span><div class="debt-pagination-actions"><button type="button" class="secondary" id="debtPrevPage">‹ Trước</button><button type="button" class="secondary" id="debtNextPage">Sau ›</button></div></div>`;
      const searchInput=host.querySelector("#debtSearchInput");
      const customerFilter=host.querySelector("#debtCustomerFilter");
      const balanceFilter=host.querySelector("#debtBalanceFilter");
      const pageCount=host.querySelector("#debtPageCount");
      const prevPage=host.querySelector("#debtPrevPage");
      const nextPage=host.querySelector("#debtNextPage");
      const pageSize=8;
      let currentPage=1;
      const checks=()=>Array.from(host.querySelectorAll(".debt-print-check"));
      const selectedCount=host.querySelector("#debtSelectedCount");
      const updateSelectedCount=()=>{selectedCount.textContent="Đã chọn "+checks().filter(x=>x.checked).length+" công trình";};
      const renderDebtPage=()=>{
        const rows=Array.from(host.querySelectorAll("[data-debt-row]"));
        const matched=rows.filter(row=>row.dataset.filterMatch!=="false");
        const total=matched.length;
        const totalPages=Math.max(1,Math.ceil(total/pageSize));
        currentPage=Math.min(Math.max(1,currentPage),totalPages);
        const start=(currentPage-1)*pageSize;
        rows.forEach(row=>row.hidden=true);
        matched.slice(start,start+pageSize).forEach(row=>row.hidden=false);
        pageCount.textContent=total ? "Hiển thị "+(start+1)+"–"+Math.min(start+pageSize,total)+" / "+total+" công trình · Trang "+currentPage+"/"+totalPages : "Không có công trình phù hợp";
        prevPage.disabled=currentPage<=1;
        nextPage.disabled=currentPage>=totalPages;
      };
      const applyDebtFilters=()=>{
        const q=searchInput.value.trim().toLocaleLowerCase("vi");
        const customer=customerFilter.value.trim().toLocaleLowerCase("vi");
        const status=balanceFilter.value;
        host.querySelectorAll("[data-debt-row]").forEach(row=>{
          const receivableLeft=Number(row.dataset.receivableLeft||0);
          const payableLeft=Number(row.dataset.payableLeft||0);
          const statusMatch=status==="all"||
            (status==="receivable-open"&&receivableLeft>0)||
            (status==="receivable-settled"&&receivableLeft===0)||
            (status==="payable-open"&&payableLeft>0)||
            (status==="payable-settled"&&payableLeft===0);
          row.dataset.filterMatch=String(row.dataset.search.includes(q)&&row.dataset.customer.includes(customer)&&statusMatch);
        });
        currentPage=1;
        renderDebtPage();
      };
      prevPage.addEventListener("click",()=>{currentPage--;renderDebtPage();});
      nextPage.addEventListener("click",()=>{currentPage++;renderDebtPage();});
      [searchInput,customerFilter].forEach(input=>input.addEventListener("input",applyDebtFilters));
      balanceFilter.addEventListener("change",applyDebtFilters);
      applyDebtFilters();
      checks().forEach(x=>x.addEventListener("change",updateSelectedCount));
      const printDebts=(items,type)=>{
        if(!items.length){notify("Hãy chọn ít nhất một công trình để in.");return;}
        const customer=type==="customer", labor=type==="labor", internal=type==="internal";
        const title=customer?"BẢNG KÊ CÔNG NỢ KHÁCH HÀNG":labor?"BẢNG KÊ TIỀN CÔNG NHÂN VIÊN":"BẢNG TỔNG HỢP CÔNG NỢ NỘI BỘ";
        const activeTx=d=>(Array.isArray(d.transactions)?d.transactions:[]).filter(t=>!t.voidedAt);
        const payments=a=>(Array.isArray(a.payments)?a.payments:[]).filter(p=>!p.voidedAt);
        let rows="";
        if(customer) rows=items.map((d,index)=>{const tx=activeTx(d).filter(t=>t.direction==="receivable").slice().sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));const due=Math.max(0,Number(d.receivableAmount||0)-Number(d.receivedAmount||0));let cumulative=0;const projectRows=tx.map(t=>{cumulative+=Number(t.amount||0);return "<tr><td>"+(index+1)+"</td><td><b>"+esc(d.projectCode||"—")+"</b><br>"+esc(d.projectName||"—")+"<br>"+esc(d.customerName||"—")+"</td><td>"+(t.installment==="supplemental"?"Phát sinh":"Đợt "+esc(t.installment||1))+"</td><td>"+esc(t.date||"—")+"</td><td>"+esc(t.method||"—")+"</td><td class=\"num\">"+money(t.amount)+"</td><td class=\"num\">"+money(cumulative)+"</td><td class=\"num\">"+money(Math.max(0,Number(d.receivableAmount||0)-cumulative))+"</td><td>"+esc(t.note||t.reference||"—")+"</td></tr>";});if(!tx.length&&due>0)projectRows.push("<tr><td>"+(index+1)+"</td><td><b>"+esc(d.projectCode||"—")+"</b><br>"+esc(d.projectName||"—")+"<br>"+esc(d.customerName||"—")+"</td><td>Chưa thu</td><td>—</td><td>—</td><td class=\"num\">0</td><td class=\"num\">0</td><td class=\"num\">"+money(due)+"</td><td>—</td></tr>");projectRows.push("<tr class=\"project-total\"><td colspan=\"6\">Tổng "+esc(d.projectCode||d.projectName||"công trình")+" · Phải thu "+money(d.receivableAmount)+"</td><td class=\"num\">"+money(d.receivedAmount)+"</td><td class=\"num\">"+money(d.receivedAmount)+"</td><td class=\"num\">"+money(due)+"</td><td></td></tr>");return projectRows.join("");}).join("");
        else if(labor) rows=items.flatMap(d=>(d.laborAccounts||[]).map(a=>{const paid=payments(a).reduce((s,p)=>s+Number(p.amount||0),0);return "<tr><td>"+esc(d.projectCode||"—")+"</td><td>"+esc(d.projectName||"")+"</td><td>"+esc(a.employeeName||"—")+"</td><td class=\"num\">"+money(a.agreedAmount)+"</td><td class=\"num\">"+money(paid)+"</td><td class=\"num\">"+money(Math.max(0,Number(a.agreedAmount||0)-paid))+"</td></tr>";})).join("");
        else rows=items.map(d=>{const accounts=d.laborAccounts||[],planned=accounts.reduce((s,a)=>s+Number(a.agreedAmount||0),0),paid=accounts.reduce((s,a)=>s+payments(a).reduce((x,p)=>x+Number(p.amount||0),0),0);return "<tr><td>"+esc(d.projectCode||"—")+"</td><td>"+esc(d.projectName||"")+"</td><td>"+esc(d.customerName||"—")+"</td><td class=\"num\">"+money(d.contractAmount)+"</td><td class=\"num\">"+money(d.receivableAmount)+"</td><td class=\"num\">"+money(d.receivedAmount)+"</td><td class=\"num\">"+money(Math.max(0,Number(d.receivableAmount||0)-Number(d.receivedAmount||0)))+"</td><td class=\"num\">"+money(planned)+"</td><td class=\"num\">"+money(paid)+"</td><td class=\"num\">"+money(Math.max(0,planned-paid))+"</td></tr>";}).join("");
        const details=items.map(d=>{
          const project=esc(d.projectCode||d.projectName||"Công trình");
          if(customer)return "";
          if(labor)return (d.laborAccounts||[]).map(a=>{const ps=payments(a).slice().sort((x,y)=>String(x.date||"").localeCompare(String(y.date||""))),paid=ps.reduce((s,p)=>s+Number(p.amount||0),0),body=ps.map(p=>"<tr><td>"+esc(p.date||"—")+"</td><td>"+(p.kind==="advance"?"Tạm ứng":"Thanh toán tiền công")+"</td><td class=\"num\">"+money(p.amount)+"</td><td>"+esc(p.method||"—")+"</td><td>"+esc(p.reference||"—")+"</td><td>"+esc(p.note||"—")+"</td></tr>").join("");return "<h3>NHÂN VIÊN: "+esc(a.employeeName||"—")+" · "+project+"</h3><p>Tổng tiền công: "+money(a.agreedAmount)+" · Đã trả: "+money(paid)+" · Còn trả: "+money(Math.max(0,Number(a.agreedAmount||0)-paid))+"</p><table><thead><tr><th>Ngày</th><th>Loại thanh toán</th><th>Số tiền</th><th>Phương thức</th><th>Mã chứng từ</th><th>Ghi chú</th></tr></thead><tbody>"+(body||"<tr><td colspan=\"6\">Chưa có lần trả tiền.</td></tr>")+"</tbody></table>";}).join("");
          const tx=activeTx(d).filter(t=>t.direction==="receivable"),txBody=tx.map(t=>"<tr><td>"+esc(t.date||"—")+"</td><td>Thu tiền khách hàng</td><td>"+esc(t.installment||"—")+"</td><td class=\"num\">"+money(t.amount)+"</td><td>"+esc(t.method||"—")+"</td><td>"+esc(t.reference||"—")+"</td><td>"+esc(t.note||"—")+"</td></tr>").join("");
          const laborBody=(d.laborAccounts||[]).map(a=>{const ps=payments(a),paid=ps.reduce((s,p)=>s+Number(p.amount||0),0),body=ps.map(p=>"<tr><td>"+esc(p.date||"—")+"</td><td>"+(p.kind==="advance"?"Tạm ứng":"Thanh toán tiền công")+"</td><td class=\"num\">"+money(p.amount)+"</td><td>"+esc(p.method||"—")+"</td><td>"+esc(p.reference||"—")+"</td><td>"+esc(p.note||"—")+"</td></tr>").join("");return "<h4>NHÂN VIÊN: "+esc(a.employeeName||"—")+" · Tiền công "+money(a.agreedAmount)+" · Đã trả "+money(paid)+" · Còn "+money(Math.max(0,Number(a.agreedAmount||0)-paid))+"</h4><table><thead><tr><th>Ngày</th><th>Loại thanh toán</th><th>Số tiền</th><th>Phương thức</th><th>Mã chứng từ</th><th>Ghi chú</th></tr></thead><tbody>"+(body||"<tr><td colspan=\"6\">Chưa có lần trả tiền.</td></tr>")+"</tbody></table>";}).join("");
          return "<h3>LỊCH SỬ THU KHÁCH HÀNG — "+project+"</h3><table><thead><tr><th>Ngày</th><th>Loại</th><th>Đợt</th><th>Số tiền</th><th>Phương thức</th><th>Chứng từ</th><th>Ghi chú</th></tr></thead><tbody>"+(txBody||"<tr><td colspan=\"7\">Chưa có lần thu.</td></tr>")+"</tbody></table>"+laborBody;
        }).join("");
        const total=(key)=>items.reduce((s,d)=>s+Number(d[key]||0),0);
        const summary=customer?"<div class=\"summary\"><div>Phải thu<b>"+money(total("receivableAmount"))+"</b></div><div>Đã thu<b>"+money(total("receivedAmount"))+"</b></div><div>Còn phải thu<b>"+money(items.reduce((s,d)=>s+Math.max(0,Number(d.receivableAmount||0)-Number(d.receivedAmount||0)),0))+"</b></div></div>":labor?"<div class=\"summary\"><div>Tổng tiền công<b>"+money(items.reduce((s,d)=>s+(d.laborAccounts||[]).reduce((x,a)=>x+Number(a.agreedAmount||0),0),0))+"</b></div><div>Đã trả nhân viên<b>"+money(items.reduce((s,d)=>s+(d.laborAccounts||[]).reduce((x,a)=>x+payments(a).reduce((z,p)=>z+Number(p.amount||0),0),0),0))+"</b></div><div>Còn trả<b>"+money(items.reduce((s,d)=>s+(d.laborAccounts||[]).reduce((x,a)=>x+Math.max(0,Number(a.agreedAmount||0)-payments(a).reduce((z,p)=>z+Number(p.amount||0),0)),0),0))+"</b></div></div>":"<div class=\"summary\"><div>Tổng phải thu<b>"+money(total("receivableAmount"))+"</b></div><div>Đã thu<b>"+money(total("receivedAmount"))+"</b></div><div>Còn phải thu<b>"+money(items.reduce((s,d)=>s+Math.max(0,Number(d.receivableAmount||0)-Number(d.receivedAmount||0)),0))+"</b></div><div>Còn trả nhân công<b>"+money(items.reduce((s,d)=>s+(d.laborAccounts||[]).reduce((x,a)=>x+Math.max(0,Number(a.agreedAmount||0)-payments(a).reduce((z,p)=>z+Number(p.amount||0),0)),0),0))+"</b></div></div>";
        const head=customer?"<tr><th>STT</th><th>Công trình / Khách hàng</th><th>Đợt</th><th>Ngày thanh toán</th><th>Phương thức</th><th>Số tiền (₫)</th><th>Lũy kế đã thu (₫)</th><th>Còn phải thu (₫)</th><th>Ghi chú</th></tr>":labor?"<tr><th>Mã công trình</th><th>Tên công trình</th><th>Nhân viên</th><th>Tổng tiền công</th><th>Đã trả</th><th>Còn trả</th></tr>":"<tr><th>Mã công trình</th><th>Tên công trình</th><th>Khách hàng</th><th>Giá trị HĐ</th><th>Phải thu</th><th>Đã thu</th><th>Còn thu</th><th>Tiền công dự kiến</th><th>Đã trả nhân viên</th><th>Còn trả nhân viên</th></tr>";
        const doc="<!doctype html><html lang=\"vi\"><head><meta charset=\"utf-8\"><title>"+title+"</title><style>@page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#17251d;font-size:9px}h1{font-size:20px;margin:0 0 6px;color:#123e34}h3{font-size:11px;color:#176b58;margin:14px 0 5px}h4{font-size:10px;color:#176b58;margin:12px 0 5px}p{margin:0 0 8px;color:#56645c}.summary{display:flex;gap:10px;margin-bottom:12px}.summary div{border:1px solid #d7e0da;border-radius:5px;padding:8px;flex:1}.summary b{display:block;font-size:12px;margin-top:4px}table{width:100%;border-collapse:collapse;margin-bottom:8px;table-layout:auto}th,td{border:1px solid #cfd8d1;padding:5px 4px;text-align:left;vertical-align:top}th{background:#164f42;color:white;font-weight:bold}tbody tr:nth-child(even){background:#f7faf8}.project-total{background:#e8f4ee!important;font-weight:bold}.num{text-align:right;white-space:nowrap}.foot{margin-top:16px;display:flex;justify-content:space-between}.report-note{font-size:8px;color:#596860;font-style:italic}@media print{thead{display:table-header-group}tr{break-inside:avoid}.customer-report table{font-size:8px}.customer-report th,.customer-report td{padding:4px 3px}}</style></head><body class=\""+(customer?"customer-report":"") + "\"><h1>"+title+"</h1><p>Ngày in: "+new Date().toLocaleDateString("vi-VN")+" · Tổng số công trình: "+items.length+"</p>"+summary+"<table><thead>"+head+"</thead><tbody>"+(rows||"<tr><td colspan=\"10\">Không có dữ liệu phù hợp để in.</td></tr>")+"</tbody></table>"+(customer?"<p class=\"report-note\">Ghi chú: Các đợt thanh toán của từng công trình được trình bày chung trong một bảng; số liệu lấy từ lịch sử giao dịch đã ghi nhận.</p>":"")+details+"<div class=\"foot\"><span>GROVA DOCUMENT · "+title+"</span><span>Ký xác nhận: ____________________</span></div><script>window.onload=()=>window.print();<\\/script></body></html>";
        const w=window.open("","_blank");if(!w){notify("Safari đang chặn cửa sổ in. Hãy cho phép cửa sổ bật lên rồi thử lại.");return;}w.document.open();w.document.write(doc);w.document.close();
      };
      const choosePrintType=(items)=>{const answer=prompt("Chọn loại bản in:\n1 — Công nợ khách hàng (gửi khách)\n2 — Tiền công nhân viên (gửi nhân viên)\n3 — Tổng hợp nội bộ (trình sếp)");const type=answer==="1"?"customer":answer==="2"?"labor":answer==="3"?"internal":null;if(!type){if(answer!==null)notify("Lựa chọn không hợp lệ. Nhập 1, 2 hoặc 3.");return;}printDebts(items,type);};
      host.querySelector('[data-debt-action="print-all"]').addEventListener("click",()=>choosePrintType(debts));
      host.querySelector('[data-debt-action="print-selected"]').addEventListener("click",()=>{const ids=new Set(checks().filter(x=>x.checked).map(x=>String(x.dataset.id)));choosePrintType(debts.filter(d=>ids.has(String(d.id))));});
      host.querySelector('[data-debt-action="new"]').addEventListener("click",()=>showCreate(available));
      host.querySelectorAll('[data-debt-action="detail"]').forEach(b=>b.addEventListener("click",()=>showDetail(db,b.dataset.id)));
      host.querySelectorAll('[data-debt-action="delete"]').forEach(b=>b.addEventListener("click",async()=>{const d=debts.find(x=>String(x.id)===String(b.dataset.id));if(!d)return;if(!confirm(`Xóa hồ sơ công nợ của ${d.projectCode||d.projectName||"công trình này"}? Toàn bộ lịch sử thu/chi trong hồ sơ sẽ bị xóa. Công trình vẫn được giữ nguyên.`))return;try{await root.GROVA_DEBT_SERVICE.deleteDebt(db,d.id);notify("Đã xóa hồ sơ công nợ.");await render();}catch(err){notify(err.message||"Không thể xóa hồ sơ công nợ.");}}));
    } catch (e) {
      host.innerHTML = '<div class="debt-error">'+esc(e.message||"Không tải được công nợ.")+'</div>';
    }
  }

  function showCreate(available) {
    const editor=document.getElementById("debtEditor");
    if (!editor) return;
    if (!available.length) { notify("Tất cả công trình đã có hồ sơ công nợ hoặc chưa tải được danh sách công trình."); return; }
    editor.hidden=false;
    editor.innerHTML=`
      <h3>Tạo hồ sơ công nợ</h3>
      <form id="debtCreateForm" class="debt-form">
        <label class="full">Công trình<select name="projectId" required><option value="">-- Chọn công trình --</option>${available.map(p=>`<option value="${esc(p.id)}">${esc(p.code||"Chưa có mã")} — ${esc(p.name||"Chưa đặt tên")}</option>`).join("")}</select></label>
        <label>Giá trị hợp đồng (VND)<input name="contractAmount" id="debtContractAmount" type="number" min="0" step="1" value="0" required></label>
        <label>Cách tính phải thu<select name="receivableMode" id="debtReceivableMode"><option value="percent">Theo % hợp đồng</option><option value="amount">Nhập số tiền trực tiếp</option></select></label>
        <label id="debtPercentWrap">Tỷ lệ phải thu (%)<input name="receivablePercent" id="debtReceivablePercent" type="number" min="0" max="100" step="0.01" value="100" required></label>
        <label id="debtAmountWrap" hidden>Tổng phải thu (VND)<input name="receivableDirectAmount" id="debtReceivableDirectAmount" type="number" min="0" step="1" value="0"></label>
        <div class="full debt-calculation-preview"><span>Tiền phải thu</span><strong id="debtReceivablePreview">0 ₫</strong><span>Số còn phải thu sẽ tự trừ các khoản đã nhận.</span></div>
        <div class="full debt-actions"><button type="button" class="secondary" data-debt-action="cancel">Hủy</button><button type="submit" class="primary">Lưu hồ sơ</button></div>
      </form>`;
    const createForm=editor.querySelector("#debtCreateForm");
    const contractInput=createForm.querySelector("#debtContractAmount");
    const modeInput=createForm.querySelector("#debtReceivableMode");
    const percentInput=createForm.querySelector("#debtReceivablePercent");
    const directInput=createForm.querySelector("#debtReceivableDirectAmount");
    const percentWrap=createForm.querySelector("#debtPercentWrap");
    const amountWrap=createForm.querySelector("#debtAmountWrap");
    const preview=createForm.querySelector("#debtReceivablePreview");
    const computedReceivable=()=>modeInput.value==="percent" ? Math.round(Math.max(0,Number(contractInput.value||0))*Math.max(0,Math.min(100,Number(percentInput.value||0)))/100) : Math.max(0,Math.round(Number(directInput.value||0)));
    const updateReceivablePreview=()=>{const byPercent=modeInput.value==="percent";percentWrap.hidden=!byPercent;amountWrap.hidden=byPercent;percentInput.required=byPercent;directInput.required=!byPercent;preview.textContent=money(computedReceivable());};
    [contractInput,modeInput,percentInput,directInput].forEach(el=>el.addEventListener("input",updateReceivablePreview));
    updateReceivablePreview();
    editor.querySelector('[data-debt-action="cancel"]').onclick=()=>{editor.hidden=true;};
    createForm.onsubmit=async e=>{
      e.preventDefault();
      const submitButton=createForm.querySelector('[type="submit"]');if(submitButton.disabled)return;submitButton.disabled=true;submitButton.textContent="Đang lưu…";
      try {
        const {c,db}=context(); const fd=new FormData(e.currentTarget); const p=c.getProjects().find(x=>String(x.id)===String(fd.get("projectId")));
        if(!p) throw new Error("Không tìm thấy công trình đã chọn.");
        const result=await root.GROVA_DEBT_SERVICE.createDebt(db,{projectId:p.id,projectCode:p.code,projectName:p.name,customerName:p.customer,contractAmount:Number(fd.get("contractAmount")),receivableAmount:computedReceivable(),payableAmount:0});
        if(result.alreadyExists) throw new Error("Công trình này đã có hồ sơ công nợ. Hãy mở hồ sơ hiện có.");
        notify("Đã tạo hồ sơ công nợ."); await render();
      } catch(err) { notify(err.message||"Không thể tạo hồ sơ công nợ."); } finally { if(submitButton.isConnected){submitButton.disabled=false;submitButton.textContent="Lưu hồ sơ";} }
    };
    editor.scrollIntoView({behavior:"smooth",block:"start"});
  }

  function renderLaborAccounts(debt) {
    const accounts = Array.isArray(debt.laborAccounts) ? debt.laborAccounts : [];
    if (!accounts.length) return '<p class="debt-empty">Chưa có hồ sơ tiền công nhân viên trong công trình này.</p>';
    return accounts.map(function(a) {
      const payments = Array.isArray(a.payments) ? a.payments : [];
      const paid = payments.filter(function(p) { return !p.voidedAt; }).reduce(function(s,p) { return s + Number(p.amount || 0); }, 0);
      const history = payments.map(function(p) { return '<tr><td>' + esc(p.date || '') + '</td><td>' + (p.kind === 'advance' ? 'Tạm ứng' : 'Thanh toán') + '</td><td>' + money(p.amount) + '</td><td>' + esc(p.method || '—') + '</td><td>' + esc(p.reference || '—') + '</td><td>' + esc(p.note || '—') + '</td></tr>'; }).join('');
      return '<section class="debt-labor-card"><div class="debt-toolbar"><div><h4>' + esc(a.employeeName) + '</h4><p>' + esc(a.position || 'Nhân viên') + ' · Tổng tiền công ' + money(a.agreedAmount) + '</p></div><div class="debt-labor-balance"><small>Còn phải trả</small><strong>' + money(Math.max(0, Number(a.agreedAmount || 0) - paid)) + '</strong></div></div>' +
        '<form class="debt-labor-payment-form debt-form" data-account-id="' + esc(a.id) + '"><label>Loại thanh toán<select name="kind"><option value="advance">Tạm ứng</option><option value="payment">Thanh toán tiền công</option></select></label><label>Ngày<input name="date" type="date" value="' + new Date().toISOString().slice(0,10) + '" required></label><label>Cách nhập số tiền<select name="mode"><option value="percent">Theo % tổng tiền công</option><option value="amount">Nhập số tiền trực tiếp</option></select></label><label class="labor-percent-label">Tỷ lệ (%)<input name="percent" type="number" min="0.01" max="100" step="0.01" value="50"></label><label class="labor-direct-label" hidden>Số tiền (VND)<input name="directAmount" type="text" inputmode="numeric" placeholder="Ví dụ: 5.000.000"></label><div class="full debt-calculation-preview"><span>Số tiền trả</span><strong data-labor-preview>0 ₫</strong><span data-labor-basis></span></div><label>Phương thức<input name="method" placeholder="Chuyển khoản / tiền mặt"></label><label>Mã chứng từ<input name="reference" placeholder="Số phiếu / giao dịch"></label><label>Ghi chú<input name="note" placeholder="Nội dung thanh toán"></label><div class="full debt-actions"><button class="primary" type="submit">Lưu lần trả tiền</button></div></form>' +
        '<h5>Lịch sử trả tiền</h5><div class="debt-table-wrap"><table class="debt-table"><thead><tr><th>Ngày</th><th>Loại</th><th>Số tiền</th><th>Phương thức</th><th>Chứng từ</th><th>Ghi chú</th></tr></thead><tbody>' + (history || '<tr><td colspan="6" class="debt-empty">Chưa có lần trả tiền.</td></tr>') + '</tbody></table></div></section>';
    }).join('');
  }
  async function showDetail(db, id) {
    const editor=document.getElementById("debtEditor"); if(!editor)return;
    try {
      const debt=await root.GROVA_DEBT_SERVICE.getDebt(db,id);
      if(!debt) throw new Error("Không tìm thấy hồ sơ công nợ.");
      selectedDebt=id; txItems=(Array.isArray(debt.transactions)?debt.transactions:[]).slice().sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
      editor.hidden=false;
      editor.innerHTML=`
        <div class="debt-toolbar"><div><h3>${esc(debt.projectCode||"")} — ${esc(debt.projectName||"Công nợ")}</h3><p>${esc(debt.customerName||"")}</p></div><button class="secondary" data-debt-action="cancel">Đóng</button></div>
        <div class="debt-summary"><div><small>Phải thu còn lại</small><strong>${money(debt.receivableOutstanding)}</strong></div><div><small>Còn trả nhân công</small><strong>${money(debt.payableOutstanding)}</strong></div><div><small>Đã thu</small><strong>${money(debt.receivedAmount)}</strong></div><div><small>Đã trả nhân công</small><strong>${money(debt.paidAmount)}</strong></div></div>
        <h4>Ghi nhận thanh toán</h4>
        <form id="debtTxForm" class="debt-form">
          <label>Loại giao dịch<select name="direction"><option value="receivable">Thu tiền khách hàng</option></select></label>
          <label>Đợt thanh toán<select name="installment">${Array.from({length:10},(_,i)=>`<option value="${i+1}">Đợt ${i+1}</option>`).join("")}<option value="supplemental">Phát sinh / bổ sung</option></select></label>
          <label>Ngày<input name="date" type="date" value="${new Date().toISOString().slice(0,10)}" required></label>
          <label>Cách nhập số tiền<select name="amountMode" id="debtTxAmountMode"><option value="percent">Theo % tổng hợp đồng</option><option value="amount">Nhập số tiền trực tiếp</option></select></label>
          <label id="debtTxPercentWrap">Tỷ lệ thanh toán (%)<input name="percent" id="debtTxPercent" type="number" min="0.01" max="100" step="0.01" value="40" required></label>
          <label id="debtTxDirectWrap" hidden>Số tiền (VND)<input name="directAmount" id="debtTxDirectAmount" type="text" inputmode="numeric" autocomplete="off" placeholder="Ví dụ: 5.000.000"></label>
          <div class="full debt-calculation-preview"><span>Số tiền giao dịch</span><strong id="debtTxAmountPreview">0 ₫</strong><span id="debtTxBasis">Tính theo số dư phải thu / phải trả hiện tại.</span></div>
          <label>Phương thức<input name="method" placeholder="Chuyển khoản / tiền mặt"></label>
          <label>Mã chứng từ<input name="reference" placeholder="Số phiếu / giao dịch"></label>
          <label>Ghi chú<input name="note" placeholder="Nội dung thanh toán"></label>
          <div class="full debt-actions"><button class="primary" type="submit">Lưu thanh toán</button></div>
        </form>
        <h4>Lịch sử thu khách hàng</h4>
        <div class="debt-table-wrap"><table class="debt-table"><thead><tr><th>Ngày</th><th>Loại</th><th>Đợt</th><th>Số tiền</th><th>Phương thức</th><th>Chứng từ</th><th>Ghi chú</th></tr></thead><tbody>${txItems.map(t=>`<tr><td>${esc(t.date)}</td><td>${t.direction==="receivable"?"Thu":"Chi"}${t.voidedAt?" (Đã hủy)":""}</td><td>${t.installment==="supplemental"?"Bổ sung":("Đợt "+esc(t.installment||1))}</td><td>${money(t.amount)}</td><td>${esc(t.method)}</td><td>${esc(t.reference)}</td><td>${esc(t.note)}</td></tr>`).join("")||'<tr><td colspan="7" class="debt-empty">Chưa có giao dịch.</td></tr>'}</tbody></table></div>
        <hr class="debt-section-divider"><h3>Phải trả nhân công</h3><p class="debt-muted">Mỗi nhân viên có tổng tiền công thỏa thuận, tạm ứng và lịch sử thực trả riêng.</p>
        <form id="debtLaborCreateForm" class="debt-form"><label>Nhân viên nhận tiền<select name="employeeId" required><option value="">-- Chọn nhân viên --</option>${(root.GROVA_DEBT_CONTEXT.getEmployees ? root.GROVA_DEBT_CONTEXT.getEmployees() : []).map(e => `<option value="${esc(e.id)}">${esc(e.name || "Chưa có tên")}${e.position ? " — " + esc(e.position) : ""}</option>`).join("")}</select></label><label>Tổng tiền công thỏa thuận (VND)<input name="agreedAmount" type="text" inputmode="numeric" placeholder="Ví dụ: 20.000.000" required></label><div class="full debt-actions"><button class="primary" type="submit">＋ Thêm nhân công</button></div></form>
        <div class="debt-labor-accounts">${renderLaborAccounts(debt)}</div>`;
      const employees = root.GROVA_DEBT_CONTEXT.getEmployees ? root.GROVA_DEBT_CONTEXT.getEmployees() : [];
      const parseMoney = value => { const digits = String(value == null ? "" : value).replace(/[^0-9]/g, ""); return digits ? Number(digits) : 0; };
      const formatMoneyInput = value => { const digits = String(value == null ? "" : value).replace(/[^0-9]/g, ""); return digits ? new Intl.NumberFormat("vi-VN").format(Number(digits)) : ""; };
      const laborCreate = editor.querySelector("#debtLaborCreateForm");
      const agreedInput = laborCreate.querySelector("[name=agreedAmount]");
      agreedInput.addEventListener("input", () => { const f = formatMoneyInput(agreedInput.value); if (f !== agreedInput.value) { const p = agreedInput.selectionStart; agreedInput.value = f; try { agreedInput.setSelectionRange(p,p); } catch (_) {} } });
      laborCreate.onsubmit = async e => { e.preventDefault(); try { const fd = new FormData(e.currentTarget); const emp = employees.find(x => String(x.id) === String(fd.get("employeeId"))); if (!emp) throw new Error("Vui lòng chọn nhân viên trong danh sách Nhân sự."); await root.GROVA_DEBT_SERVICE.createLaborAccount(db,id,{employeeId:emp.id,employeeName:emp.name,position:emp.position,agreedAmount:parseMoney(fd.get("agreedAmount"))}); notify("Đã thêm hồ sơ tiền công nhân viên."); await render(); await showDetail(db,id); } catch (err) { notify(err.message || "Không thể tạo hồ sơ tiền công."); } };
      editor.querySelectorAll(".debt-labor-payment-form").forEach(form => {
        const mode=form.querySelector("[name=mode]"), pct=form.querySelector("[name=percent]"), direct=form.querySelector("[name=directAmount]"), pctLabel=form.querySelector(".labor-percent-label"), directLabel=form.querySelector(".labor-direct-label"), preview=form.querySelector("[data-labor-preview]"), basis=form.querySelector("[data-labor-basis]"), account=(debt.laborAccounts||[]).find(a=>String(a.id)===String(form.dataset.accountId));
        const already=(account.payments||[]).filter(p=>!p.voidedAt).reduce((s,p)=>s+Number(p.amount||0),0);
        const amount=()=>mode.value==="percent"?Math.min(Math.max(0,Number(account.agreedAmount||0)-already),Math.round(Number(account.agreedAmount||0)*Math.min(100,Math.max(0,Number(pct.value||0)))/100)):parseMoney(direct.value);
        const update=()=>{const byPct=mode.value==="percent";pctLabel.hidden=!byPct;directLabel.hidden=byPct;pct.required=byPct;direct.required=!byPct;preview.textContent=money(amount());basis.textContent="Tổng tiền công "+money(account.agreedAmount)+"; đã trả "+money(already)+". % tính trên tổng tiền công.";};
        direct.addEventListener("input",()=>{const f=formatMoneyInput(direct.value);if(f!==direct.value){const p=direct.selectionStart;direct.value=f;try{direct.setSelectionRange(p,p)}catch(_){}}update();}); [mode,pct].forEach(el=>el.addEventListener("input",update)); mode.addEventListener("change",update); update();
        form.onsubmit=async e=>{e.preventDefault();try{const fd=new FormData(e.currentTarget),amt=amount();if(amt<1)throw new Error("Vui lòng nhập số tiền lớn hơn 0.");const pid=(root.crypto&&root.crypto.randomUUID)?root.crypto.randomUUID():"LABPAY-"+Date.now()+"-"+Math.random().toString(36).slice(2,8);await root.GROVA_DEBT_SERVICE.recordLaborPayment(db,id,account.id,pid,{kind:fd.get("kind"),amount:amt,date:fd.get("date"),method:fd.get("method"),reference:fd.get("reference"),note:fd.get("note")});notify("Đã lưu lần trả tiền nhân công.");await render();await showDetail(db,id);}catch(err){notify(err.message||"Không thể lưu lần trả tiền.");}};
      });
      const txForm=editor.querySelector("#debtTxForm");
      const txDirection=txForm.querySelector('[name="direction"]');
      const txMode=txForm.querySelector("#debtTxAmountMode");
      const txPercent=txForm.querySelector("#debtTxPercent");
      const txDirect=txForm.querySelector("#debtTxDirectAmount");
      const txPercentWrap=txForm.querySelector("#debtTxPercentWrap");
      const txDirectWrap=txForm.querySelector("#debtTxDirectWrap");
      const txPreview=txForm.querySelector("#debtTxAmountPreview");
      const txBasis=txForm.querySelector("#debtTxBasis");
      const installmentSelect=txForm.querySelector('[name="installment"]');
      const usedInstallments=()=>new Set(txItems.filter(t=>!t.voidedAt&&t.direction===txDirection.value&&String(t.installment||"1")!=="supplemental").map(t=>String(t.installment||"1")));
      const refreshInstallments=()=>{
        const used=usedInstallments();
        Array.from(installmentSelect.options).forEach(opt=>{
          if(opt.value==="supplemental"){opt.disabled=false;opt.textContent="Phát sinh / bổ sung";return;}
          const taken=used.has(String(opt.value));opt.disabled=taken;
          opt.textContent=taken?"Đợt "+opt.value+" — đã ghi nhận":"Đợt "+opt.value;
        });
        if(installmentSelect.selectedOptions[0]&&installmentSelect.selectedOptions[0].disabled){
          const next=Array.from(installmentSelect.options).find(o=>!o.disabled);
          if(next) installmentSelect.value=next.value;
        }
      };
      const parseVnd=(value)=>{const digits=String(value==null?"":value).replace(/[^0-9]/g,"");return digits?Number(digits):0;};
      const formatVndInput=(value)=>{const digits=String(value==null?"":value).replace(/[^0-9]/g,"");return digits?new Intl.NumberFormat("vi-VN").format(Number(digits)):"";};
      const txAmount=()=>{
        if(txMode.value==="amount") return parseVnd(txDirect.value);
        const contractBase=Number(debt.contractAmount||0);
        const totalBase=txDirection.value==="receivable" ? Number(debt.receivableAmount||0) : Number(debt.payableAmount||0);
        const base=contractBase>0 ? contractBase : totalBase;
        const pct=Math.min(100,Math.max(0,Number(txPercent.value||0)));
        const requested=Math.round(base*pct/100);
        const already=txItems.filter(t=>!t.voidedAt&&t.direction===txDirection.value).reduce((sum,t)=>sum+Number(t.amount||0),0);
        return Math.min(requested,Math.max(0,base-already));
      };
      const updateTxPreview=()=>{
        const byPercent=txMode.value==="percent";
        txPercentWrap.hidden=!byPercent;txDirectWrap.hidden=byPercent;
        txPercent.required=byPercent;txDirect.required=!byPercent;
        const base=txDirection.value==="receivable" ? Number(debt.receivableOutstanding||0) : Number(debt.payableOutstanding||0);
        txBasis.textContent="Tính theo tổng hợp đồng "+money(Number(debt.contractAmount||0))+"; phần trăm áp dụng trên tổng hợp đồng, không phải số dư còn lại.";
        txPreview.textContent=money(txAmount());refreshInstallments();
      };
      txDirect.addEventListener("input",()=>{const before=txDirect.value;const formatted=formatVndInput(before);if(before!==formatted){const end=txDirect.selectionStart;txDirect.value=formatted;try{txDirect.setSelectionRange(end,end);}catch(_){}}updateTxPreview();});
      [txDirection,txMode,txPercent].forEach(el=>el.addEventListener("input",updateTxPreview));
      [txDirection,txMode].forEach(el=>el.addEventListener("change",updateTxPreview));
      installmentSelect.addEventListener("change",refreshInstallments);
      updateTxPreview();
      editor.querySelector('[data-debt-action="cancel"]').onclick=()=>{editor.hidden=true;};
      txForm.onsubmit=async e=>{
        e.preventDefault();
        try {
          const fd=new FormData(e.currentTarget);
          const txId=(root.crypto&&root.crypto.randomUUID)?root.crypto.randomUUID():"TX-"+Date.now()+"-"+Math.random().toString(36).slice(2,10);
          const result=await root.GROVA_DEBT_SERVICE.recordTransaction(db,id,txId,{direction:fd.get("direction"),installment:fd.get("installment"),date:fd.get("date"),amount:txAmount(),method:fd.get("method"),reference:fd.get("reference"),note:fd.get("note")});
          if(result.duplicate) throw new Error("Giao dịch đã tồn tại; không ghi trùng.");
          notify("Đã lưu giao dịch thanh toán."); await render(); await showDetail(db,id);
        } catch(err) { notify(err.message||"Không thể lưu giao dịch."); }
      };
      editor.scrollIntoView({behavior:"smooth",block:"start"});
    } catch(e) { notify(e.message||"Không tải được chi tiết công nợ."); }
  }

  root.GROVA_DEBT_UI={render};
})(window);
