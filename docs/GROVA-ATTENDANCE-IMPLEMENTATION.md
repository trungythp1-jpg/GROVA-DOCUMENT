# GROVA ATTENDANCE — Implementation proposal

Status: design and review only. This branch does not modify the live application, Firebase configuration, deployed Firestore Rules, or Firebase data.

## Scope

- Staff and technical teams use phones to clock in and clock out.
- One administrative shift per day in the first release.
- Basic client GPS and a configurable radius per work site.
- Attendance timestamps use Firebase server time and the Asia/Ho_Chi_Minh business date.
- Staff can view their own records and submit adjustment requests.
- Admins and explicitly authorized managers can review attendance and adjustment requests.
- No Cloud Functions, no Firebase Blaze upgrade, and no changes to existing passing modules.
- Source code must not contain comments.

## Proposed collections

These are proposals only. Do not create collections or write documents before a separate approval.

### attendance_sites

Document ID: generated ID.

Fields:
- name: string
- latitude: number
- longitude: number
- radiusMeters: number
- active: boolean
- createdAt: timestamp
- createdBy: string UID
- updatedAt: timestamp
- updatedBy: string UID

Only Admin may create, update, deactivate, or delete site configuration. Employees may read active sites needed for check-in.

### attendance_records

Document ID: deterministic `{uid}_{YYYY-MM-DD}`, using the Vietnam business date, so a second record for the same user and date cannot be created under another ID by the standard client.

Fields:
- uid: string Firebase Auth UID
- employeeId: string, optional link to the existing employees record if a verified mapping exists
- employeeName: string display snapshot
- dateKey: string in YYYY-MM-DD format
- siteId: string
- clockInAt: timestamp or null
- clockInLatitude: number or null
- clockInLongitude: number or null
- clockInAccuracyMeters: number or null
- clockOutAt: timestamp or null
- clockOutLatitude: number or null
- clockOutLongitude: number or null
- clockOutAccuracyMeters: number or null
- status: one of pending, present, incomplete, adjustment_pending, adjusted
- createdAt: timestamp
- updatedAt: timestamp
- updatedBy: string UID

Client event times must use server timestamp writes. The date key must be calculated in Asia/Ho_Chi_Minh and validated against the approved client flow. A client-only system cannot provide a strong guarantee against a modified client or a forged location; GPS radius is a basic deterrent, not proof of physical presence.

### attendance_adjustment_requests

Document ID: generated ID.

Fields:
- uid: string Firebase Auth UID of the requester
- recordId: string
- dateKey: string YYYY-MM-DD
- requestedClockInAt: timestamp or null
- requestedClockOutAt: timestamp or null
- reason: string with non-empty trimmed content
- status: one of pending, approved, rejected
- createdAt: timestamp
- createdBy: string UID
- reviewedAt: timestamp or null
- reviewedBy: string UID or null
- reviewNote: string or null

The requester can create a request for their own record and read their own requests. The requester cannot approve, reject, or rewrite an existing request. Admin or authorized manager can review requests. An approved adjustment must update the record through a separately validated operation and preserve audit fields.

## Access matrix

| Action | Employee | Authorized manager | Admin |
|---|---|---|---|
| Read own attendance | Yes | Yes | Yes |
| Read team/all attendance | No | Only authorized scope | Yes |
| Clock in/out own record | Yes | Yes | Yes |
| Change a recorded time directly | No | No | Only through controlled review flow |
| Create adjustment request | Own only | Own only | Own or administrative process |
| Review adjustment request | No | Authorized scope | Yes |
| Manage sites | No | No by default | Yes |

Manager scope must be confirmed against the current employee/project assignment model before implementing team-level access. Until confirmed, do not grant managers broad collection access.

## Proposed Firestore Rules approach

Do not replace the current `firestore.rules` file in this phase. The current rules use `users/{uid}`, active profile status, Admin detection, and a permission matrix. The new attendance rules should reuse those helpers and introduce the `attendance` permission group only after a separate permission-matrix diff is reviewed.

Proposed policy requirements:
- Deny all attendance access to unauthenticated and inactive users.
- Site reads: active site documents for active users; site writes: Admin only.
- Attendance create: only the authenticated user's deterministic daily record ID; UID must equal auth UID; allowed keys only; initial clock-in fields must be valid; clock-out must be null; status must be valid.
- Attendance update by employee: only own record; only a valid clock-in-to-clock-out transition; immutable UID, dateKey, siteId, createdAt, and clock-in values; cannot overwrite an existing clock-out; updatedBy must equal auth UID.
- Attendance read: own records for employees; broader reads only through Admin or a separately approved manager permission.
- Adjustment create: own UID, pending status, valid record/date reference, non-empty reason, no review fields.
- Adjustment update: reviewer permission only; only pending-to-approved/rejected transition; reviewer UID and review timestamp required; requester cannot review their own request.
- Delete: denied for attendance records and adjustment requests; corrections use the review flow.
- Keep the existing default-deny rule.
- Do not rely on client GPS calculations as a Firestore security boundary. Rules can validate field shape and authorization, but cannot independently establish that GPS coordinates are genuine or within a radius using trusted server-side location data.

Before applying any Rules changes, test with the Firebase Emulator or a controlled test project. Existing account creation currently restricts allowed permission keys; adding `attendance` requires a deliberate, reviewed update to that permission validation and the safe employee defaults. Do not silently broaden permissions or alter the current rules.

## Required test cases before release

1. Active employee can clock in once for the Vietnam date.
2. Duplicate clock-in is rejected.
3. Employee cannot create or read another user's record.
4. Clock-out cannot happen before clock-in or be repeated.
5. A second record ID for the same user/date is rejected by ID convention and rule validation.
6. Inactive account and unauthenticated user are denied.
7. Employee cannot alter clock-in time, UID, date key, status, reviewer fields, or audit fields.
8. Adjustment request requires a reason and starts pending.
9. Requester cannot approve their own request or modify review results.
10. Reviewer without the required permission is denied.
11. Site writes are Admin-only; inactive sites cannot be used to clock in.
12. GPS denied, inaccurate GPS, out-of-radius, offline, and permission-denied states produce a clear failure and no false success.
13. Asia/Ho_Chi_Minh date boundary is tested around midnight.
14. Existing GROVA DOCUMENT modules and current permission flows continue to pass.

## Change boundary

This proposal adds documentation only. It does not change `app.js`, `index.html`, `firestore.rules`, `firebase.json`, `.firebaserc`, existing collections, Firebase data, or the `main` branch. The next phase requires review of this proposal and an explicit approval before implementing UI or changing Rules.
