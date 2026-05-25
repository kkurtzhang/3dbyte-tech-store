SELECT 'CREATE DATABASE strapi'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'strapi')\gexec

SELECT 'CREATE DATABASE karrio'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'karrio')\gexec

\connect medusa
CREATE EXTENSION IF NOT EXISTS vector;

\connect strapi
CREATE EXTENSION IF NOT EXISTS vector;
