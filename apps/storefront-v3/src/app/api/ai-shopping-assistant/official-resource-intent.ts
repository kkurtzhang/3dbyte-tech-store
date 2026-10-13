export function officialResourceRequested(question: string): boolean {
  return /\bfaq\b|frequently asked|\bbuild guide\b|\bassembly (?:guide|steps|instructions)\b|\b(?:official|public) (?:guide|presentation|manual)\b|\b(?:how|where)\b.*\b(?:build|assemble|guide|manual)\b|\blink\b.*\b(?:guide|manual|presentation)\b/i.test(
    question,
  );
}
