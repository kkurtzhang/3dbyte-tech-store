import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import index from "./three-d-sets-source-index.json";

type Message = {
  role: "user" | "assistant";
  content?: string;
  parts?: Array<{ type: string; text?: string }>;
};
type Link = { sourceId: string; url: string; title: string };
export type ResourceReply = {
  status: "source_links" | "unknown";
  reason: string;
  text: string;
  links: Link[];
  modelKey: string | null;
  productRelease: string | null;
  guideRevision: string | null;
  unknownFields: string[];
};
const patterns: Record<string, RegExp> = {
  sandy: /\bsandy\b|\bmodel\s*11\b/i,
  max_4x4: /\bmax\s*4\s*[x×]\s*4\b|\bmodel\s*15\b/i,
  rancher_hardtop: /\brancher\b.*\bhardtop\b|\bmodel\s*2\b/i,
  skippy: /\bskippy\b/i,
  triton: /\btriton\b/i,
};
const privateContext =
  /\b(?:order|cart|customer|cus)_[a-z0-9_]+|[^\s@]+@[^\s@]+\.[^\s@]+|\b(?:my order|track my|my account)\b/i;
const messageText = (message: Message) =>
  message.content ??
  message.parts
    ?.filter((part) => part.type === "text")
    .map((part) => part.text || "")
    .join("") ??
  "";
const namedModels = (question: string) =>
  index.models.filter((model) => patterns[model.model_key].test(question));

