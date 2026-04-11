import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260403113000 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "preorder_variant_price" drop constraint if exists "preorder_variant_price_preorder_variant_id_currency_code_unique";`);
    this.addSql(`create table if not exists "preorder_variant_price" ("id" text not null, "currency_code" text not null, "amount" numeric not null, "preorder_variant_id" text not null, "raw_amount" jsonb not null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "preorder_variant_price_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_preorder_variant_price_preorder_variant_id" ON "preorder_variant_price" ("preorder_variant_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_preorder_variant_price_deleted_at" ON "preorder_variant_price" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_preorder_variant_price_preorder_variant_id_currency_code_unique" ON "preorder_variant_price" ("preorder_variant_id", "currency_code") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "preorder_variant_price" add constraint "preorder_variant_price_preorder_variant_id_foreign" foreign key ("preorder_variant_id") references "preorder_variant" ("id") on update cascade;`);
    this.addSql(`
      insert into "preorder_variant_price" (
        "id",
        "currency_code",
        "amount",
        "preorder_variant_id",
        "raw_amount",
        "created_at",
        "updated_at"
      )
      select
        concat('pvp_', substring(md5(concat("preorder_variant"."id", price_currency."currency_code")) from 1 for 22)),
        price_currency."currency_code",
        "preorder_variant"."preorder_price",
        "preorder_variant"."id",
        jsonb_build_object(
          'value',
          "preorder_variant"."preorder_price"::text,
          'precision',
          20
        ),
        now(),
        now()
      from "preorder_variant"
      inner join (
        select distinct
          "product_variant_price_set"."variant_id",
          "price"."currency_code"
        from "product_variant_price_set"
        inner join "price_set"
          on "price_set"."id" = "product_variant_price_set"."price_set_id"
         and "price_set"."deleted_at" is null
        inner join "price"
          on "price"."price_set_id" = "price_set"."id"
         and "price"."deleted_at" is null
         and "price"."price_list_id" is null
        where "product_variant_price_set"."deleted_at" is null
      ) as price_currency
        on price_currency."variant_id" = "preorder_variant"."variant_id"
      where "preorder_variant"."deleted_at" is null
        and "preorder_variant"."preorder_price" is not null
        and not exists (
          select 1
          from "preorder_variant_price" existing_price
          where existing_price."preorder_variant_id" = "preorder_variant"."id"
            and existing_price."currency_code" = price_currency."currency_code"
            and existing_price."deleted_at" is null
        );
    `);
    this.addSql(`
      insert into "preorder_variant_price" (
        "id",
        "currency_code",
        "amount",
        "preorder_variant_id",
        "raw_amount",
        "created_at",
        "updated_at"
      )
      select
        concat('pvp_', substring(md5(concat("preorder_variant"."id", region_currency."currency_code", 'fallback')) from 1 for 22)),
        region_currency."currency_code",
        "preorder_variant"."preorder_price",
        "preorder_variant"."id",
        jsonb_build_object(
          'value',
          "preorder_variant"."preorder_price"::text,
          'precision',
          20
        ),
        now(),
        now()
      from "preorder_variant"
      cross join (
        select distinct "region"."currency_code"
        from "region"
        where "region"."deleted_at" is null
      ) as region_currency
      where "preorder_variant"."deleted_at" is null
        and "preorder_variant"."preorder_price" is not null
        and not exists (
          select 1
          from "preorder_variant_price" existing_price
          where existing_price."preorder_variant_id" = "preorder_variant"."id"
            and existing_price."deleted_at" is null
        );
    `);

    this.addSql(`alter table if exists "preorder_variant" drop column if exists "preorder_price", drop column if exists "raw_preorder_price";`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "preorder_variant_price" cascade;`);

    this.addSql(`alter table if exists "preorder_variant" add column if not exists "preorder_price" numeric null, add column if not exists "raw_preorder_price" jsonb null;`);
  }

}
