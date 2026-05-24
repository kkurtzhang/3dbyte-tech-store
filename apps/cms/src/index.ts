import type { Core } from "@strapi/strapi";
import {
  createNodeAutoInstrumentations,
  startNodeTracing,
} from "@3dbyte-tech-store/observability";

const MEILISEARCH_API_KEY_STORE_KEY = "plugin_meilisearch_meilisearch_api_key";
const MEILISEARCH_HOST_STORE_KEY = "plugin_meilisearch_meilisearch_host";

async function syncMeilisearchCoreStoreValue(
  strapi: Core.Strapi,
  key: string,
  value: string,
) {
  const coreStore = strapi.db.query("strapi::core-store");
  const serializedValue = JSON.stringify(value);
  const storedValue = await coreStore.findOne({ where: { key } });

  if (storedValue) {
    if (storedValue.value === serializedValue) {
      return;
    }

    await coreStore.update({
      where: { id: storedValue.id },
      data: { value: serializedValue },
    });
    return;
  }

  await coreStore.create({
    data: {
      key,
      type: "string",
      value: serializedValue,
    },
  });
}

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {
    startNodeTracing({
      instrumentations: [createNodeAutoInstrumentations()],
      serviceName: "3dbyte-tech-store-cms",
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const configuredApiKey = process.env.MEILISEARCH_API_KEY?.trim() ?? "";
    const configuredHost = process.env.MEILISEARCH_HOST?.trim() ?? "";

    // strapi-plugin-meilisearch keeps old credentials in core store.
    // Keep it aligned with env so stale values cannot survive restores,
    // secret rotation, or Coolify env changes.
    await syncMeilisearchCoreStoreValue(
      strapi,
      MEILISEARCH_API_KEY_STORE_KEY,
      configuredApiKey,
    );

    if (configuredHost) {
      await syncMeilisearchCoreStoreValue(
        strapi,
        MEILISEARCH_HOST_STORE_KEY,
        configuredHost,
      );
    }
  },
};
