/* =========================================================
   GROVA DOCUMENT
   FIRESTORE DATA SERVICE
   PHASE 1 — PROJECTS
========================================================= */

(function () {
  "use strict";

  if (typeof firebase === "undefined") {
    console.error(
      "GROVA FIRESTORE: Firebase SDK chưa được tải."
    );
    return;
  }

  if (!firebase.apps.length) {
    console.error(
      "GROVA FIRESTORE: Firebase App chưa được khởi tạo."
    );
    return;
  }

  const db = firebase.firestore();

  let persistenceEnabled = false;

  /* =======================================================
     OFFLINE CACHE
  ======================================================= */

  try {
    db.enablePersistence({
      synchronizeTabs: true
    })
      .then(function () {
        persistenceEnabled = true;

        console.log(
          "GROVA FIRESTORE: Offline persistence enabled."
        );
      })
      .catch(function (error) {
        console.warn(
          "GROVA FIRESTORE: Không thể bật offline persistence.",
          error
        );
      });
  } catch (error) {
    console.warn(
      "GROVA FIRESTORE: Persistence initialization failed.",
      error
    );
  }

  /* =======================================================
     HELPERS
  ======================================================= */

  function getCurrentUser() {
    if (
      window.GROVA_AUTH &&
      typeof window.GROVA_AUTH.getCurrentUser === "function"
    ) {
      return window.GROVA_AUTH.getCurrentUser();
    }

    return firebase.auth().currentUser;
  }

  function requireUser() {
    const user = getCurrentUser();

    if (!user) {
      throw new Error(
        "Bạn chưa đăng nhập GROVA DOCUMENT."
      );
    }

    return user;
  }

  function normalizeProject(id, data) {
    return {
      id: id,

      name: data.name || "",
      code: data.code || "",
      customer: data.customer || "",
      address: data.address || "",
      status: data.status || "Chuẩn bị",
      startDate: data.startDate || "",
      note: data.note || "",

      createdAt:
        data.createdAt ||
        new Date().toISOString(),

      updatedAt:
        data.updatedAt ||
        new Date().toISOString(),

      createdBy:
        data.createdBy || "",

      updatedBy:
        data.updatedBy || ""
    };
  }

  /* =======================================================
     PROJECTS — READ
  ======================================================= */

  async function getProjects() {
    const user = requireUser();

    const snapshot = await db
      .collection("projects")
      .get();

    const projects = [];

    snapshot.forEach(function (doc) {
      projects.push(
        normalizeProject(
          doc.id,
          doc.data() || {}
        )
      );
    });

    projects.sort(function (a, b) {
      return (
        new Date(b.updatedAt || 0).getTime() -
        new Date(a.updatedAt || 0).getTime()
      );
    });

    return projects;
  }

  /* =======================================================
     PROJECTS — CREATE / UPDATE
  ======================================================= */

  async function saveProject(project) {
    const user = requireUser();

    if (!project || !project.id) {
      throw new Error(
        "Project không hợp lệ."
      );
    }

    const now =
      new Date().toISOString();

    const existing =
      await db
        .collection("projects")
        .doc(project.id)
        .get();

    const payload = {
      name: project.name || "",
      code: project.code || "",
      customer: project.customer || "",
      address: project.address || "",
      status:
        project.status ||
        "Chuẩn bị",
      startDate:
        project.startDate || "",
      note:
        project.note || "",

      updatedAt: now,
      updatedBy: user.uid
    };

    if (!existing.exists) {
      payload.createdAt =
        project.createdAt ||
        now;

      payload.createdBy =
        project.createdBy ||
        user.uid;
    }

    await db
      .collection("projects")
      .doc(project.id)
      .set(
        payload,
        {
          merge: true
        }
      );

    return normalizeProject(
      project.id,
      {
        ...project,
        ...payload
      }
    );
  }

  /* =======================================================
     PROJECTS — DELETE
  ======================================================= */

  async function deleteProject(id) {
    requireUser();

    if (!id) {
      throw new Error(
        "Project ID không hợp lệ."
      );
    }

    await db
      .collection("projects")
      .doc(id)
      .delete();

    return true;
  }

  /* =======================================================
     PROJECTS — MIGRATION
  ======================================================= */

  async function migrateProjects(localProjects) {
    requireUser();

    if (
      !Array.isArray(localProjects) ||
      !localProjects.length
    ) {
      return {
        migrated: 0,
        skipped: true
      };
    }

    const snapshot = await db
      .collection("projects")
      .get();

    /*
     * Nếu Firestore đã có dữ liệu,
     * KHÔNG ghi đè bằng localStorage.
     */
    if (!snapshot.empty) {
      return {
        migrated: 0,
        skipped: true,
        reason: "cloud_has_data"
      };
    }

    const batch =
      db.batch();

    const now =
      new Date().toISOString();

    const user =
      requireUser();

    localProjects.forEach(function (project) {
      if (!project || !project.id) {
        return;
      }

      const ref =
        db
          .collection("projects")
          .doc(project.id);

      batch.set(
        ref,
        {
          name:
            project.name || "",
          code:
            project.code || "",
          customer:
            project.customer || "",
          address:
            project.address || "",
          status:
            project.status ||
            "Chuẩn bị",
          startDate:
            project.startDate || "",
          note:
            project.note || "",

          createdAt:
            project.createdAt ||
            now,

          updatedAt:
            project.updatedAt ||
            now,

          createdBy:
            project.createdBy ||
            user.uid,

          updatedBy:
            project.updatedBy ||
            user.uid
        },
        {
          merge: true
        }
      );
    });

    await batch.commit();

    return {
      migrated:
        localProjects.length,
      skipped: false
    };
  }

  /* =======================================================
     PUBLIC API
  ======================================================= */

  window.GROVA_FIRESTORE = {

    db: db,

    isPersistenceEnabled:
      function () {
        return persistenceEnabled;
      },

    getProjects:
      getProjects,

    saveProject:
      saveProject,

    deleteProject:
      deleteProject,

    migrateProjects:
      migrateProjects

  };

})();