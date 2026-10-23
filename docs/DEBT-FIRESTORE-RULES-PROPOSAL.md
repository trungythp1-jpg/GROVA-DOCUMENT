# Firestore Rules proposal — debt ledger (NOT DEPLOYED)

This is a review note, not a replacement for the production `firestore.rules`.
Do not paste/deploy this as a complete rules file. It assumes the current helper functions
`signedIn()`, `isActiveUser()`, `isAdmin()`, and `hasPermission(group, action)` remain unchanged.

## Safe initial access policy
- Read debt records only for an active user with `projects.view` or an Admin.
- Create/update/delete debt headers: Admin only for the first release.
- Read payment history: Admin or active user with `projects.view`.
- Create payment history: Admin only.
- Never allow update/delete of a posted transaction; corrections must use a separately designed void/reversal flow.
- Default deny for every unmatched path remains in place.

## Proposed match blocks for review
```firestore
match /project_debts/{projectId} {
  allow read: if isAdmin()
    || (isActiveUser() && hasPermission("projects", "view"));

  allow create: if isAdmin()
    && request.resource.data.keys().hasOnly([
      "schemaVersion", "projectId", "projectCode", "projectName",
      "customerName", "contractAmount", "receivableAmount", "payableAmount",
      "receivedAmount", "paidAmount", "status", "createdAt", "createdBy",
      "updatedAt", "updatedBy"
    ])
    && request.resource.data.schemaVersion == 1
    && request.resource.data.projectId == projectId
    && request.resource.data.createdBy == request.auth.uid
    && request.resource.data.updatedBy == request.auth.uid
    && request.resource.data.contractAmount is int
    && request.resource.data.contractAmount >= 0
    && request.resource.data.receivableAmount is int
    && request.resource.data.receivableAmount >= 0
    && request.resource.data.payableAmount is int
    && request.resource.data.payableAmount >= 0
    && request.resource.data.receivedAmount == 0
    && request.resource.data.paidAmount == 0
    && request.resource.data.status == "open";

  allow update: if isAdmin()
    && request.resource.data.keys().hasOnly([
      "schemaVersion", "projectId", "projectCode", "projectName",
      "customerName", "contractAmount", "receivableAmount", "payableAmount",
      "receivedAmount", "paidAmount", "status", "createdAt", "createdBy",
      "updatedAt", "updatedBy"
    ])
    && request.resource.data.projectId == resource.data.projectId
    && request.resource.data.createdAt == resource.data.createdAt
    && request.resource.data.createdBy == resource.data.createdBy
    && request.resource.data.updatedBy == request.auth.uid
    && request.resource.data.contractAmount is int
    && request.resource.data.contractAmount >= 0
    && request.resource.data.receivableAmount is int
    && request.resource.data.receivableAmount >= 0
    && request.resource.data.payableAmount is int
    && request.resource.data.payableAmount >= 0
    && request.resource.data.receivedAmount is int
    && request.resource.data.receivedAmount >= 0
    && request.resource.data.paidAmount is int
    && request.resource.data.paidAmount >= 0
    && request.resource.data.status in ["open", "partial", "settled", "disputed"];

  allow delete: if false;

  match /transactions/{transactionId} {
    allow read: if isAdmin()
      || (isActiveUser() && hasPermission("projects", "view"));

    allow create: if isAdmin()
      && request.resource.data.keys().hasOnly([
        "transactionId", "projectId", "direction", "amount", "date",
        "method", "reference", "note", "createdAt", "createdBy",
        "voidedAt", "voidedBy", "voidReason"
      ])
      && request.resource.data.transactionId == transactionId
      && request.resource.data.projectId == projectId
      && request.resource.data.direction in ["receivable", "payable"]
      && request.resource.data.amount is int
      && request.resource.data.amount > 0
      && request.resource.data.createdBy == request.auth.uid
      && request.resource.data.voidedAt == null
      && request.resource.data.voidedBy == null
      && request.resource.data.voidReason == "";

    allow update, delete: if false;
  }
}
```

## Important limitations before production
1. The blocks above restrict who can write and validate basic fields, but do not yet prove that every change to `receivedAmount` / `paidAmount` exactly matches a corresponding payment document. This must be enforced with `getAfter()` and transaction-specific invariant checks, or moved behind a trusted server-side callable endpoint. Do not deploy these rules until that invariant is implemented and emulator-tested.
2. Existing project permission functions may rely on nested permission fields; verify all helper calls against the exact production rules.
3. Test the complete combined rules file in Firebase Emulator against admin, employee, viewer, disabled profile, duplicate IDs, attempted forged totals, and attempted transaction edits/deletes.
4. No rules deployment is authorized by this proposal.
