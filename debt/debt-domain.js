

(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GROVA_DEBT_DOMAIN = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const DIRECTIONS = Object.freeze(["receivable", "payable"]);

  function toPositiveVnd(value, fieldName = "Số tiền") {
    const amount = typeof value === "number" ? value : Number(value);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new Error(fieldName + " phải là số nguyên VND lớn hơn 0.");
    }
    return amount;
  }

  function toNonNegativeVnd(value, fieldName = "Số tiền") {
    const amount = typeof value === "number" ? value : Number(value);
    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw new Error(fieldName + " phải là số nguyên VND không âm.");
    }
    return amount;
  }

  function validateTransaction(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("Dữ liệu thanh toán không hợp lệ.");
    }

    const direction = String(input.direction || "");
    if (!DIRECTIONS.includes(direction)) {
      throw new Error("Chiều giao dịch phải là receivable hoặc payable.");
    }

    const amount = toPositiveVnd(input.amount, "Số tiền thanh toán");
    const date = String(input.date || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("Ngày thanh toán phải theo định dạng YYYY-MM-DD.");
    }

    return {
      direction,
      amount,
      date,
      method: String(input.method || "").trim().slice(0, 80),
      reference: String(input.reference || "").trim().slice(0, 120),
      note: String(input.note || "").trim().slice(0, 1000)
    };
  }

  function calculateBalances(input) {
    if (!input || typeof input !== "object") {
      throw new Error("Thiếu dữ liệu hồ sơ công nợ.");
    }

    const receivableAmount = toNonNegativeVnd(
      input.receivableAmount ?? 0,
      "Tổng phải thu"
    );
    const payableAmount = toNonNegativeVnd(
      input.payableAmount ?? 0,
      "Tổng phải trả"
    );
    const transactions = Array.isArray(input.transactions)
      ? input.transactions
      : [];

    let received = 0;
    let paid = 0;

    for (const tx of transactions) {
      if (!tx || tx.voidedAt) continue;
      const amount = toPositiveVnd(tx.amount, "Số tiền giao dịch");
      if (tx.direction === "receivable") {
        received += amount;
        if (!Number.isSafeInteger(received)) {
          throw new Error("Tổng tiền đã thu vượt giới hạn số nguyên an toàn.");
        }
      } else if (tx.direction === "payable") {
        paid += amount;
        if (!Number.isSafeInteger(paid)) {
          throw new Error("Tổng tiền đã chi vượt giới hạn số nguyên an toàn.");
        }
      } else {
        throw new Error("Giao dịch có chiều không hợp lệ.");
      }
    }

    return Object.freeze({
      receivableAmount,
      received,
      receivableOutstanding: Math.max(0, receivableAmount - received),
      receivableOverpaid: Math.max(0, received - receivableAmount),
      payableAmount,
      paid,
      payableOutstanding: Math.max(0, payableAmount - paid),
      payableOverpaid: Math.max(0, paid - payableAmount),
      receivableSettled: received >= receivableAmount,
      payableSettled: paid >= payableAmount
    });
  }

  function getProjectDebtDocumentId(projectId) {
    const id = String(projectId || "").trim();
    if (!id || id.length > 150 || id.includes("/")) {
      throw new Error("Mã công trình không hợp lệ.");
    }
    return id;
  }

  return Object.freeze({
    DIRECTIONS,
    toPositiveVnd,
    toNonNegativeVnd,
    validateTransaction,
    calculateBalances,
    getProjectDebtDocumentId
  });
});
