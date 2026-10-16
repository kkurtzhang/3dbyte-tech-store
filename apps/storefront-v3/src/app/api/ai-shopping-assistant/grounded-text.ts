/** Keep approved/backend text inert in the drawer's small Markdown subset. */
export function plainMarkdown(value: string) {
  return value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[\\`*_{}\[\]<>#!|~]/g, "\\$&")
}
