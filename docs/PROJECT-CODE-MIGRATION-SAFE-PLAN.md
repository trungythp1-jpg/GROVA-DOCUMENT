# Project Code Migration — CT-001…CT-021

## Safety status
This is a migration plan only. It does not run automatically, does not write to Firestore, and does not change the live app.

## Required procedure
1. Export/backup all 21 Firestore project documents before changing any code.
2. Fetch the full current project collection from Firestore and confirm the count is exactly 21.
3. Confirm each project has a unique immutable document ID. Do not change document IDs; other records may refer to them.
4. Build a preview mapping ordered by `createdAt` ascending (oldest project = CT-001). If `createdAt` is missing or ties cannot be resolved reliably, stop and review manually.
5. Confirm every generated code is unique and no project is missing from the mapping.
6. Apply updates only to the `code` field, using each existing document ID. Do not replace whole documents.
7. Read back all 21 records and verify exact mapping, unique codes, unchanged document IDs and unchanged non-code fields.
8. Only after migration is verified, change new-project numbering to allocate CT-022 and onward using a Firestore transaction and a counter initialized to 21. Counter writes must be permitted by the deployed rules and tested in an emulator first.

## Mapping rules
- Codes: `CT-001` through `CT-021`.
- Existing project document IDs stay unchanged.
- Sorting: `createdAt` ascending, with a stable explicit tie-breaker only if reviewed. Do not sort by the UI list order because that list may be sorted by updated time.
- New codes must never be allocated from browser localStorage; use a transaction-backed counter to avoid collisions between concurrent users.
- Do not touch login, user profiles, permissions, Firestore rules, project schema, or any PASS/LOCK module as part of the migration.

## Abort conditions
Abort without writes if the live collection count is not 21, if backup/read access fails, if IDs are duplicated/missing, if any `createdAt` value is absent or ambiguous, or if deployed Firestore rules do not support the tested transaction.

## Verification checklist
- [ ] Backup saved and readable
- [ ] Exactly 21 cloud project documents
- [ ] Preview reviewed
- [ ] Codes unique: CT-001…CT-021
- [ ] Only `code` fields updated
- [ ] Read-back verifies all records
- [ ] Emulator test confirms next allocation is CT-022
- [ ] Main branch untouched until explicit final review
