# Security Specification (Firestore Rules TDD)

## 1. Data Invariants
- `appointments` contains patient PII (`patientName`, `patientContact`, `notes`) and MUST NEVER be readable (`get` or `list`) by unauthenticated visitors or unauthorized users.
- Public `create` on `appointments` MUST force `status == "pending"`, `modality == "online"`, `createdAt == request.time`, and reject shadow fields via `keys().hasOnly(...)`.
- `occupiedSlots` stores ONLY `{ date, timeSlot, createdAt }` (zero PII) so the public booking calendar can hide reserved slots without reading `appointments`.
- `availability` and `groups` allow public reads and restrict all writes to verified authorized psychologists (`isPsychologist()`).

## 2. Adversarial Payloads ("Dirty Dozen")
1. Public `get` / `list` on `/appointments`: MUST return `PERMISSION_DENIED`.
2. Unauthenticated `create` on `/appointments` with `status: "confirmed"`: MUST return `PERMISSION_DENIED`.
3. Unauthenticated `create` on `/appointments` with `modality: "presencial"`: MUST return `PERMISSION_DENIED`.
4. Unauthenticated `create` on `/appointments` with shadow field `isAdmin: true`: MUST return `PERMISSION_DENIED`.
5. Unauthenticated `create` on `/appointments` with forged past `createdAt`: MUST return `PERMISSION_DENIED`.
6. Unauthenticated `create` on `/appointments` with oversized `notes` (> 1000 chars): MUST return `PERMISSION_DENIED`.
7. Unauthenticated `update` or `delete` on `/appointments`: MUST return `PERMISSION_DENIED`.
8. Unverified email matching psychologist email (`email_verified: false`): MUST return `PERMISSION_DENIED`.
9. Authenticated non-psychologist email (`random@gmail.com`): MUST return `PERMISSION_DENIED`.
10. Unauthenticated `create` on `/occupiedSlots` with extra PII field `patientName`: MUST return `PERMISSION_DENIED`.
11. Unauthenticated `write` on `/availability/default` or `/groups/{id}`: MUST return `PERMISSION_DENIED`.
12. Path ID poisoning (`docId` > 128 chars or invalid characters): MUST return `PERMISSION_DENIED`.
