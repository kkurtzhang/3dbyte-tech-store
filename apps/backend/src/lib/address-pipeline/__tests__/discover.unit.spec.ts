import { s3ToHttps, validateDownloadUrl } from "../discover";

describe("s3ToHttps", () => {
  it("converts a valid S3 URL to HTTPS", () => {
    const s3Url =
      "s3://v2.openaddresses.io/batch-prod/job/819507/source.geojson.gz";
    const result = s3ToHttps(s3Url);

    expect(result).toBe(
      "https://v2.openaddresses.io/batch-prod/job/819507/source.geojson.gz"
    );
  });

  it("handles S3 URLs with different bucket names", () => {
    const result = s3ToHttps("s3://my-bucket/path/to/file.txt");

    expect(result).toBe(
      "https://my-bucket/path/to/file.txt"
    );
  });

  it("throws on invalid S3 URL format", () => {
    expect(() => s3ToHttps("https://not-an-s3-url.com/file.txt")).toThrow(
      "Invalid S3 URL format"
    );
  });

  it("throws on empty string", () => {
    expect(() => s3ToHttps("")).toThrow("Invalid S3 URL format");
  });

  it("throws on s3:// with no key", () => {
    expect(() => s3ToHttps("s3://bucket-only")).toThrow(
      "Invalid S3 URL format"
    );
  });
});

describe("validateDownloadUrl", () => {
  it("allows HTTPS download URLs", () => {
    expect(
      validateDownloadUrl(
        "https://v2.openaddresses.io/batch/source.geojson.gz"
      )
    ).toBe(
      "https://v2.openaddresses.io/batch/source.geojson.gz"
    );
  });

  it("rejects non-HTTP protocols", () => {
    expect(() => validateDownloadUrl("file:///etc/passwd")).toThrow(
      "OpenAddresses download URL must use http or https"
    );
  });

  it("rejects malformed URLs", () => {
    expect(() => validateDownloadUrl("not a url")).toThrow(
      "Invalid OpenAddresses download URL"
    );
  });
});
