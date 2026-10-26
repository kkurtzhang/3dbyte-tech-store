export function AssistantSourceLinks({
  parts,
}: {
  parts?: Array<Record<string, unknown>>;
}) {
  const sources = (parts || []).flatMap((part) => {
    if (part.type !== "source-url" || typeof part.url !== "string") return [];
    try {
      const url = new URL(part.url);
      if (url.protocol !== "https:" || url.username || url.password) return [];
      return [
        {
          url: url.href,
          title: typeof part.title === "string" ? part.title : url.hostname,
        },
      ];
    } catch {
      return [];
    }
  });
  const grouped = new Map<string, { url: string; titles: string[] }>();
  for (const source of sources) {
    const previous = grouped.get(source.url);
    grouped.set(source.url, {
      url: source.url,
      titles: Array.from(new Set([...(previous?.titles ?? []), source.title])),
    });
  }
  const unique = Array.from(grouped.values());
  if (!unique.length) return null;
  return (
    <nav
      aria-label="Evidence sources"
      className="mt-3 border-t border-border pt-2"
    >
      <p className="text-xs font-medium">Sources</p>
      <ul className="space-y-1 text-xs">
        {unique.map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {source.titles.join(" / ")}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
