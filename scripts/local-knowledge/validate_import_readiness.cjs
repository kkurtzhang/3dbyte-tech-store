"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const repo = path.resolve(__dirname, "../..");
const parser = require("../../packages/shared-utils/src/knowledge-reference.cjs");
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

function validate(plan) {
  const cms = pureModule(
    "apps/cms/src/api/product-document/utils/knowledge-reference.ts",
  );
  const backend = pureModule(
    "apps/backend/src/lib/knowledge-reference/contract.ts",
  );
  const schema = JSON.parse(
    fs.readFileSync(
      path.join(
        repo,
        "apps/cms/src/api/product-document/content-types/product-document/schema.json",
      ),
      "utf8",
    ),
  );
  assert.equal(plan.schema_version, 2);
  assert.equal(plan.native_apply_authorized, false);
  assert.equal(plan.native_import_eligible_count, 0);
  assert.equal(plan.new_native_review_events, 0);
  const candidates = new Map();
  let unknowns = 0;
  let supported = 0;
  for (const candidate of plan.single_source_candidate_fragments) {
    assert(!candidates.has(candidate.candidate_key));
    candidates.set(candidate.candidate_key, candidate);
    assert.equal(candidate.apply_authorized, false);
    assert.equal(candidate.native_revision_hash, null);
    const record = candidate.strapi_structure_fixture_only;
    for (const key of ["documentId", "medusa_product_id"])
      assert(record[key].startsWith("local_dev_fixture_"));
    assert(
      record.knowledge_content.variant_id.startsWith("local_dev_fixture_"),
    );
    const raw = candidate.structure_fixture_only;
    const body = parser.parseKnowledgeBody(raw);
    assert(body, candidate.candidate_key);
    assert.equal(cms.knowledgeRevision(record), hash(JSON.stringify(body)));
    assert.equal(record.version, body.source_version);
    assert.equal(record.knowledge_content.version, 1);
    for (const [field, rule] of Object.entries(schema.attributes)) {
      if (rule.required)
        assert(
          record[field] !== null &&
            record[field] !== undefined &&
            record[field] !== "",
          field,
        );
      if (rule.type === "enumeration" && record[field] !== undefined)
        assert(rule.enum.includes(record[field]), field);
    }
    for (const field of Object.keys(candidate.strapi_create_data_template))
      assert(schema.attributes[field], field);
    assert.equal(cms.knowledgeRevision(candidate.strapi_record_template), null);
    assert.equal(parser.parseKnowledgeBody(candidate.native_template), null);
    assert.equal(parser.parseApprovedKnowledgeDocument(body), null);
    assert.equal(cms.approvedKnowledgeDocument(record), null);
    const projected = structuredClone(record);
    projected.is_public = true;
    projected.publishedAt = raw.source_checked_at;
    assert.equal(cms.approvedKnowledgeDocument(projected), null);
    assert.equal(backend.verifiedReferenceDocument(body), null);
    assert.equal(record.is_public, false);
    assert.equal(record.publishedAt, null);
    assert.equal(record.knowledge_review.status, "pending");
    assert.equal(candidate.source_review.native_review_event, false);
    assert.equal(candidate.source_review.new_user_approval_claimed, false);
    assert.equal(
      candidate.source_review.existing_local_event.decision,
      "accepted_for_local_development",
    );
    for (const fact of body.facts) {
      if (fact.value === null) {
        unknowns++;
        assert.equal(fact.evidence_excerpt, "");
      } else supported++;
    }
    const unknown = body.facts.find((f) => f.value === null);
    if (unknown) {
      const changed = structuredClone(raw);
      changed.facts.find((f) => f.field === unknown.field).value =
        "unverified promotion";
      assert.equal(parser.parseKnowledgeBody(changed), null);
    }
    assert.equal(
      parser.parseKnowledgeBody({ ...raw, source_kind: "generated_reference" }),
      null,
    );
  }
  const primaries = new Set();
  for (const shell of plan.reference_shell_plans) {
    assert.equal(shell.native_product_id, null);
    assert.equal(shell.native_variant_id, null);
    assert.equal(shell.native_create_or_update_authorized, false);
    const primary = candidates.get(shell.primary_candidate_key);
    assert(primary && primary.selected_for_reference_card);
    assert.equal(primary.local_group_key, shell.local_group_key);
    assert(!primaries.has(primary.candidate_key));
    primaries.add(primary.candidate_key);
    for (const key of shell.alternative_candidate_keys) {
      const alt = candidates.get(key);
      assert(alt && !alt.selected_for_reference_card);
      assert.equal(alt.local_group_key, shell.local_group_key);
      assert.equal(
        alt.structure_fixture_only.product_id,
        primary.structure_fixture_only.product_id,
      );
      assert.equal(
        alt.structure_fixture_only.variant_id,
        primary.structure_fixture_only.variant_id,
      );
    }
    const create = shell.medusa_create_data_template;
    assert.equal(create.status, "draft");
    assert.equal(create.metadata.catalogue_role, "knowledge_reference");
    assert.equal(create.variants.length, 1);
    assert.deepEqual(create.variants[0].prices, []);
    assert.equal(create.variants[0].manage_inventory, false);
    assert.equal(shell.policy.checkout_enabled, false);
    assert.equal(shell.policy.physical_stock, null);
    assert.equal(shell.simulation_after_binding_only.product_id, null);
    assert.equal(shell.simulation_after_binding_only.real_stock, false);
    const body = primary.structure_fixture_only;
    const product = {
      id: body.product_id,
      title: body.product_title,
      handle: body.product_handle,
      status: "draft",
      metadata: create.metadata,
      variants: [{ id: body.variant_id, price_set: { prices: [] } }],
    };
    assert.equal(backend.referenceCard(product, body, "staging"), null);
    const priced = structuredClone(product);
    priced.variants[0].price_set.prices.push({
      amount: 1,
      currency_code: "aud",
    });
    assert.throws(() =>
      backend.bindKnowledgeReference(priced, body, "staging"),
    );
    assert.throws(() =>
      backend.bindKnowledgeReference(product, body, "production"),
    );
  }
  assert.equal(primaries.size, plan.primary_reference_document_count);
  assert.equal(supported, plan.supported_fact_count);
  return {
    structure_fixtures: candidates.size,
    supported_facts: supported,
    nullable_fact_occurrences: unknowns,
    primary_documents: primaries.size,
    schema_required_fields_and_canonical_hash_mapping_passed: true,
    group_consistent_alternative_bindings_passed: true,
    unbound_pending_private_and_public_projection_approval_rejected: true,
    unsupported_unknown_promotion_and_source_kind_rejected: true,
    priced_shell_and_wrong_environment_binding_rejected: true,
    native_ids_approvals_or_writes_created: 0,
  };
}
module.exports = { validate };
if (require.main === module)
  process.stdout.write(
    JSON.stringify(
      validate(JSON.parse(fs.readFileSync(process.argv[2], "utf8"))),
    ) + "\n",
  );
