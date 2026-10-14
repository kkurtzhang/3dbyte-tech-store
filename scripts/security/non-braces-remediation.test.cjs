"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const { lockedConsumer } = require("./locked-consumer.cjs");

const qs = require(lockedConsumer("apps/storefront-v3", ["qs"]));
const { Address4, Address6 } = require(
  lockedConsumer("apps/backend", [
    "@medusajs/framework",
    "express-rate-limit",
    "ip-address",
  ]),
);
const postcss = require(lockedConsumer("apps/storefront-v3", ["postcss"]));

test("query parsing enforces the comma array limit for bracket keys", () => {
  assert.throws(
    () =>
      qs.parse("a[]=1,2,3,4", {
        comma: true,
        arrayLimit: 3,
        throwOnLimitExceeded: true,
      }),
    RangeError,
  );
  assert.deepEqual(qs.parse("a[]=1,2", { comma: true, arrayLimit: 3 }), {
    a: [["1", "2"]],
  });
  assert.equal(
    qs.stringify({ filters: { category: ["hotend", "extruder"] } }),
    "filters%5Bcategory%5D%5B0%5D=hotend&filters%5Bcategory%5D%5B1%5D=extruder",
  );
});

test("IP classification covers the full link-local prefix and separates families", () => {
  assert.equal(new Address6("febf::1").isLinkLocal(), true);
  assert.equal(new Address6("2001:db8::1").isLinkLocal(), false);
  assert.equal(
    new Address4("0.0.0.1").isInSubnet(new Address6("::/64")),
    false,
  );
  assert.equal(
    new Address4("10.1.2.3").isInSubnet(new Address4("10.0.0.0/8")),
    true,
  );
});

test("PostCSS ignores absolute external source maps without an input filename", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "postcss-fixture-"));
  const mapPath = path.join(directory, "outside.map");
  fs.writeFileSync(
    mapPath,
    JSON.stringify({
      version: 3,
      sources: ["fixture.ts"],
      names: [],
      mappings: "AAAA",
      sourcesContent: ["private-fixture-content"],
    }),
  );
  try {
    const result = await postcss([]).process(
      `a{color:red}/*# sourceMappingURL=${mapPath} */`,
      { map: { inline: false, annotation: false } },
    );
    assert.equal(
      JSON.stringify(result.map.toJSON()).includes("private-fixture-content"),
      false,
    );
    assert.match(result.css, /a\{color:red\}/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("Medusa's locked upload and logger consumers handle a synthetic multipart request", async () => {
  const http = require("node:http");
  const express = require(
    lockedConsumer("apps/backend", ["@medusajs/framework", "express"]),
  );
  const morgan = require(
    lockedConsumer("apps/backend", ["@medusajs/framework", "morgan"]),
  );
  const multer = require(
    lockedConsumer("apps/backend", ["@medusajs/medusa", "multer"]),
  );
  const app = express();
  const logs = [];
  app.use(
    morgan("combined", {
      immediate: true,
      stream: { write: (line) => logs.push(line) },
    }),
  );
  app.post(
    "/fixture",
    multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 32 },
    }).single("file"),
    (req, res) =>
      res.json({
        filename: req.file.originalname,
        body: req.file.buffer.toString(),
      }),
  );
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const multipart =
    '--fixture-boundary\r\nContent-Disposition: form-data; name="file"; filename="fixture.txt"\r\nContent-Type: text/plain\r\n\r\n42\r\n--fixture-boundary--\r\n';
  try {
    const result = await new Promise((resolve, reject) => {
      const request = http.request(
        {
          host: "127.0.0.1",
          port: server.address().port,
          path: "/fixture",
          method: "POST",
          headers: {
            "content-type": "multipart/form-data; boundary=fixture-boundary",
            "content-length": Buffer.byteLength(multipart),
          },
        },
        (response) => {
          let body = "";
          response.setEncoding("utf8");
          response.on("data", (chunk) => {
            body += chunk;
          });
          response.once("end", () =>
            resolve({ status: response.statusCode, body: JSON.parse(body) }),
          );
          response.once("error", reject);
        },
      );
      request.setTimeout(2000, () =>
        request.destroy(new Error("Fixture deadline exceeded")),
      );
      request.once("error", reject);
      request.end(multipart);
    });
    assert.deepEqual(result, {
      status: 200,
      body: { filename: "fixture.txt", body: "42" },
    });
    assert.equal(logs.length, 1);
    assert.match(logs[0], /POST \/fixture HTTP/);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("Nodemailer retains ordinary message/envelope behavior without an SMTP connection", async () => {
  const nodemailer = require(lockedConsumer("apps/backend", ["nodemailer"]));
  const transport = nodemailer.createTransport({ jsonTransport: true });
  const result = await transport.sendMail({
    from: "Store <store@example.invalid>",
    to: "Buyer <buyer@example.invalid>",
    subject: "Fixture receipt",
    text: "Synthetic receipt",
  });
  assert.deepEqual(result.envelope.to, ["buyer@example.invalid"]);
  assert.equal(JSON.parse(result.message).subject, "Fixture receipt");
  transport.close();
});

test("Strapi's Markdown consumer retains ordinary links and formatted content", () => {
  const MarkdownIt = require(
    lockedConsumer("apps/cms", [
      "@strapi/strapi",
      "@strapi/content-manager/strapi-server",
      "markdown-it",
    ]),
  );
  const output = new MarkdownIt({ linkify: true }).render(
    "**Hotend** https://example.invalid/help",
  );
  assert.match(output, /<strong>Hotend<\/strong>/);
  assert.match(output, /href="https:\/\/example.invalid\/help"/);
});
