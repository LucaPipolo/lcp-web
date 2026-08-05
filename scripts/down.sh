#!/bin/bash
# scripts/down.sh — Stop this checkout's dev environment.
#
# Stops this checkout's containers and removes its route. The router itself is
# stopped only once no route is left registered, so sibling worktrees keep
# serving.
#
# Usage:
#   ./scripts/down.sh [--verbose|-v]

ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [[ -z "$ROOT" ]]; then
    printf "\n  \033[31m✗\033[0m  Not inside a git checkout.\n\n" >&2
    exit 1
fi
cd "$ROOT" || exit 1

source "$ROOT/scripts/lib.sh"

LOG_FILE="/tmp/${BASE_NAME}-down-$$.log"

trap 'stop_spin; printf "\n"; exit 130' INT TERM

# ─── Steps ───────────────────────────────────────────────────────────────────

# Remove a checkout's route from the router
deregister_route() {
    router_running || return 1
    curl -sf "${ROUTER_ADMIN}/id/$1" >/dev/null 2>&1 || return 1
    run curl -sf -X DELETE "${ROUTER_ADMIN}/id/$1" || return 2
}

# Stop the router once no checkout is left using it
stop_router_if_idle() {
    router_running || return 1

    local routes
    routes=$(registered_routes)
    [[ "$routes" != "[]" && "$routes" != "null" && -n "$routes" ]] && return 1

    run docker stop "$ROUTER_CONTAINER" || return 2
}

# ─── Main ────────────────────────────────────────────────────────────────────

COMPOSE_NAME=$(compose_name)

header

step "Stopping containers"
run docker compose down
[[ $? -ne 0 ]] && fail
ok

step "Deregistering route"
deregister_route "$COMPOSE_NAME"
case $? in 0) ok ;; 1) skip "nothing registered" ;; *) fail ;; esac

step "Stopping router"
stop_router_if_idle
case $? in 0) ok ;; 1) skip "still in use" ;; *) fail ;; esac

printf "\n  \033[32m✓\033[0m  stopped\n\n"
