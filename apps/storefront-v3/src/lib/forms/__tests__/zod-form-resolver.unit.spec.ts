import { z } from "zod";
import { zodFormResolver } from "../zod-form-resolver";

const options = { fields: {}, shouldUseNativeValidation: false };

it("returns parsed values, defaults and transforms through the real form resolver", async () => {
  const schema = z.object({
    email: z.string().trim().email("Invalid email"),
    quantity: z.string().transform(Number),
    remember: z.boolean().default(false),
  });
  const resolver = zodFormResolver(schema);
  await expect(
    resolver(
      { email: " buyer@example.com ", quantity: "2" },
      undefined,
      options,
    ),
  ).resolves.toEqual({
    errors: {},
    values: { email: "buyer@example.com", quantity: 2, remember: false },
  });
});

it("maps v4 issues to nested field errors without rejecting the resolver promise", async () => {
  const schema = z.object({
    billing: z.object({ email: z.string().email("Invalid email") }),
  });
  const resolver = zodFormResolver(schema);
  const result = await resolver(
    { billing: { email: "invalid" } },
    undefined,
    options,
  );
  expect(result.values).toEqual({});
  expect(result.errors).toMatchObject({
    billing: { email: { message: "Invalid email" } },
  });
});
