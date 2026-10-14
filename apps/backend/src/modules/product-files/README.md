# Entitled product downloads

The active-file and claimed customer/product registration checks run before the
Medusa file service is asked for a URL. Missing or blank URLs never fall back to
the private file key.

The configured S3 provider returns SigV4 URLs. `X-Amz-Date` and `X-Amz-Expires`
are the source for response `expires_in`: remaining whole seconds, rounded down
at response creation. The signed URL itself is returned unchanged. The existing
Medusa S3 default remains 3,600 seconds; elapsed signing time can make the response
slightly lower. A different valid `download_file_duration` automatically changes
the response through the returned URL, without a second TTL setting.

No file-provider option, environment variable, storage policy or credential is
changed by this response calculation. Missing/ambiguous/invalid timing metadata,
expired URLs, and future-dated signatures fail closed with a generic error.
The parser reads timing from the trusted configured provider; it does not replace
the entitlement checks or authenticate arbitrary caller-supplied URLs. A future
non-SigV4 provider needs an explicit expiry adapter instead of a guessed fallback.

Tests call the installed Medusa S3 provider with a mocked signer for the unchanged
default and alternative fixture-only durations. Synthetic URL timing parameters
are returned by the mock; no real signatures or storage requests are generated.
