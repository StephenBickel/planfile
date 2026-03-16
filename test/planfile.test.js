const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { createPlanFromDraft, approvePlan, verifyPlan } = require('../dist');

function resolveRef(rootSchema, ref) {
  if (!ref.startsWith('#/')) {
    throw new Error(`Unsupported $ref: ${ref}`);
  }

  return ref
    .slice(2)
    .split('/')
    .reduce((node, key) => (node ? node[key] : undefined), rootSchema);
}

function isDateTimeString(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function validateAgainstSchema(schema, data, rootSchema = schema, pathLabel = '$') {
  const errors = [];

  if (schema.$ref) {
    const target = resolveRef(rootSchema, schema.$ref);
    if (!target) {
      return { valid: false, errors: [`${pathLabel}: unresolved $ref ${schema.$ref}`] };
    }
    return validateAgainstSchema(target, data, rootSchema, pathLabel);
  }

  if (schema.type) {
    const isArray = Array.isArray(data);
    const isObject = typeof data === 'object' && data !== null && !isArray;
    const typeMatches = {
      object: isObject,
      array: isArray,
      string: typeof data === 'string',
      number: typeof data === 'number' && Number.isFinite(data),
      boolean: typeof data === 'boolean'
    }[schema.type];

    if (!typeMatches) {
      errors.push(`${pathLabel}: expected type ${schema.type}`);
      return { valid: false, errors };
    }
  }

  if (schema.required) {
    for (const key of schema.required) {
      if (typeof data !== 'object' || data === null || !(key in data)) {
        errors.push(`${pathLabel}: missing required property ${key}`);
      }
    }
  }

  if (schema.properties && typeof data === 'object' && data !== null && !Array.isArray(data)) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in data) {
        const result = validateAgainstSchema(
          propSchema,
          data[key],
          rootSchema,
          `${pathLabel}.${key}`
        );
        if (!result.valid) {
          errors.push(...result.errors);
        }
      }
    }
  }

  if (schema.items && Array.isArray(data)) {
    data.forEach((item, index) => {
      const result = validateAgainstSchema(schema.items, item, rootSchema, `${pathLabel}[${index}]`);
      if (!result.valid) {
        errors.push(...result.errors);
      }
    });
  }

  if (typeof schema.minItems === 'number' && Array.isArray(data) && data.length < schema.minItems) {
    errors.push(`${pathLabel}: expected at least ${schema.minItems} items`);
  }

  if (schema.enum && !schema.enum.includes(data)) {
    errors.push(`${pathLabel}: value ${JSON.stringify(data)} not in enum`);
  }

  if (Object.prototype.hasOwnProperty.call(schema, 'const') && data !== schema.const) {
    errors.push(`${pathLabel}: expected const ${JSON.stringify(schema.const)}`);
  }

  if (schema.pattern && typeof data === 'string' && !new RegExp(schema.pattern).test(data)) {
    errors.push(`${pathLabel}: string does not match pattern ${schema.pattern}`);
  }

  if (schema.format === 'date-time' && !isDateTimeString(data)) {
    errors.push(`${pathLabel}: expected RFC3339 date-time string`);
  }

  if (schema.allOf) {
    for (const part of schema.allOf) {
      const result = validateAgainstSchema(part, data, rootSchema, pathLabel);
      if (!result.valid) {
        errors.push(...result.errors);
      }
    }
  }

  if (schema.oneOf) {
    const passing = schema.oneOf.filter((candidate) =>
      validateAgainstSchema(candidate, data, rootSchema, pathLabel).valid
    );
    if (passing.length !== 1) {
      errors.push(`${pathLabel}: expected exactly one oneOf branch to match`);
    }
  }

  if (schema.if && schema.then) {
    const ifResult = validateAgainstSchema(schema.if, data, rootSchema, pathLabel);
    if (ifResult.valid) {
      const thenResult = validateAgainstSchema(schema.then, data, rootSchema, pathLabel);
      if (!thenResult.valid) {
        errors.push(...thenResult.errors);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function makeDraft() {
  return {
    source: 'test-agent',
    summary: 'Create a small file',
    operations: [
      {
        id: 'op_file_1',
        type: 'file',
        action: 'create',
        path: 'tmp/demo.txt',
        after: 'hello'
      }
    ],
    preconditions: [{ kind: 'git_clean' }]
  };
}

test('createPlanFromDraft -> verifyPlan before approval is not-ready', () => {
  const plan = createPlanFromDraft(makeDraft());
  const report = verifyPlan(plan);

  assert.equal(report.status, 'not-ready');
  assert.equal(report.approvalStatus, 'pending');
  assert.equal(report.checks.integrityMetadataExists, true);
  assert.equal(report.checks.recordedHashMatchesCurrent, true);
  assert.equal(report.checks.approvalBoundToCurrentHash, false);
});

test('approvePlan -> verifyPlan becomes ready', () => {
  const plan = createPlanFromDraft(makeDraft());
  const approved = approvePlan(plan, 'ci-user');
  const report = verifyPlan(approved);

  assert.equal(report.status, 'ready');
  assert.equal(report.approvalStatus, 'approved');
  assert.equal(report.checks.approvalBoundToCurrentHash, true);
});

test('tampered approved plan -> verifyPlan becomes not-ready', () => {
  const plan = createPlanFromDraft(makeDraft());
  const approved = approvePlan(plan, 'ci-user');
  const tampered = {
    ...approved,
    summary: `${approved.summary} (tampered)`
  };
  const report = verifyPlan(tampered);

  assert.equal(report.approvalStatus, 'approved');
  assert.equal(report.status, 'not-ready');
  assert.equal(report.checks.recordedHashMatchesCurrent, false);
  assert.equal(report.checks.approvalBoundToCurrentHash, false);
});

test('generated plan validates against JSON schema', () => {
  const schemaPath = path.join(__dirname, '..', 'schema', 'planfile.schema.json');
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

  const pending = createPlanFromDraft(makeDraft());
  const approved = approvePlan(pending, 'ci-user');

  const pendingResult = validateAgainstSchema(schema, pending);
  const approvedResult = validateAgainstSchema(schema, approved);

  assert.equal(pendingResult.valid, true, pendingResult.errors.join('\n'));
  assert.equal(approvedResult.valid, true, approvedResult.errors.join('\n'));
});
