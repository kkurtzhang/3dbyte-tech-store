import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { handleLocalKnowledgeChat } from "../../src/app/api/ai-shopping-assistant/local-knowledge-chat";

type CoverageCase = { id: string; questions: string[] };
const reportPath = process.env.LOCAL_COVERAGE_ROUTE_REPORT;
const casesPath =
  process.env.LOCAL_COVERAGE_CASES ||
  path.resolve(
    __dirname,
    "../../../../scripts/local-knowledge/evaluation/customer-coverage-cases-v1.json",
  );
const offlineDescribe = reportPath ? describe : describe.skip;

offlineDescribe(
  "actual chat route with offline persisted Python retrieval",
  () => {
    it("captures frozen customer cases without a listening service or model", async () => {
      const savedEnv = process.env;
      const savedFetch = global.fetch;
      const captures: Array<{
        id: string;
        questions: string[];
        status: number;
        stream: string;
      }> = [];
      try {
        process.env = {
          ...savedEnv,
          NODE_ENV: "development",
          AI_ASSISTANT_LOCAL_KNOWLEDGE: "1",
        };
        global.fetch = jest.fn(async (input) => {
          const url = new URL(String(input));
          expect(url.origin).toBe("http://127.0.0.1:8873");
          expect(url.pathname).toBe("/api/search");
          const result = spawnSync(
            "/opt/homebrew/bin/python3",
            [
              "-B",
              path.resolve(
                __dirname,
                "../../../../scripts/local-knowledge/offline_retrieval_bridge.py",
              ),
            ],
            {
              input: JSON.stringify({
                question: url.searchParams.get("q"),
                group: url.searchParams.get("group"),
              }),
              encoding: "utf8",
              timeout: 10000,
              maxBuffer: 300000,
              env: {
                ...process.env,
                PYTHONDONTWRITEBYTECODE: "1",
                PYTHONNOUSERSITE: "1",
                OPENBLAS_NUM_THREADS: "1",
                VECLIB_MAXIMUM_THREADS: "1",
              },
            },
          );
          expect(result.status).toBe(0);
          return Response.json(JSON.parse(result.stdout));
        });
        const cases: CoverageCase[] = JSON.parse(
          fs.readFileSync(casesPath, "utf8"),
        ).cases;
        for (const item of cases) {
          const response = await handleLocalKnowledgeChat(
            new Request("http://127.0.0.1:3005/api/ai-shopping-assistant", {
              method: "POST",
              headers: {
                host: "127.0.0.1:3005",
                origin: "http://127.0.0.1:3005",
              },
              body: JSON.stringify({
                messages: item.questions.map((question) => ({
                  role: "user",
                  content: question,
                })),
              }),
            }),
          );
          const stream = await response.text();
          if (response.status === 200) expect(stream).toContain("text-delta");
          captures.push({
            id: item.id,
            questions: item.questions,
            status: response.status,
            stream,
          });
        }
        fs.writeFileSync(
          reportPath!,
          JSON.stringify(
            {
              casesPath,
              captures,
              transport: "offline subprocess; no socket or model",
            },
            null,
            2,
          ) + "\n",
          { flag: "wx" },
        );
        if (process.env.LOCAL_COVERAGE_BASELINE !== "1")
          for (const captured of captures) expect(captured.status).toBe(200);
      } finally {
        process.env = savedEnv;
        global.fetch = savedFetch;
      }
    }, 45000);
  },
);
