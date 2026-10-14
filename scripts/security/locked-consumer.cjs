const { createRequire } = require("node:module")
const path = require("node:path")

// Follow a real workspace consumer, never an unreferenced package-store copy.
function lockedConsumer(workspace, chain) {
  const root = path.resolve(__dirname, "../..")
  let resolver = createRequire(path.join(root, workspace, "package.json"))
  let file
  for (const name of chain) {
    file = resolver.resolve(name)
    resolver = createRequire(file)
  }
  return file
}

module.exports = { lockedConsumer }
