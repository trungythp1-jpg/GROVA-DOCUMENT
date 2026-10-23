/* =========================================================
   GROVA DOCUMENT — ISOLATED DEBT LEDGER SERVICE
   Firestore compat SDK (v8 style).
   NOT imported by the live application yet.
   Requires dedicated Firestore Rules before use.
========================================================= */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (root) root.GROVA_DEBT_SERVICE = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const MAX_AMOUNT = Number.MAX_SAFE_INTEGER;
  const DIRECTIONS = ["receivable", "payable"];

  function cleanText(value, maxLength) {
    return String(value == null ? "" : value).trim().slice(0, maxLength);
  }

  function amountVnd(value, allowZero) {
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isSafeInteger(n) || n < (allowZero ? 0 : 1) || n > MAX_AMOUNT) {
      throw new Error(allowZero
        ? "Số tiền phải là số nguyên VND không âm."
        : "Số tiền phải là số nguyên VND lớn hơn 0.");
    }
    return n;
  }

  function validDate(value) {
    const date = cleanText(value, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new Error("Ngày phải theo định dạng YYYY-MM-DD.");
    }
    const parsed = new Date(date + "T00:00:00.000Z");
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      throw new Error("Ngày không hợp lệ.");
    }
    return date;
  }

  function safeDocId(value, label) {
    const id = cleanText(value, 150);
    if (!id || id.includes("/") || id === "." || id === "..") {
      throw new Error((label || "Mã") + " không hợp lệ.");
    }
    return id;
  }

  function requireActor() {
    let user = null;
    try {
      if (root.GROVA_AUTH && typeof root.GROVA_AUTH.getCurrentUser === "function") {
        user = root.GROVA_AUTH.getCurrentUser();
      }
    } catch (_) {}
    if (!user && root.firebase && root.firebase.auth) {
      user = root.firebase.auth().currentUser;
    }
    if (!user || !user.uid) throw new Error("Bạn cần đăng nhập trước khi thao tác công nợ.");
    return user;
  }

  function requireDb(db) {
    if (!db || typeof db.collection !== "function" || typeof db.runTransaction !== "function") {
      throw new Error("Firestore chưa sẵn sàng.");
    }
    return db;
  }

  function buildDebtRef(db, projectId) {
    return db.collection("project_debts").doc(safeDocId(projectId, "Mã công trình"));
  }

  async function createDebt(dbInput, input) {
    const db = requireDb(dbInput);
    const actor = requireActor();
    if (!input || typeof input !== "object") throw new Error("Dữ liệu công nợ không hợp lệ.");
    const projectId = safeDocId(input.projectId, "Mã công trình");
    const ref = buildDebtRef(db, projectId);
    const now = new Date().toISOString();
    const contractAmount = amountVnd(input.contractAmount == null ? 0 : input.contractAmount, true);
    const receivableAmount = amountVnd(input.receivableAmount == null ? contractAmount : input.receivableAmount, true);
    const payableAmount = amountVnd(input.payableAmount == null ? 0 : input.payableAmount, true);

    const payload = {
      schemaVersion: 1,
      projectId,
      projectCode: cleanText(input.projectCode, 80),
      projectName: cleanText(input.projectName, 200),
      customerName: cleanText(input.customerName, 200),
      contractAmount,
      receivableAmount,
      payableAmount,
      receivedAmount: 0,
      paidAmount: 0,
      status: "open",
      createdAt: now,
      createdBy: actor.uid,
      updatedAt: now,
      updatedBy: actor.uid
    };

    return db.runTransaction(async function (tx) {
      const existing = await tx.get(ref);
      if (existing.exists) {
        return { created: false, alreadyExists: true, projectId };
      }
      tx.set(ref, payload);
      return { created: true, alreadyExists: false, projectId };
    });
  }

  async function recordTransaction(dbInput, projectIdInput, transactionIdInput, input) {
    const db = requireDb(dbInput);
    const actor = requireActor();
    const projectId = safeDocId(projectIdInput, "Mã công trình");
    const transactionId = safeDocId(transactionIdInput, "Mã giao dịch");
    if (!input || typeof input !== "object") throw new Error("Dữ liệu giao dịch không hợp lệ.");

    const direction = cleanText(input.direction, 20);
    if (!DIRECTIONS.includes(direction)) throw new Error("Chiều giao dịch không hợp lệ.");
    const amount = amountVnd(input.amount, false);
    const date = validDate(input.date);
    const debtRef = buildDebtRef(db, projectId);
    const transactionRef = debtRef.collection("transactions").doc(transactionId);
    const now = new Date().toISOString();

    const transactionPayload = {
      transactionId,
      projectId,
      direction,
      amount,
      date,
      method: cleanText(input.method, 80),
      reference: cleanText(input.reference, 120),
      note: cleanText(input.note, 1000),
      createdAt: now,
      createdBy: actor.uid,
      voidedAt: null,
      voidedBy: null,
      voidReason: ""
    };

    return db.runTransaction(async function (tx) {
      const debtSnap = await tx.get(debtRef);
      if (!debtSnap.exists) throw new Error("Chưa có hồ sơ công nợ cho công trình này.");
      const oldTransaction = await tx.get(transactionRef);
      if (oldTransaction.exists) {
        return { created: false, duplicate: true, transactionId };
      }

      const debt = debtSnap.data() || {};
      const oldReceived = amountVnd(debt.receivedAmount || 0, true);
      const oldPaid = amountVnd(debt.paidAmount || 0, true);
      const nextReceived = direction === "receivable" ? oldReceived + amount : oldReceived;
      const nextPaid = direction === "payable" ? oldPaid + amount : oldPaid;
      if (!Number.isSafeInteger(nextReceived) || !Number.isSafeInteger(nextPaid)) {
        throw new Error("Tổng tiền vượt giới hạn số nguyên an toàn.");
      }

      const receivableTarget = amountVnd(debt.receivableAmount || 0, true);
      const payableTarget = amountVnd(debt.payableAmount || 0, true);
      const status = nextReceived >= receivableTarget && nextPaid >= payableTarget
        ? "settled"
        : (nextReceived > 0 || nextPaid > 0 ? "partial" : "open");

      tx.create(transactionRef, transactionPayload);
      tx.update(debtRef, {
        receivedAmount: nextReceived,
        paidAmount: nextPaid,
        status,
        updatedAt: now,
        updatedBy: actor.uid
      });

      return {
        created: true,
        duplicate: false,
        transactionId,
        receivedAmount: nextReceived,
        paidAmount: nextPaid,
        receivableOutstanding: Math.max(0, receivableTarget - nextReceived),
        payableOutstanding: Math.max(0, payableTarget - nextPaid),
        receivableOverpaid: Math.max(0, nextReceived - receivableTarget),
        payableOverpaid: Math.max(0, nextPaid - payableTarget),
        status
      };
    });
  }

  async function getDebt(dbInput, projectIdInput) {
    const db = requireDb(dbInput);
    requireActor();
    const projectId = safeDocId(projectIdInput, "Mã công trình");
    const ref = buildDebtRef(db, projectId);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const debt = snap.data() || {};
    const receivableAmount = amountVnd(debt.receivableAmount || 0, true);
    const payableAmount = amountVnd(debt.payableAmount || 0, true);
    const receivedAmount = amountVnd(debt.receivedAmount || 0, true);
    const paidAmount = amountVnd(debt.paidAmount || 0, true);
    return Object.assign({ id: snap.id }, debt, {
      receivableOutstanding: Math.max(0, receivableAmount - receivedAmount),
      payableOutstanding: Math.max(0, payableAmount - paidAmount),
      receivableOverpaid: Math.max(0, receivedAmount - receivableAmount),
      payableOverpaid: Math.max(0, paidAmount - payableAmount)
    });
  }

  async function listTransactions(dbInput, projectIdInput) {
    const db = requireDb(dbInput);
    requireActor();
    const projectId = safeDocId(projectIdInput, "Mã công trình");
    const snap = await buildDebtRef(db, projectId)
      .collection("transactions")
      .orderBy("date", "desc")
      .get();
    const items = [];
    snap.forEach(function (doc) {
      items.push(Object.assign({ id: doc.id }, doc.data() || {}));
    });
    return items;
  }

  return Object.freeze({
    createDebt,
    recordTransaction,
    getDebt,
    listTransactions,
    _validation: Object.freeze({ amountVnd, validDate, safeDocId })
  });
});
