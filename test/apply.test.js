const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { createPlanFromDraft, approvePlan, previewPlan } = require('../dist');

const CLI_PATH = path.join(__dirname, '..', 'dist', 'cli.js');

function makePlanDraft(tempRoot) {
  const createPath = path.join(tempRoot, 'create.txt');
  const markerPath = path.join(tempRoot, 'marker.txt');

  return {
    draft: {
      source: 'test-agent',
      summary: 'Preview apply behavior test',
      operations: [
        {
          id: 'op_create',
          type: 'file',
          action: 'create',
          path: createPath,
          after: 'hello world\n'
        },
        {
          id: 'op_update',
          type: 'file',
          action: 'update',
          path: path.join(tempRoot, 'update.txt'),
          before: 'old\n',
          after: 'new value\n'
        },
        {
          id: 'op_delete',
          type: 'file',
          action: 'delete',
          path: path.join(tempRoot, 'delete.txt'),
          before: 'remove me\n'
        },
        {
          id: 'op_command',
          type: 'command',
          command: `${process.execPath} -e "require('node:fs').writeFileSync(${JSON.stringify(markerPath)}, 'ran', 'utf8')"`
        }
      ],
      preconditions: [{ kind: 'git_clean' }]
    },
    createPath,
    markerPath
  };
}

function makePendingPlan(tempRoot) {
  const { draft, createPath, markerPath } = makePlanDraft(tempRoot);
  return {
    plan: createPlanFromDraft(draft),
    createPath,
    markerPath
  };
}

function makeApprovedPlan(tempRoot) {
  const { draft, createPath, markerPath } = makePlanDraft(tempRoot);
  return {
    plan: approvePlan(createPlanFromDraft(draft), 'ci-user'),
    createPath,
    markerPath
  };
}

function makeTamperedApprovedPlan(tempRoot) {
  const { plan, createPath, markerPath } = makeApprovedPlan(tempRoot);
  return {
    plan: {
      ...plan,
      summary: `${plan.summary} (tampered)`
    },
    createPath,
    markerPath
  };
}

function runCli(t, args) {
  try {
    return execFileSync(process.execPath, [CLI_PATH, ...args], { encoding: 'utf8' });
  } catch (error) {
    if (error && error.code === 'EPERM') {
      t.skip('subprocess execution is blocked in this environment');
      return null;
    }
    throw error;
  }
}

function assertNoSideEffects(createPath, markerPath) {
  assert.equal(fs.existsSync(createPath), false);
  assert.equal(fs.existsSync(markerPath), false);
}

function assertDryRunVerification(report, expected) {
  assert.equal(report.verification.status, expected.status);
  assert.equal(report.verification.approvalStatus, expected.approvalStatus);
  assert.equal(
    report.verification.readyToApplyFromIntegrityApproval,
    expected.readyToApplyFromIntegrityApproval
  );
  for (const blocker of expected.blockers) {
    assert.match(report.verification.blockers.join('\n'), new RegExp(blocker));
  }
}

test('previewPlan shows file and command actions without executing side effects', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'planfile-preview-'));
  try {
    const { plan, createPath, markerPath } = makeApprovedPlan(root);
    const report = previewPlan(plan);

    assert.equal(report.success, true);
    assert.equal(report.preconditionsChecked, false);
    assert.equal(report.results.length, 4);
    assert.match(report.results[0].message, /would create/);
    assert.match(report.results[1].message, /would update/);
    assert.match(report.results[2].message, /would delete/);
    assert.match(report.results[3].message, /would run command/);
    assertDryRunVerification(report, {
      status: 'ready',
      approvalStatus: 'approved',
      readyToApplyFromIntegrityApproval: true,
      blockers: []
    });
    assertNoSideEffects(createPath, markerPath);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('previewPlan on pending plans is allowed and reports not-ready verification', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'planfile-preview-pending-'));
  try {
    const { plan, createPath, markerPath } = makePendingPlan(root);
    const report = previewPlan(plan);

    assert.equal(report.success, true);
    assert.equal(report.results.length, 4);
    assertDryRunVerification(report, {
      status: 'not-ready',
      approvalStatus: 'pending',
      readyToApplyFromIntegrityApproval: false,
      blockers: ['Plan is not approved']
    });
    assertNoSideEffects(createPath, markerPath);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('previewPlan on tampered approved plans is allowed and reports mismatches', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'planfile-preview-tampered-'));
  try {
    const { plan, createPath, markerPath } = makeTamperedApprovedPlan(root);
    const report = previewPlan(plan);

    assert.equal(report.success, true);
    assert.equal(report.results.length, 4);
    assertDryRunVerification(report, {
      status: 'not-ready',
      approvalStatus: 'approved',
      readyToApplyFromIntegrityApproval: false,
      blockers: [
        'Recorded integrity hash does not match current plan hash',
        'Approval is not bound to the current plan hash'
      ]
    });
    assertNoSideEffects(createPath, markerPath);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('apply-plan --dry-run works without --yes and performs no writes', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'planfile-preview-cli-'));
  t.after(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const { plan, createPath, markerPath } = makeApprovedPlan(root);
  const planPath = path.join(root, 'plan.json');
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');

  const output = runCli(t, ['apply-plan', planPath, '--dry-run']);
  if (!output) return;

  const report = JSON.parse(output);
  assert.equal(report.success, true);
  assert.equal(report.preconditionsChecked, false);
  assertDryRunVerification(report, {
    status: 'ready',
    approvalStatus: 'approved',
    readyToApplyFromIntegrityApproval: true,
    blockers: []
  });
  assert.match(report.results[0].message, /would create/);
  assertNoSideEffects(createPath, markerPath);
});

test('apply-plan --dry-run works on unapproved plans and reports not-ready verification', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'planfile-preview-cli-pending-'));
  t.after(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const { plan, createPath, markerPath } = makePendingPlan(root);
  const planPath = path.join(root, 'plan.json');
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');

  const output = runCli(t, ['apply-plan', planPath, '--dry-run']);
  if (!output) return;

  const report = JSON.parse(output);
  assert.equal(report.success, true);
  assertDryRunVerification(report, {
    status: 'not-ready',
    approvalStatus: 'pending',
    readyToApplyFromIntegrityApproval: false,
    blockers: ['Plan is not approved']
  });
  assertNoSideEffects(createPath, markerPath);
});
