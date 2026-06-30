#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/resolve-deploy-scope.sh <base-ref> [head-ref]

Prints one deployment scope for the changed files:
  storefront  Storefront-only rebuild/recreate is enough
  backend     Medusa server + worker rebuild/recreate is enough
  cms         Strapi CMS rebuild/recreate is enough
  all         Multiple app scopes or shared deployment files changed
  none        Docs-only or no deployable files changed
EOF
}

base_ref="${1:-}"
head_ref="${2:-HEAD}"

if [ -z "$base_ref" ]; then
  usage >&2
  exit 2
fi

map_file_to_scope() {
  local path="$1"

  case "$path" in
    apps/storefront-v3/* | apps/storefront-v3/Dockerfile)
      echo "storefront"
      ;;
    apps/backend/* | docker/backend/*)
      echo "backend"
      ;;
    apps/cms/* | docker/cms/*)
      echo "cms"
      ;;
    .github/* | docs/* | deploy/* | README.md | AGENTS.md | CLAUDE.md | PROJECT.md)
      echo "none"
      ;;
    package.json | pnpm-lock.yaml | pnpm-workspace.yaml | turbo.json | .dockerignore | .node-version | .nvmrc | docker-compose.yml | docker/postgres/* | packages/*)
      echo "all"
      ;;
    *)
      echo "all"
      ;;
  esac
}

changed_files="$(git diff --name-only "$base_ref" "$head_ref")"

if [ -z "$changed_files" ]; then
  echo "none"
  exit 0
fi

scopes="$(
  while IFS= read -r path; do
    [ -z "$path" ] && continue
    map_file_to_scope "$path"
  done <<EOF | sort -u
$changed_files
EOF
)"

if printf '%s\n' "$scopes" | grep -qx 'all'; then
  echo "all"
  exit 0
fi

deploy_scopes="$(printf '%s\n' "$scopes" | grep -vx 'none' || true)"

if [ -z "$deploy_scopes" ]; then
  echo "none"
  exit 0
fi

if [ "$(printf '%s\n' "$deploy_scopes" | wc -l | xargs)" -eq 1 ]; then
  printf '%s\n' "$deploy_scopes"
else
  echo "all"
fi
