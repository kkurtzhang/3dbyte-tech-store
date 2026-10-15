const path = require("node:path");
module.exports = {
 testDir:__dirname, testMatch:"pilot-document-sync.spec.cjs", workers:1, fullyParallel:false,
 outputDir:process.env.THREEDBYTE_ARTIFACTS_DIR ? path.join(process.env.THREEDBYTE_ARTIFACTS_DIR,"browser-tests") : path.join(__dirname,"test-results/pilot-sync"),
 use:{baseURL:"http://127.0.0.1:5201",viewport:{width:1280,height:1000},screenshot:"only-on-failure"},
 webServer:{command:"pnpm --filter @3dbyte-tech-store/backend exec vite --config integration-tests/admin/pilot-sync-fixture/vite.config.cjs",cwd:path.resolve(__dirname,"../../../.."),url:"http://127.0.0.1:5201",reuseExistingServer:false},
};
