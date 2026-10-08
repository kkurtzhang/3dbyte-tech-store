# Braces removal decision — 8 October 2026

The remaining required security check cannot be fixed by upgrading or removing Changesets alone. Two isolated lockfile experiments confirm that the high `GHSA-vfj7-8cjw-p6xm` finding remains after either change, with no audit exception, renamed vulnerable package or scanner modification. Neither partial migration was applied to the release candidates.

## Exact dependency evidence

The reviewed security HEAD is `11af17d6972e675788feb9cc19b34ae0a54a0ad2`. Its lock has 19 consumer snapshots with a direct `micromatch` or `braces` dependency. These include peer-context duplicates; they are not 19 separate vulnerabilities. There are two immediate braces parents: `micromatch@4.0.8` and `chokidar@3.6.0`.

Representative independent paths are:

- root Changesets CLI 2.29.8 → config 3.1.2 / git 3.0.4 → micromatch 4.0.8 → braces 3.0.3;
- root Jest type definitions → expect → jest-message-util → micromatch → braces;
- Jest 30.2.0 → core/config/transform/haste-map/message utilities → micromatch → braces;
- Strapi 5.48.1 → chokidar 3.6.0 → braces, and content-type-builder → micromatch → braces;
- Medusa Admin tooling / Tailwind 3.4.17 → chokidar 3.6.0 → braces;
- Medusa/Awilix and other tooling → fast-glob 3.3.3 → micromatch → braces.

The raw audit shows one representative path per advisory. Its Changesets path was not evidence that Changesets was the only consumer. The existing local depth/cycle mitigation tests remain valid, but do not satisfy the unmodified package-advisory gate.

## Official supported options checked

Official npm registry metadata was captured at 21:11–21:12 UTC with SHA-256 digests. [Changesets CLI 3.0.3](https://github.com/changesets/changesets/releases/tag/%40changesets%2Fcli%403.0.3) uses config/git 4.0.1, which use picomatch instead of micromatch. Its published Node requirement is `^22.11 || ^24 || >=26`. Isolated task Node 22.22.1 and pnpm 10.32.1 satisfy this; no global Node installation or system setting changed. A real adoption would also align Node-20 CI jobs and backend Docker build stages with supported tooling. The repository's `.node-version` already specifies 22.22.1.

The isolated upgrade resolves successfully and removes two consumer snapshots, leaving 17. The raw audit is still **0 critical / 1 high / 47 moderate / 8 low**, now reporting the Jest-type path. A second isolated experiment removes Changesets entirely and its three release scripts; that audit has the same counts and path. These temporary experiments do not remove the user's repository release commands.

Current registry latest versions include Jest 30.5.2, Medusa 2.21.2, Tailwind 4.3.3 and Strapi 5.57.0. Updating all such packages would still not remove braces: latest [Strapi](https://registry.npmjs.org/@strapi/strapi/latest) pins chokidar 3.6.0, latest [content-type-builder](https://registry.npmjs.org/@strapi/content-type-builder/latest) requires micromatch 4.0.8, and latest [fast-glob](https://registry.npmjs.org/fast-glob/latest) requires micromatch 4.0.8. Latest [micromatch](https://registry.npmjs.org/micromatch/latest) remains 4.0.8 and requires braces 3.0.3; latest [braces](https://registry.npmjs.org/braces/latest) remains 3.0.3. No official patched braces release is available.

Forcing chokidar 4/5 over existing version-3 consumers is not a supported compatibility fix: [upstream removed glob support in version 4](https://github.com/paulmillr/chokidar#upgrading). Replacing micromatch with picomatch via an alias is also incompatible: callers use list matching and micromatch-specific APIs, whereas picomatch's main API returns a matcher. Both changes need consumer adaptations and tests. The [upstream braces fix PR #72](https://github.com/micromatch/braces/pull/72) is closed and unmerged; it is not a published fixed dependency.

## Release and owner decision

No bounded, complete, supported dependency-only migration was found. A full solution requires either a published upstream fix, supported upstream migrations for the remaining consumers, or an explicitly owned and reviewed fork/consumer-adaptation programme. A maintained fork is a new security maintenance responsibility; merely changing the affected package's name/version to make the scanner green is not an acceptable fix. Broad framework/CSS/watch changes should have a separate concrete scope and compatibility review rather than be hidden in these release candidates.

Draft PRs [#235](https://github.com/kkurtzhang/3dbyte-tech-store/pull/235) and [#236](https://github.com/kkurtzhang/3dbyte-tech-store/pull/236) remain blocked by the required raw scan. No exception, merge, deployment or native business-data application occurred. Global/system configuration was not altered.

Independent native verification progressed while the dependency gate remained blocked:

- six PostgreSQL-backed Medusa pricing cases confirm all four gross major-unit AUD amounts with explicit native currency inclusion, the default non-inclusive state, and conflicting region-preference precedence;
- six unchanged startup-guard cases against actual PostgreSQL confirm product and inventory marker rejection in production and staging origin/test-key checks;
- a seeded Strapi HTTP check confirms unpublished rejection, a published exact DTO with an unknown fact and no private-field leak, wrong identity/revision and broad-query rejection, verified full-access private lookup, and invalidation after content changes.

These use isolated synthetic fixture databases, not retailer/native business approvals. A synthetic 10% calculation rate is a test input, not a verified live GST configuration. Linux PostgreSQL starts successfully. Linux Node 20 containers stall in `Created` before a process starts, even for a basic Node command; after bounded diagnostics, only the task's unstarted fixture containers were removed. Full Linux app/container and combined seeded storefront/commerce E2E are not claimed.

The eventual owner gate remains independent source review and approval of the exact native product/variant/document revisions. Hotend maximum operating temperature and exact AU dryer voltage remain unknown. Native offer activation additionally needs the effective AUD/region tax preferences verified and a separately tested activation path. Existing exact source price captures and simulated quantities are unchanged.
