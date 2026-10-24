/* GROVA internal profitability estimator. Local calculation only; no Firestore writes. */
(function () {
  "use strict";
  const root = document.getElementById("profitabilityReport");
  if (!root) return;
  const $ = id => root.querySelector("#" + id);
  const fmt = n => new Intl.NumberFormat("vi-VN", {maximumFractionDigits:0}).format(Math.round(Number(n)||0)) + " ₫";
  const val = id => Math.max(0, Number($(id).value)||0);
  const out = (id,n) => { $(id).textContent = fmt(n); };
  function calculate() {
    const stops=Math.floor(val("profitStops")), price=val("profitSalePerStop"), labor=val("profitLaborPerStop");
    const expense=val("profitExpense"), vr=val("profitVatRate")/100, cr=val("profitCitRate")/100;
    const gross=stops*price, revenue=vr ? gross/(1+vr) : gross, outputVat=gross-revenue;
    const expenseVat=$("profitExpenseVatEligible").checked && vr>0;
    const expenseNet=expenseVat ? expense/(1+vr) : expense, inputVat=expenseVat ? expense-expenseNet : 0;
    const vatDue=Math.max(0,outputVat-inputVat), wages=stops*labor, profit=revenue-wages-expenseNet;
    const salaryDeductible=$("profitSalaryDeductible").checked, expenseDeductible=$("profitExpenseDeductible").checked;
    const taxable=Math.max(0,revenue-(salaryDeductible?wages:0)-(expenseDeductible?expenseNet:0));
    const cit=taxable*cr, after=profit-cit;
    [["profitRevenueGross",gross],["profitRevenueNet",revenue],["profitOutputVat",outputVat],["profitInputVat",inputVat],["profitVatDue",vatDue],["profitLaborTotal",wages],["profitExpenseNet",expenseNet],["profitBeforeTax",profit],["profitTaxableEstimate",taxable],["profitCitEstimate",cit],["profitAfterTax",after]].forEach(([id,n])=>out(id,n));
    $("profitMargin").textContent=revenue>0?(after/revenue*100).toLocaleString("vi-VN",{maximumFractionDigits:2})+"%":"—";
    $("profitTaxNote").textContent=salaryDeductible?"Đang giả định hồ sơ tiền lương đủ điều kiện tính chi phí được trừ.":"Lương chưa được trừ khi ước tính thu nhập chịu thuế.";
    $("profitExpenseNote").textContent=expenseVat?"Đang giả định chi phí đã gồm VAT và có hóa đơn hợp lệ để khấu trừ.":"Không tính VAT đầu vào được khấu trừ cho khoản chi này.";
    $("profitReportMeta").textContent="Báo cáo ước tính · "+stops+" stop · VAT "+(vr*100).toLocaleString("vi-VN")+"% · TNDN giả định "+(cr*100).toLocaleString("vi-VN")+"%";
  }
  root.addEventListener("input",calculate); root.addEventListener("change",calculate);
  $("profitPrint").addEventListener("click",function(){
    calculate();
    const style=document.createElement("style");
    style.id="profitReportPrintStyle";
    style.textContent="@media print{body *{visibility:hidden!important}#profitabilityReport,#profitabilityReport *{visibility:visible!important}#profitabilityReport{position:absolute;left:0;top:0;width:100%;padding:0!important;border:0!important;box-shadow:none!important}#profitInputs{display:none!important}#profitReportResults{display:block!important}.profit-report-heading button{display:none!important}.profit-results-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}";
    document.head.appendChild(style);
    window.print();
    setTimeout(function(){const added=document.getElementById("profitReportPrintStyle");if(added)added.remove();},500);
  });
  calculate();
})();