// The index contains link metadata only. It is never used as manual/FAQ content or approved factual evidence.
export function resolveThreeDSetsResources(
  messages: Message[],
): ResourceReply | null {
  const users = messages.filter((message) => message.role === "user");
  const question = messageText(users[users.length - 1] || { role: "user" });
  let models = namedModels(question);
  const domain =
    /\b3d\s*sets\b|\b(?:landy|sakura|buggster|WES248[789])\b/i.test(question);
  if (
    !domain &&
    !models.length &&
    /\b(?:it|its|this|that|these|those)\b/i.test(question)
  ) {
    const previous = users[users.length - 2];
    if (previous && !privateContext.test(messageText(previous)))
      models = namedModels(messageText(previous));
  }
  if (!domain && !models.length) return null;
  const catalogue: Link = {
    sourceId: "local_resource_3dsets_catalogue",
    url: index.catalogue_url,
    title: "3D Sets official model catalogue",
  };
  const model = models.length === 1 ? models[0] : undefined;
  const base = {
    modelKey: model?.model_key || null,
    productRelease: model?.product_release || null,
    guideRevision: null,
    unknownFields: [] as string[],
  };
  if (/\bfaq\b|frequently asked/i.test(question)) {
    return {
      ...base,
      status: "source_links",
      reason: "official_faq_link_only",
      text: "3D Sets customer FAQs are available at the official link below. The page is dated 23 June 2021; check current model-specific sources for version-sensitive information.",
      links: [
        {
          sourceId: "local_resource_3dsets_faq",
          url: index.faq.url,
          title: "3D Sets official FAQ (2021)",
        },
      ],
    };
  }
  if (
    /\b(?:aircraft|airplane|aeroplane|jet plane)\b/i.test(question) ||
    (/\bjets?\b/i.test(question) && !/\bboats?\b/i.test(question) && !model)
  ) {
    return {
      ...base,
      status: "unknown",
      reason: "aircraft_family_unverified",
      text: "Jet aircraft coverage is not verified in this index. Skippy and Triton are indexed boat models. Which exact model do you mean?",
      links: [catalogue],
      unknownFields: ["aircraft_model_identity"],
    };
  }
  const product: Link | undefined = model
    ? {
        sourceId: "local_resource_3dsets_" + model.model_key,
        url: model.publisher_product_url,
        title: "3D Sets: " + model.name,
      }
    : undefined;
  if (
    /\b(?:kit|kits|included|inclusions|contents|sku|price|pricing|stock|dispatch|shipping|delivery|stl|stls|files|licen[cs]e|download)\b/i.test(
      question,
    )
  ) {
    return {
      ...base,
      status: "unknown",
      reason: "store_kit_not_mapped",
      text: "This store sells physical build kits for 3D Sets models. The selected kit's contents, exclusions and supported model release are not yet verified. Digital model access and its licence are separate; inclusion in a kit is unverified. Name the store kit SKU and model version so we can check the supplier BOM. Store price, stock and delivery also remain unverified.",
      links: product ? [product] : [catalogue],
      unknownFields: [
        "store_kit_sku",
        "kit_revision",
        "included_contents",
        "excluded_contents",
        "supported_model_release",
        "digital_access_included",
        "store_price",
        "physical_stock",
        "delivery_estimate",
      ],
    };
  }
  if (!model) {
    return {
      ...base,
      status: "unknown",
      reason: "exact_model_required",
      text: "Which 3D Sets model and version are you building? Name the model number and body variant so we can link its official guide.",
      links: [catalogue],
      unknownFields: ["model_identity", "model_version"],
    };
  }
  const version = question.match(
    /\bv(?:ersion)?\s*(\d+\.\d+(?:\.\d+)?)\b/i,
  )?.[1];
  const guide = version
    ? model.guides.find((item) => item.guide_revision === version)
    : model.guides[0];
  if (!guide) {
    return {
      ...base,
      status: "unknown",
      reason: "exact_guide_revision_unverified",
      text: "An official presentation link for that exact guide revision is not verified in this index. Use the publisher product page below to select the model and guide version.",
      links: [product!],
      unknownFields: ["guide_revision_applicability"],
    };
  }
  // The product page's Max Team label conflicts with this Max 4x4 identity. Keep that ambiguity visible.
  if (model.model_key === "max_4x4") {
    return {
      ...base,
      status: "unknown",
      reason: "publisher_guide_label_conflict",
      text: "Max 4x4 is model 15, with product release 1.0.4. Its publisher page labels the guide Max Team, while delegated research reports Max 4x4 and guide revision 1.0. Confirm the model and guide identity on the publisher page before using assembly instructions; gearbox and kit revision applicability remain unverified.",
      links: [product!],
      unknownFields: [
        "guide_identity",
        "gearbox_option",
        "kit_revision_applicability",
      ],
    };
  }
  return {
    ...base,
    guideRevision: guide.guide_revision,
    status: "source_links",
    reason: "official_build_guide_link_only",
    text:
      "For " +
      model.name +
      ", use the official public presentation linked below for assembly steps. Linked guide revision: " +
      guide.guide_revision +
      "." +
      (model.product_release && model.product_release !== guide.guide_revision
        ? " Product release " +
          model.product_release +
          " and guide revision " +
          guide.guide_revision +
          " are distinct; check applicability to your build and kit."
        : " Check that this guide revision matches your build.") +
      " Physical kit contents and digital model access are separate and remain unverified for your selected store kit.",
    links: [
      product!,
      {
        sourceId:
          "local_resource_3dsets_guide_" +
          model.model_key +
          "_" +
          guide.guide_revision,
        url: guide.url,
        title: model.name + " official build guide v" + guide.guide_revision,
      },
    ],
  };
}

export function streamThreeDSetsResources(reply: ResourceReply): Response {
  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({
        type: "start",
        messageId: "local-resources-" + crypto.randomUUID(),
      });
      writer.write({
        type: "data-local-resource-links",
        data: {
          environment: "local_development",
          staging_native_eligible: false,
          model_generation: false,
          status: reply.status,
          reason: reply.reason,
          model_key: reply.modelKey,
          product_release: reply.productRelease,
          guide_revision: reply.guideRevision,
          kit_revision: null,
          unknown_fields: reply.unknownFields,
          checked_at: index.checked_at,
          source_usage: index.source_usage,
          factual_confidence: "source_link_metadata_only",
          native_approval: null,
        },
      });
      writer.write({ type: "text-start", id: "local-resources" });
      writer.write({
        type: "text-delta",
        id: "local-resources",
        delta: "Local development · Official resource links\n\n" + reply.text,
      });
      writer.write({ type: "text-end", id: "local-resources" });
      for (const link of reply.links)
        writer.write({ type: "source-url", ...link });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });
  return createUIMessageStreamResponse({
    stream,
    headers: {
      "Cache-Control": "no-store",
      "x-3db-ai-model": "local-deterministic-context",
      "x-3db-knowledge-environment": "local_development",
    },
  });
}
