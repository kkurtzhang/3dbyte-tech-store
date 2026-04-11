import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260403100000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table if exists "preorder_variant" add column if not exists "preorder_price" numeric null;`
    );
    this.addSql(`
      do $$
      begin
        if exists (
          select 1
          from information_schema.columns
          where table_schema = current_schema()
            and table_name = 'preorder_variant'
            and column_name = 'raw_preorder_price'
            and udt_name <> 'jsonb'
        ) then
          alter table "preorder_variant"
          alter column "raw_preorder_price"
          type jsonb
          using case
            when "raw_preorder_price" is null then null
            else jsonb_build_object(
              'value',
              "raw_preorder_price"::text,
              'precision',
              20
            )
          end;
        elsif not exists (
          select 1
          from information_schema.columns
          where table_schema = current_schema()
            and table_name = 'preorder_variant'
            and column_name = 'raw_preorder_price'
        ) then
          alter table "preorder_variant"
          add column "raw_preorder_price" jsonb null;
        end if;
      end
      $$;
    `);
    this.addSql(`
      update "preorder_variant"
      set "preorder_price" = ("raw_preorder_price" ->> 'value')::numeric
      where "preorder_price" is null
        and "raw_preorder_price" is not null
        and jsonb_typeof("raw_preorder_price") = 'object'
        and "raw_preorder_price" ? 'value';
    `);
    this.addSql(`
      update "preorder_variant"
      set "raw_preorder_price" = jsonb_build_object(
        'value',
        "preorder_price"::text,
        'precision',
        20
      )
      where "raw_preorder_price" is null
        and "preorder_price" is not null;
    `);
  }

  override async down(): Promise<void> {
    this.addSql(`
      do $$
      begin
        if exists (
          select 1
          from information_schema.columns
          where table_schema = current_schema()
            and table_name = 'preorder_variant'
            and column_name = 'raw_preorder_price'
            and udt_name = 'jsonb'
        ) then
          alter table "preorder_variant"
          alter column "raw_preorder_price"
          type numeric
          using case
            when "raw_preorder_price" is null then null
            when jsonb_typeof("raw_preorder_price") = 'object'
              and "raw_preorder_price" ? 'value'
              then ("raw_preorder_price" ->> 'value')::numeric
            else null
          end;
        end if;
      end
      $$;
    `);
  }
}
