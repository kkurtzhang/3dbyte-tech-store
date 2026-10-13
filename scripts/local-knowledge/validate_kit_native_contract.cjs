"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const repo = path.resolve(__dirname, "../..");
const parser = require(
  path.join(repo, "packages/shared-utils/src/knowledge-reference.cjs"),
);
const ts = require(path.join(repo, "node_modules/typescript"));
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
function pureModule(relative) {
  const source = fs.readFileSync(path.join(repo, relative), "utf8");
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    reportDiagnostics: true,
  });
  assert(
    !result.diagnostics.some((d) => d.category === ts.DiagnosticCategory.Error),
  );
  const fixture = { exports: {} };
  vm.runInNewContext(result.outputText, {
    module: fixture,
    exports: fixture.exports,
    require(name) {
      if (
        name === "@3dbyte-tech-store/shared-utils/src/knowledge-reference.cjs"
      )
        return parser;
      if (name === "node:crypto" || name === "node:util") return require(name);
      throw new Error("Non-pure dependency refused: " + name);
    },
  });
  return fixture.exports;
}
const cms = pureModule(
  "apps/cms/src/api/product-document/utils/knowledge-reference.ts",
);
const native = pureModule(
  "apps/backend/src/lib/knowledge-reference/contract.ts",
);
const schema = JSON.parse(
  fs.readFileSync(
    path.join(
      repo,
      "apps/cms/src/api/product-document/content-types/product-document/schema.json",
    ),
  ),
);
function body(record) {
  const content = record.knowledge_content;
  return {
    version: content.version,
    document_id: record.documentId,
    product_id: record.medusa_product_id,
    variant_id: content.variant_id,
    product_handle: record.product_handle,
    product_title: record.product_title,
    document_title: record.title,
    source_url: record.source_url,
    source_kind: record.source_kind,
    source_sha256: content.source_sha256,
    source_version: record.version,
    source_checked_at: record.source_checked_at,
    text: content.text,
    facts: content.facts,
  };
}
function validate(plan) {
  assert.equal(plan.fixture_only, true);
  assert.equal(plan.native_apply_authorized, false);
  assert.equal(plan.native_approval_created, false);
  const cases = [];
  for (const entry of plan.entries) {
    const fixture =
      entry.local_contract_fixture.native_record_for_structure_check;
    const raw = body(fixture);
    const parsed = parser.parseKnowledgeBody(raw);
    assert(
      parsed,
      "Supported scoped identity fields with unresolved nulls must be structurally accepted",
    );
    for (const field of ["documentId", "medusa_product_id"])
      assert(fixture[field].startsWith("local_dev_fixture_"));
    assert(
      fixture.knowledge_content.variant_id.startsWith("local_dev_fixture_"),
    );
    for (const [field, rule] of Object.entries(schema.attributes)) {
      if (rule.required)
        assert(
          fixture[field] !== undefined &&
            fixture[field] !== null &&
            fixture[field] !== "",
          field,
        );
      if (rule.type === "enumeration" && fixture[field] !== undefined)
        assert(rule.enum.includes(fixture[field]), field);
    }
    const revision = cms.knowledgeRevision(fixture);
    assert.equal(revision, hash(JSON.stringify(parsed)));
    assert.equal(cms.knowledgeRevision(entry.native_record_template), null);
    assert.equal(parser.parseApprovedKnowledgeDocument(parsed), null);
    assert.equal(cms.approvedKnowledgeDocument(fixture), null);
    // An offline publication projection with pending review is still not native approval.
    const publicationProjection = structuredClone(fixture);
    publicationProjection.is_public = true;
    publicationProjection.publishedAt = fixture.source_checked_at;
    assert.equal(cms.approvedKnowledgeDocument(publicationProjection), null);
    const product = {
      id: fixture.medusa_product_id,
      title: fixture.product_title,
      handle: fixture.product_handle,
      status: "draft",
      variants: [
        { id: fixture.knowledge_content.variant_id, price_set: { prices: [] } },
      ],
      metadata: { catalogue_role: "knowledge_reference" },
    };
    assert.equal(native.referenceCard(product, parsed, "staging"), null);
    const changed = structuredClone(raw);
    const unknown = changed.facts.find(
      (fact) => fact.field === "esc_battery_connector_type",
    );
    assert.equal(unknown.value, null);
    unknown.value = "XT60";
    assert.equal(parser.parseKnowledgeBody(changed), null);
    const wrongKind = { ...raw, source_kind: "supplier_BOM" };
    assert.equal(parser.parseKnowledgeBody(wrongKind), null);
    const mismatched = structuredClone(fixture);
    mismatched.knowledge_content.variant_id = null;
    assert.equal(cms.knowledgeRevision(mismatched), null);
    cases.push({
      reference_key: entry.reference_key,
      structure_accepted_with_partial_facts: true,
      fact_count: parsed.facts.length,
      local_structure_revision_sha256: revision,
      unbound_native_record_rejected: true,
      pending_private_and_public_projection_approval_rejected: true,
      unapproved_card_rejected: true,
      unsupported_unknown_promotion_rejected: true,
      invalid_source_kind_rejected: true,
      native_ids_and_approvals_created: 0,
    });
  }
  return {
    fixture_only: true,
    native_changes: 0,
    reviewer_approvals_created: 0,
    cases,
    references: cases.length,
    tested_actual_shared_parser_and_cms_backend_contracts: true,
    limit:
      "Local fixture IDs validate shape only. No approved reviewer event, published native record, server/API or staging database transaction was fabricated or exercised.",
  };
}
module.exports = { validate };
if (require.main === module) {
  const plan = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  process.stdout.write(JSON.stringify(validate(plan)) + "\n");
}
