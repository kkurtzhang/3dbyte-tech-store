import type { Core } from '@strapi/strapi';

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const configuredApiKey = process.env.MEILISEARCH_API_KEY?.trim() ?? '';

    // strapi-plugin-meilisearch keeps old credentials in core store.
    // If env no longer provides an API key, clear the stored key so a stale
    // value cannot survive DB restores or env changes.
    if (!configuredApiKey) {
      await strapi.db.query('strapi::core-store').updateMany({
        where: {
          key: 'plugin_meilisearch_meilisearch_api_key',
        },
        data: {
          value: '""',
        },
      });
    }
  },
};
