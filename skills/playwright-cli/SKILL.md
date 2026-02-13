---
name: playwright-cli
description: Token-efficient browser automation CLI for AI coding agents. Use for test generation, code browsing, web scraping, and visual verification when OpenClaw's native browser tool is insufficient.
---

# playwright-cli

Microsoft's CLI for browser automation, optimized for AI agents.

## Installation

```bash
npm install -g @playwright/cli@latest
playwright-cli install --skills
```

## When to Use

- **Test generation**: `playwright-cli codegen` workflows
- **Token-heavy sessions**: Long-running agent tasks where context efficiency matters
- **Visual verification**: Screenshots, PDFs, video recording
- **Network mocking**: Intercept and modify HTTP requests
- **Complex interactions**: Drag-drop, file uploads, multi-tab management

## Core Commands

### Navigation
```bash
playwright-cli open <url> [--headed]
playwright-cli goto <url>
playwright-cli go-back
playwright-cli go-forward
playwright-cli reload
```

### Interactions
```bash
playwright-cli click <ref>
playwright-cli dblclick <ref>
playwright-cli type <text>
playwright-cli fill <ref> <text>
playwright-cli hover <ref>
playwright-cli check <ref>
playwright-cli uncheck <ref>
playwright-cli select <ref> <val>
playwright-cli drag <startRef> <endRef>
playwright-cli upload <file>
playwright-cli press <key>           # e.g., "enter", "arrowdown"
playwright-cli keydown <key>
playwright-cli keyup <key>
```

### Keyboard & Mouse
```bash
playwright-cli mousemove <x> <y>
playwright-cli mousedown [button]
playwright-cli mouseup [button]
playwright-cli mousewheel <dx> <dy>
playwright-cli resize <width> <height>
```

### Snapshots & Elements
```bash
playwright-cli snapshot [--filename=<file>]   # Get element reference
playwright-cli eval <func> [ref]            # Run JS expression
```

### Screenshots & PDF
```bash
playwright-cli screenshot [ref] [--filename=<file>]
playwright-cli pdf [--filename=<file>.pdf]
```

### Dialogs
```bash
playwright-cli dialog-accept [prompt]
playwright-cli dialog-dismiss
```

### Storage
```bash
playwright-cli state-save [filename]
playwright-cli state-load <filename>
playwright-cli cookie-list [--domain]
playwright-cli cookie-set <name> <val>
playwright-cli cookie-delete <name>
playwright-cli localstorage-list
playwright-cli localstorage-set <k> <v>
playwright-cli sessionstorage-clear
```

### Network
```bash
playwright-cli route <pattern> [opts]   # Mock requests
playwright-cli route-list
playwright-cli unroute [pattern]
```

### Tabs
```bash
playwright-cli tab-list
playwright-cli tab-new [url]
playwright-cli tab-select <index>
playwright-cli tab-close [index]
```

### Sessions
```bash
playwright-cli list                    # List all sessions
playwright-cli -s=<name> <cmd>        # Run in named session
playwright-cli close-all
playwright-cli kill-all
```

### Tracing & Video
```bash
playwright-cli tracing-start
playwright-cli tracing-stop
playwright-cli video-start
playwright-cli video-stop [filename]
```

### DevTools
```bash
playwright-cli console [min-level]
playwright-cli network
playwright-cli run-code <code>
```

## Environment Variables

```bash
PLAYWRIGHT_CLI_SESSION=<name>          # Use named session
PLAYWRIGHT_MCP_BROWSER=chrome|firefox|webkit
PLAYWRIGHT_MCP_HEADLESS=false          # Headed mode
PLAYWRIGHT_MCP_VIEWPORT_SIZE=1280x720
PLAYWRIGHT_MCP_TIMEOUT_ACTION=5000
PLAYWRIGHT_MCP_TIMEOUT_NAVIGATION=60000
```

## Configuration

Create `playwright-cli.json` in project root for persistent config:

```json
{
  "browser": {
    "browserName": "chromium",
    "launchOptions": {
      "headless": false
    }
  },
  "outputDir": "./playwright-output",
  "console": {
    "level": "info"
  },
  "timeouts": {
    "action": 5000,
    "navigation": 60000
  }
}
```

## Tips

1. **Install skills**: Run `playwright-cli install --skills` in project root so agents auto-discover commands
2. **Headed mode**: Add `--headed` to `open` for visual debugging
3. **Persistent sessions**: Use `-s=<name>` for project-specific browser state
4. **Element refs**: Use `snapshot` to get reference IDs for subsequent commands
5. **Token efficiency**: playwright-cli sends minimal data vs full DOM snapshots
