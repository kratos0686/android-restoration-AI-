# Restoration-AI Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Default-Deny Catch-All**: All paths not explicitly matched are strictly denied (`allow read, write: if false;`).
2. **Verified Identity**: All write operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **Path Variable Hardening**: Every single-document operation (`get`, `create`, `update`, `delete`) validates document IDs via `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars).
4. **Master Gate Relational Sync**: Subcollections `/projects/{projectId}/readings/{readingId}` and `/projects/{projectId}/equipment/{equipmentId}` verify parent `/projects/{projectId}` existence and ownership via `get()`.
5. **Anti-Update-Gap & Action-Based Updates**: Every `allow update` block begins with `isValid[Entity](incoming())`, enforces immutable `createdAt`, `ownerId`, and `id`, validates `updatedAt == request.time`, and restricts modified keys via `affectedKeys().hasOnly(...)`.
6. **Terminal State Locking**: Once a `LossProject` reaches `stage == 'Closeout'`, non-admin updates are rejected.
7. **Secure List Queries**: Every `allow list` rule evaluates `resource.data.ownerId == request.auth.uid || isAdmin()` without calling `get()` inside `list`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Payload 1 (Unauthenticated Write)**: `auth = null` attempting `create` on `/projects/proj_1`. -> `PERMISSION_DENIED`
2. **Payload 2 (Unverified Email Spoof)**: `auth = { uid: 'u1', token: { email: 'merrillalex500@gmail.com', email_verified: false } }` attempting write. -> `PERMISSION_DENIED`
3. **Payload 3 (ID Poisoning Attack)**: Document ID containing spaces/slashes or >128 chars. -> `PERMISSION_DENIED`
4. **Payload 4 (Identity Spoofing on Create)**: Creating `/projects/proj_1` with `ownerId: 'victim_uid'` when `auth.uid == 'attacker_uid'`. -> `PERMISSION_DENIED`
5. **Payload 5 (Shadow Field Injection)**: Creating `/projects/proj_1` with an undeclared field `isVerifiedAdmin: true`. -> `PERMISSION_DENIED`
6. **Payload 6 (Self-Assigned Admin Role)**: Creating `/users/u1` with `role: 'SuperAdmin'` as a non-admin user. -> `PERMISSION_DENIED`
7. **Payload 7 (Value Poisoning on Update)**: Updating `clientName` on `/projects/proj_1` with a 10,000-character string or integer. -> `PERMISSION_DENIED`
8. **Payload 8 (Immortal Field Mutation)**: Attempting to mutate `ownerId` or `createdAt` during an `update` on `/projects/proj_1`. -> `PERMISSION_DENIED`
9. **Payload 9 (Forged Client Timestamp)**: Creating or updating a document where `createdAt` or `updatedAt` does not equal `request.time`. -> `PERMISSION_DENIED`
10. **Payload 10 (Terminal State Bypass)**: Updating `/projects/proj_1` when `existing().stage == 'Closeout'` as a non-admin. -> `PERMISSION_DENIED`
11. **Payload 11 (Orphaned Subcollection Write)**: Creating `/projects/nonexistent_proj/readings/r1` where parent project does not exist or belongs to another user. -> `PERMISSION_DENIED`
12. **Payload 12 (Blanket List Scraping)**: Listing `/projects` without filtering `resource.data.ownerId == request.auth.uid`. -> `PERMISSION_DENIED`
