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
        <div class="debt-summary">
          <div><small>Tổng phải thu</small><strong>${money(debts.reduce((s,d)=>s+Number(d.receivableAmount||0),0))}</strong></div>
          <div><small>Đã thu</small><strong>${money(debts.reduce((s,d)=>s+Number(d.receivedAmount||0),0))}</strong></div>
          <div><small>Còn phải thu</small><strong>${money(debts.reduce((s,d)=>s+Math.max(0,Number(d.receivableAmount||0)-Number(d.receivedAmount||0)),0))}</strong></div>
          <div><small>Còn phải trả</small><strong>${money(debts.reduce((s,d)=>s+Math.max(0,Number(d.payableAmount||0)-Number(d.paidAmount||0)),0))}</strong></div>
        </div>
        <div id="debtEditor" class="debt-editor" hidden></div>
        <div class="debt-table-wrap"><table class="debt-table"><thead><tr><th>Công trình</th><th>Khách hàng</th><th>Giá trị hợp đồng</th><th>Phải thu</th><th>Đã thu</th><th>Còn thu</th><th>Phải trả</th><th>Đã trả</th><th>Còn trả</th><th></th></tr></thead><tbody>
        ${debts.map(d=>`<tr><td><b>${esc(d.projectCode||"—")}</b><div>${esc(d.projectName||"")}</div></td><td>${esc(d.customerName||"—")}</td><td>${money(d.contractAmount)}</td><td>${money(d.receivableAmount)}</td><td>${money(d.receivedAmount)}</td><td>${money(Math.max(0,Number(d.receivableAmount||0)-Number(d.receivedAmount||0)))}</td><td>${money(d.payableAmount)}</td><td>${money(d.paidAmount)}</td><td>${money(Math.max(0,Number(d.payableAmount||0)-Number(d.paidAmount||0)))}</td><td><div class="debt-actions-inline"><button class="secondary" data-debt-action="detail" data-id="${esc(d.id)}">Chi tiết</button><button class="danger" data-debt-action="delete" data-id="${esc(d.id)}">Xóa</button></div></td></tr>`).join("")}
        ${debts.length ? "" : '<tr><td colspan="10" class="debt-empty">Chưa có hồ sơ công nợ.</td></tr>'}
        </tbody></table></div>`;
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
        <label>Tổng phải trả (VND)<input name="payableAmount" type="number" min="0" step="1" value="0" required></label>
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
      try {
        const {c,db}=context(); const fd=new FormData(e.currentTarget); const p=c.getProjects().find(x=>String(x.id)===String(fd.get("projectId")));
        if(!p) throw new Error("Không tìm thấy công trình đã chọn.");
        const result=await root.GROVA_DEBT_SERVICE.createDebt(db,{projectId:p.id,projectCode:p.code,projectName:p.name,customerName:p.customer,contractAmount:Number(fd.get("contractAmount")),receivableAmount:computedReceivable(),payableAmount:Number(fd.get("payableAmount"))});
        if(result.alreadyExists) throw new Error("Công trình này đã có hồ sơ công nợ. Hãy mở hồ sơ hiện có.");
        notify("Đã tạo hồ sơ công nợ."); await render();
      } catch(err) { notify(err.message||"Không thể tạo hồ sơ công nợ."); }
    };
    editor.scrollIntoView({behavior:"smooth",block:"start"});
  }

  async function showDetail(db, id) {
    const editor=document.getElementById("debtEditor"); if(!editor)return;
    try {
      const debt=await root.GROVA_DEBT_SERVICE.getDebt(db,id);
      if(!debt) throw new Error("Không tìm thấy hồ sơ công nợ.");
      selectedDebt=id; txItems=await root.GROVA_DEBT_SERVICE.listTransactions(db,id);
      editor.hidden=false;
      editor.innerHTML=`
        <div class="debt-toolbar"><div><h3>${esc(debt.projectCode||"")} — ${esc(debt.projectName||"Công nợ")}</h3><p>${esc(debt.customerName||"")}</p></div><button class="secondary" data-debt-action="cancel">Đóng</button></div>
        <div class="debt-summary"><div><small>Phải thu còn lại</small><strong>${money(debt.receivableOutstanding)}</strong></div><div><small>Phải trả còn lại</small><strong>${money(debt.payableOutstanding)}</strong></div><div><small>Đã thu</small><strong>${money(debt.receivedAmount)}</strong></div><div><small>Đã trả</small><strong>${money(debt.paidAmount)}</strong></div></div>
        <h4>Ghi nhận thanh toán</h4>
        <form id="debtTxForm" class="debt-form">
          <label>Loại giao dịch<select name="direction"><option value="receivable">Thu tiền khách hàng</option><option value="payable">Chi / thanh toán</option></select></label>
          <label>Đợt thanh toán<select name="installment">${Array.from({length:10},(_,i)=>`<option value="${i+1}">Đợt ${i+1}</option>`).join("")}<option value="supplemental">Phát sinh / bổ sung</option></select></label>
          <label>Ngày<input name="date" type="date" value="${new Date().toISOString().slice(0,10)}" required></label>
          <label>Cách nhập số tiền<select name="amountMode" id="debtTxAmountMode"><option value="percent">Theo % giá trị phải thu / phải trả</option><option value="amount">Nhập số tiền trực tiếp</option></select></label>
          <label id="debtTxPercentWrap">Tỷ lệ thanh toán (%)<input name="percent" id="debtTxPercent" type="number" min="0.01" max="100" step="0.01" value="40" required></label>
          <label id="debtTxDirectWrap" hidden>Số tiền (VND)<input name="directAmount" id="debtTxDirectAmount" type="number" min="1" step="1" value="1"></label>
          <div class="full debt-calculation-preview"><span>Số tiền giao dịch</span><strong id="debtTxAmountPreview">0 ₫</strong><span id="debtTxBasis">Tính theo số dư phải thu / phải trả hiện tại.</span></div>
          <label>Phương thức<input name="method" placeholder="Chuyển khoản / tiền mặt"></label>
          <label>Mã chứng từ<input name="reference" placeholder="Số phiếu / giao dịch"></label>
          <label>Ghi chú<input name="note" placeholder="Nội dung thanh toán"></label>
          <div class="full debt-actions"><button class="primary" type="submit">Lưu thanh toán</button></div>
        </form>
        <h4>Lịch sử thu / chi</h4>
        <div class="debt-table-wrap"><table class="debt-table"><thead><tr><th>Ngày</th><th>Loại</th><th>Đợt</th><th>Số tiền</th><th>Phương thức</th><th>Chứng từ</th><th>Ghi chú</th></tr></thead><tbody>${txItems.map(t=>`<tr><td>${esc(t.date)}</td><td>${t.direction==="receivable"?"Thu":"Chi"}${t.voidedAt?" (Đã hủy)":""}</td><td>${t.installment==="supplemental"?"Bổ sung":("Đợt "+esc(t.installment||1))}</td><td>${money(t.amount)}</td><td>${esc(t.method)}</td><td>${esc(t.reference)}</td><td>${esc(t.note)}</td></tr>`).join("")||'<tr><td colspan="7" class="debt-empty">Chưa có giao dịch.</td></tr>'}</tbody></table></div>`;
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
      const txAmount=()=>{
        if(txMode.value==="amount") return Math.max(0,Math.round(Number(txDirect.value||0)));
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
      [txDirection,txMode,txPercent,txDirect].forEach(el=>el.addEventListener("input",updateTxPreview));
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
