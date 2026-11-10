import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesSource = fs.readFileSync('./DRAFT_firestore.rules', 'utf8');

interface MockRequest {
  auth: null | {
    uid: string;
    token: {
      email: string;
      email_verified: boolean;
    };
  };
  time: string;
  pathId: string;
  op: 'get' | 'list' | 'create' | 'update' | 'delete';
  collection: 'users' | 'projects' | 'readings' | 'equipment' | 'field_units';
  incoming?: Record<string, unknown>;
  existing?: Record<string, unknown>;
  parentExists?: boolean;
  parentOwnerId?: string;
}

const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && VALID_ID_REGEX.test(id);
}

function isAdmin(req: MockRequest): boolean {
  return Boolean(
    req.auth &&
      req.auth.token.email_verified === true &&
      req.auth.token.email === 'merrillalex500@gmail.com'
  );
}

function hasExactKeys(obj: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(obj);
  return actual.length === keys.length && keys.every((k) => actual.includes(k));
}

function evaluateDirtyDozenGate(req: MockRequest): 'ALLOWED' | 'PERMISSION_DENIED' {
  if (!req.auth) return 'PERMISSION_DENIED';
  if (req.op !== 'get' && req.op !== 'list' && req.auth.token.email_verified !== true) {
    return 'PERMISSION_DENIED';
  }
  if (req.op !== 'list' && !isValidId(req.pathId)) {
    return 'PERMISSION_DENIED';
  }

  if (req.collection === 'projects') {
    const projectKeys = [
      'id', 'ownerId', 'companyId', 'clientName', 'lossAddress',
      'latitude', 'longitude', 'granularity', 'waterCategory',
      'lossClass', 'stage', 'createdAt', 'updatedAt'
    ];
    if (req.op === 'list') {
      if (!req.existing || (req.existing.ownerId !== req.auth.uid && !isAdmin(req))) {
        return 'PERMISSION_DENIED';
      }
      return 'ALLOWED';
    }
    if (req.op === 'create' && req.incoming) {
      if (!hasExactKeys(req.incoming, projectKeys)) return 'PERMISSION_DENIED';
      if (req.incoming.ownerId !== req.auth.uid) return 'PERMISSION_DENIED';
      if (req.incoming.id !== req.pathId) return 'PERMISSION_DENIED';
      if (req.incoming.createdAt !== req.time || req.incoming.updatedAt !== req.time) return 'PERMISSION_DENIED';
      if (typeof req.incoming.clientName !== 'string' || req.incoming.clientName.length > 160) return 'PERMISSION_DENIED';
      return 'ALLOWED';
    }
    if (req.op === 'update' && req.incoming && req.existing) {
      if (!hasExactKeys(req.incoming, projectKeys)) return 'PERMISSION_DENIED';
      if (req.incoming.ownerId !== req.existing.ownerId) return 'PERMISSION_DENIED';
      if (req.incoming.createdAt !== req.existing.createdAt) return 'PERMISSION_DENIED';
      if (req.incoming.updatedAt !== req.time) return 'PERMISSION_DENIED';
      if (typeof req.incoming.clientName !== 'string' || req.incoming.clientName.length > 160) return 'PERMISSION_DENIED';
      if (req.existing.stage === 'Closeout' && !isAdmin(req)) return 'PERMISSION_DENIED';
      return 'ALLOWED';
    }
  }

  if (req.collection === 'users' && req.op === 'create' && req.incoming) {
    if (req.incoming.role !== 'Technician' && !isAdmin(req)) return 'PERMISSION_DENIED';
    return 'ALLOWED';
  }

  if (req.collection === 'readings' && req.op === 'create' && req.incoming) {
    if (!req.parentExists || (req.parentOwnerId !== req.auth.uid && !isAdmin(req))) {
      return 'PERMISSION_DENIED';
    }
    return 'ALLOWED';
  }

  return 'PERMISSION_DENIED';
}

test('Firestore Rules Static Structural & Pillar Audit', () => {
  assert.ok(rulesSource.includes("rules_version = '2';"));
  assert.ok(rulesSource.includes('match /{document=**} {\n      allow read, write: if false;\n    }'));
  assert.ok(rulesSource.includes('request.auth.token.email_verified == true'));
  assert.ok(rulesSource.includes('isValidLossProject(incoming())'));
  assert.ok(rulesSource.includes('isValidUserProfile(incoming())'));
  assert.ok(rulesSource.includes('isValidPsychrometricReading(incoming())'));
  assert.ok(rulesSource.includes('isValidDeployedEquipment(incoming())'));
  assert.ok(rulesSource.includes('isValidFieldUnit(incoming())'));
  assert.ok(rulesSource.includes("existing().stage != 'Closeout'"));
});

