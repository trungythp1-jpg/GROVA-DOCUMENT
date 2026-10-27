
"use strict";
const assert = require("node:assert/strict");
const debt = require("./debt-domain.js");

assert.equal(debt.toPositiveVnd(100), 100);
assert.throws(() => debt.toPositiveVnd(0), /lớn hơn 0/);
assert.throws(() => debt.toPositiveVnd(-1), /lớn hơn 0/);
assert.throws(() => debt.toPositiveVnd(1.5), /số nguyên/);
assert.throws(() => debt.validateTransaction({ direction: "other", amount: 1, date: "2026-01-01" }), /chiều giao dịch/);
assert.throws(() => debt.validateTransaction({ direction: "receivable", amount: 100, date: "01-01-2026" }), /YYYY-MM-DD/);

const tx = debt.validateTransaction({
  direction: "receivable",
  amount: 300,
  date: "2026-10-24",
  method: "Chuyển khoản",
  reference: "UNC-01",
  note: "Thanh toán đợt 1"
});
assert.equal(tx.amount, 300);
assert.equal(tx.direction, "receivable");

const balances = debt.calculateBalances({
  receivableAmount: 1000,
  payableAmount: 700,
  transactions: [
    { direction: "receivable", amount: 300 },
    { direction: "receivable", amount: 200 },
    { direction: "payable", amount: 100 },
    { direction: "payable", amount: 50, voidedAt: "2026-10-24T00:00:00.000Z" }
  ]
});
assert.equal(balances.received, 500);
assert.equal(balances.receivableOutstanding, 500);
assert.equal(balances.paid, 100);
assert.equal(balances.payableOutstanding, 600);
assert.equal(balances.payableOverpaid, 0);

const overpaid = debt.calculateBalances({
  receivableAmount: 100,
  payableAmount: 0,
  transactions: [{ direction: "receivable", amount: 150 }]
});
assert.equal(overpaid.receivableOutstanding, 0);
assert.equal(overpaid.receivableOverpaid, 50);

assert.equal(debt.getProjectDebtDocumentId("project-123"), "project-123");
assert.throws(() => debt.getProjectDebtDocumentId("../bad"), /không hợp lệ/);
console.log("PASS: debt domain core tests");
