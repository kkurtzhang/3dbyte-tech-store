## FEATURE:

- Integrating Meilisearch into medusa
- Index the enriched products(productDescription from strapi) into meilisearch
- Implement a compatible search bar based on meilisearch in storefront

## EXAMPLES:

In the `apps/backend/examples/` folder, there is a README for you to read to understand what the example is all about and also how to structure your own README when you create documentation for the above feature.
Read through all of the files here to understand best practices for creating Pydantic AI agents that support different providers and LLMs, handling agent dependencies, and adding tools to the agent.

Don't copy any of these examples directly, it is for a different project entirely. But use this as inspiration and for best practices.

## DOCUMENTATION:

Integration guide documentation: `/docs/meilisearch-integration-guide.md`

MedusaJS documentation: 
- https://docs.medusajs.com/resources/integrations/guides/meilisearch
- https://docs.medusajs.com/resources/integrations/guides/strapi

Useful MCP servers:
- medusa
- meilisearch
- strapi-docs


## OTHER CONSIDERATIONS:

- use @strapi/client in backend
- use @meilisearch/instant-meilisearch react-instantsearch in storefront when implement search bar