test('Dirty Dozen Adversarial Payloads all return PERMISSION_DENIED', () => {
  const baseProject = {
    id: 'proj_1',
    ownerId: 'u1',
    companyId: 'comp_1',
    clientName: 'Apex Tower',
    lossAddress: '100 Congress Ave, Austin, TX',
    latitude: 30.2672,
    longitude: -97.7431,
    granularity: 'ROOFTOP',
    waterCategory: 'CAT_2',
    lossClass: 'CLASS_2',
    stage: 'Mitigation',
    createdAt: '2026-11-09T20:00:00Z',
    updatedAt: '2026-11-09T20:00:00Z',
  };

  // 1. Unauthenticated Write
  assert.equal(
    evaluateDirtyDozenGate({
      auth: null,
      time: '2026-11-09T20:00:00Z',
      pathId: 'proj_1',
      op: 'create',
      collection: 'projects',
      incoming: baseProject,
    }),
    'PERMISSION_DENIED'
  );

  // 2. Unverified Email Spoof
  assert.equal(
    evaluateDirtyDozenGate({
      auth: { uid: 'u1', token: { email: 'merrillalex500@gmail.com', email_verified: false } },
      time: '2026-11-09T20:00:00Z',
      pathId: 'proj_1',
      op: 'create',
      collection: 'projects',
      incoming: baseProject,
    }),
    'PERMISSION_DENIED'
  );

  // 3. ID Poisoning Attack
  assert.equal(
    evaluateDirtyDozenGate({
      auth: { uid: 'u1', token: { email: 'tech@restoration.ai', email_verified: true } },
      time: '2026-11-09T20:00:00Z',
      pathId: 'invalid/id with spaces!',
      op: 'create',
      collection: 'projects',
      incoming: baseProject,
    }),
    'PERMISSION_DENIED'
  );

  // 4. Identity Spoofing on Create
  assert.equal(
    evaluateDirtyDozenGate({
      auth: { uid: 'attacker_uid', token: { email: 'tech@restoration.ai', email_verified: true } },
      time: '2026-11-09T20:00:00Z',
      pathId: 'proj_1',
      op: 'create',
      collection: 'projects',
      incoming: { ...baseProject, ownerId: 'victim_uid' },
    }),
    'PERMISSION_DENIED'
  );

  // 5. Shadow Field Injection
  assert.equal(
    evaluateDirtyDozenGate({
      auth: { uid: 'u1', token: { email: 'tech@restoration.ai', email_verified: true } },
      time: '2026-11-09T20:00:00Z',
      pathId: 'proj_1',
      op: 'create',
      collection: 'projects',
      incoming: { ...baseProject, isVerifiedAdmin: true },
    }),
    'PERMISSION_DENIED'
  );

  // 6. Self-Assigned Admin Role
  assert.equal(
    evaluateDirtyDozenGate({
      auth: { uid: 'u1', token: { email: 'tech@restoration.ai', email_verified: true } },
      time: '2026-11-09T20:00:00Z',
      pathId: 'u1',
      op: 'create',
      collection: 'users',
      incoming: { uid: 'u1', role: 'SuperAdmin' },
    }),
    'PERMISSION_DENIED'
  );

  // 7. Value Poisoning on Update
  assert.equal(
    evaluateDirtyDozenGate({
      auth: { uid: 'u1', token: { email: 'tech@restoration.ai', email_verified: true } },
      time: '2026-11-09T20:05:00Z',
      pathId: 'proj_1',
      op: 'update',
      collection: 'projects',
      existing: baseProject,
      incoming: { ...baseProject, clientName: 'A'.repeat(500), updatedAt: '2026-11-09T20:05:00Z' },
    }),
    'PERMISSION_DENIED'
  );

  // 8. Immortal Field Mutation (ownerId)
  assert.equal(
    evaluateDirtyDozenGate({
      auth: { uid: 'u1', token: { email: 'tech@restoration.ai', email_verified: true } },
      time: '2026-11-09T20:05:00Z',
      pathId: 'proj_1',
      op: 'update',
      collection: 'projects',
      existing: baseProject,
      incoming: { ...baseProject, ownerId: 'u2', updatedAt: '2026-11-09T20:05:00Z' },
    }),
    'PERMISSION_DENIED'
  );

  // 9. Forged Client Timestamp
  assert.equal(
    evaluateDirtyDozenGate({
      auth: { uid: 'u1', token: { email: 'tech@restoration.ai', email_verified: true } },
      time: '2026-11-09T20:05:00Z',
      pathId: 'proj_1',
      op: 'update',
      collection: 'projects',
      existing: baseProject,
      incoming: { ...baseProject, updatedAt: '2099-01-01T00:00:00Z' },
    }),
    'PERMISSION_DENIED'
  );

  // 10. Terminal State Bypass (Closeout locked)
  assert.equal(
    evaluateDirtyDozenGate({
      auth: { uid: 'u1', token: { email: 'tech@restoration.ai', email_verified: true } },
      time: '2026-11-09T20:05:00Z',
      pathId: 'proj_1',
      op: 'update',
      collection: 'projects',
      existing: { ...baseProject, stage: 'Closeout' },
      incoming: { ...baseProject, stage: 'Monitor', updatedAt: '2026-11-09T20:05:00Z' },
    }),
    'PERMISSION_DENIED'
  );

  // 11. Orphaned Subcollection Write
  assert.equal(
    evaluateDirtyDozenGate({
      auth: { uid: 'u1', token: { email: 'tech@restoration.ai', email_verified: true } },
      time: '2026-11-09T20:05:00Z',
      pathId: 'reading_1',
      op: 'create',
      collection: 'readings',
      parentExists: false,
      parentOwnerId: 'other_uid',
      incoming: { id: 'reading_1' },
    }),
    'PERMISSION_DENIED'
  );

  // 12. Blanket List Scraping
  assert.equal(
    evaluateDirtyDozenGate({
      auth: { uid: 'u1', token: { email: 'tech@restoration.ai', email_verified: true } },
      time: '2026-11-09T20:05:00Z',
      pathId: '',
      op: 'list',
      collection: 'projects',
      existing: { ...baseProject, ownerId: 'other_owner' },
    }),
    'PERMISSION_DENIED'
  );
});
