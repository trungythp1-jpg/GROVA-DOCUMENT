/**
 * GROVA DOCUMENT — PHASE 5B.1
 * Backend Foundation
 *
 * Purpose:
 * - Initialize Firebase Admin SDK in a privileged server environment.
 * - Provide a minimal authenticated backend health/status callable.
 *
 * This phase does NOT create, edit, lock, unlock, or delete user accounts.
 * Those operations belong to later Phase 5B stages.
 */

const { initializeApp } = require("firebase-admin/app");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

initializeApp();

const BOOTSTRAP_ADMIN_UID = "nJmKgjEILgVOEjWKYWTsuonxbO03";

exports.grovaBackendStatus = onCall((request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Bạn phải đăng nhập để sử dụng GROVA backend."
    );
  }

  return {
    ok: true,
    service: "GROVA DOCUMENT",
    phase: "5B.1",
    backend: "cloud-functions-2nd-gen",
    callerUid: request.auth.uid,
    isBootstrapAdmin: request.auth.uid === BOOTSTRAP_ADMIN_UID
  };
});
