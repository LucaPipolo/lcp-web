#!/bin/bash
# scripts/setup.sh — Prepare this checkout, then start its dev environment.
#
# Writes the .env this checkout needs and hands over to up.sh. Idempotent, and
# safe to re-run. Once the CA is trusted it needs no interactive input.
#
# Usage:
#   ./scripts/setup.sh [--verbose|-v]

ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [[ -z "$ROOT" ]]; then
    printf "\n  \033[31m✗\033[0m  Not inside a git checkout.\n\n" >&2
    exit 1
fi
cd "$ROOT" || exit 1

source "$ROOT/scripts/lib.sh"

LOG_FILE="/tmp/${BASE_NAME}-setup-$$.log"

trap 'stop_spin; printf "\n"; exit 130' INT TERM

# ─── Steps ───────────────────────────────────────────────────────────────────

# Check whether a host port is free for this checkout
port_available() {
    lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1 || return 0
    docker ps --filter "name=^${COMPOSE_NAME}-app-1$" --format '{{.Ports}}' 2>/dev/null \
        | grep -q ":$1->"
}

# Pick the host port, keeping the current one when it still works
resolve_app_port() {
    local current port
    current=$(env_value APP_PORT)
    if [[ -n "$current" ]] && port_available "$current"; then
        echo "$current"
        return 0
    fi

    port="$CONTAINER_PORT"
    while ((port < 65536)); do
        if port_available "$port"; then
            echo "$port"
            return 0
        fi
        ((port++))
    done
    return 1
}

# Write a key into .env, replacing it when already there
set_env_var() {
    if grep -qE "^$1=" .env; then
        _key="$1" _value="$2" awk '
            index($0, ENVIRON["_key"] "=") == 1 {
                print ENVIRON["_key"] "=" ENVIRON["_value"]
                next
            }
            { print }
        ' .env > .env.tmp && mv .env.tmp .env
    else
        printf '%s=%s\n' "$1" "$2" >> .env
    fi
}

# Create or update this checkout's .env
write_env_file() {
    local created=false app_port

    if [[ ! -f .env ]]; then
        created=true
        if [[ "$MAIN_ROOT" != "$ROOT" && -f "$MAIN_ROOT/.env" ]]; then
            run cp "$MAIN_ROOT/.env" .env || return 2
        elif [[ -f .env.example ]]; then
            run cp .env.example .env || return 2
        else
            return 2
        fi
    fi

    app_port=$(resolve_app_port) || return 2

    set_env_var COMPOSE_PROJECT_NAME "$COMPOSE_NAME" || return 2
    set_env_var GIT_COMMON_DIR "$GIT_COMMON_DIR" || return 2
    set_env_var APP_PORT "$app_port" || return 2

    set_env_var BASE_NAME "$BASE_NAME" || return 2
    set_env_var BASE_DOMAIN "$BASE_DOMAIN" || return 2
    set_env_var ROUTER_NAME "$ROUTER_NAME" || return 2
    set_env_var CONTAINER_PORT "$CONTAINER_PORT" || return 2

    [[ "$created" == "true" ]] && return 0
    return 1
}

# ─── Main ────────────────────────────────────────────────────────────────────

COMPOSE_NAME=$(derive_compose_name)
if [[ -z "$COMPOSE_NAME" ]]; then
    printf "\n  \033[31m✗\033[0m  Could not derive the project name from git.\n\n" >&2
    exit 1
fi

GIT_COMMON_DIR=$(git rev-parse --path-format=absolute --git-common-dir)
MAIN_ROOT=$(dirname "$GIT_COMMON_DIR")

header

step "Writing .env for ${COMPOSE_NAME}"
write_env_file
case $? in 0) ok "created" ;; 1) ok "updated" ;; *) fail "could not write" ;; esac

exec "$ROOT/scripts/up.sh" "$@"
