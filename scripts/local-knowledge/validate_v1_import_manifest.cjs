"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");
const parser = require("../../packages/shared-utils/src/knowledge-reference.cjs");
const manifest = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
assert.equal(manifest.native_apply_authorized, false);
assert.equal(manifest.native_import_eligible_count, 0);
let cases = 0;
for (const candidate of manifest.single_source_candidate_fragments) {
  assert.equal(candidate.apply_authorized, false);
  assert.equal(candidate.native_revision_hash, null);
  assert.equal(candidate.native_review.status, "pending");
  assert.equal(candidate.native_review.reviewed_at, null);
  const body = candidate.structure_fixture_only;
  for (const key of ["document_id", "product_id", "variant_id"])
    assert(body[key].startsWith("local_dev_fixture_"));
  const parsed = parser.parseKnowledgeBody(body);
  assert(parsed, candidate.candidate_key);
  assert.equal(parser.parseKnowledgeBody(candidate.native_template), null);
  assert.equal(parser.parseApprovedKnowledgeDocument(parsed), null);
  assert.equal(candidate.is_public, false);
  assert.equal(candidate.publishedAt, null);
  cases++;
}
for (const shell of manifest.reference_shell_plans) {
  assert.equal(shell.native_product_id, null);
  assert.equal(shell.native_variant_id, null);
  assert.equal(shell.native_create_or_update_authorized, false);
  assert.equal(shell.policy.status, "draft");
  assert.equal(shell.policy.variant_count, 1);
  assert.deepEqual(shell.policy.prices, []);
  assert.equal(shell.policy.card_price, null);
  assert.equal(shell.policy.checkout_enabled, false);
  assert.equal(shell.policy.physical_stock, null);
  assert.equal(shell.policy.simulation.real_stock, false);
}
process.stdout.write(
  JSON.stringify({
    cases,
    structure_fixtures_accepted: true,
    unbound_templates_rejected: true,
    unreviewed_approval_rejected: true,
    native_ids_or_approvals_created: 0,
  }) + "\n",
);
