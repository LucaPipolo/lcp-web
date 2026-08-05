#!/bin/sh
# .husky/require-container.sh — Aborts the commit unless this checkout's app
# container is running.

cd "$(git rev-parse --show-toplevel)" || exit 1

if ! docker compose ps --status running --services 2>/dev/null | grep -qx app; then
    project=$(grep -E '^COMPOSE_PROJECT_NAME=' .env 2>/dev/null | head -1 | cut -d '=' -f 2-)

    echo "" >&2
    echo "  Commit aborted. The app container of this checkout is not running." >&2
    echo "" >&2
    echo "    Container   ${project:-app}-app-1" >&2
    echo "    Start it    ./scripts/up.sh" >&2
    echo "" >&2
    echo "  The hooks run their checks inside that container, so they never" >&2
    echo "  fall back to the host and never skip." >&2
    echo "" >&2
    exit 1
fi
