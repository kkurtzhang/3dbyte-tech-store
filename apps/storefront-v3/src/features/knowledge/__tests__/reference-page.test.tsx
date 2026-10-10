import { render, screen } from "@testing-library/react";
import ReferencesPage from "../../../app/references/page";
import { loadReferencePage } from "../load-references";
jest.mock("../load-references", () => ({ loadReferencePage: jest.fn() }));
jest.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not found");
  },
}));
const environment = process.env.APP_ENV;
afterEach(() => {
  if (environment === undefined) delete process.env.APP_ENV;
  else process.env.APP_ENV = environment;
  jest.resetAllMocks();
});
it("renders accessible search and preserves its term on the next reference page", async () => {
  process.env.APP_ENV = "staging";
  (loadReferencePage as jest.Mock).mockResolvedValue({
    references: [],
    next_offset: 4,
  });
  render(
    await ReferencesPage({
      searchParams: Promise.resolve({ q: "Printer & One" }),
    }),
  );
  expect(
    screen.getByRole("searchbox", { name: "Search approved references" }),
  ).toHaveValue("Printer & One");
  expect(
    screen.getByRole("button", { name: "Search references" }),
  ).toHaveAttribute("type", "submit");
  expect(screen.getByRole("link", { name: "Next references" })).toHaveAttribute(
    "href",
    "/references?offset=4&q=Printer%20%26%20One",
  );
  expect(loadReferencePage).toHaveBeenCalledWith(0, "Printer & One");
});
it("shows a safe unavailable state for a failed search service", async () => {
  process.env.APP_ENV = "staging";
  (loadReferencePage as jest.Mock).mockRejectedValue(
    new Error("private details"),
  );
  render(
    await ReferencesPage({ searchParams: Promise.resolve({ q: "Printer" }) }),
  );
  expect(
    screen.getByText(/References are temporarily unavailable/),
  ).toBeInTheDocument();
  expect(screen.queryByText("private details")).not.toBeInTheDocument();
});
it("hides non-staging and rejects oversized parameters before loading", async () => {
  process.env.APP_ENV = "production";
  await expect(
    ReferencesPage({ searchParams: Promise.resolve({}) }),
  ).rejects.toThrow("not found");
  process.env.APP_ENV = "staging";
  await expect(
    ReferencesPage({ searchParams: Promise.resolve({ q: "x".repeat(121) }) }),
  ).rejects.toThrow("not found");
  expect(loadReferencePage).not.toHaveBeenCalled();
});
