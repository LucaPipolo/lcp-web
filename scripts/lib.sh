#!/bin/bash
# scripts/lib.sh — Helpers shared by setup.sh, up.sh, and down.sh.
#
# Sourced, never executed. The sourcing script has already changed into the
# root of its own checkout, so every path here is relative to it.

# ─── Settings ────────────────────────────────────────────────────────────────

# Read a key from .env
env_value() {
    [[ -f .env ]] || return 1
    local value
    value=$(grep -E "^$1=" .env | head -1 | cut -d'=' -f2-)
    [[ -n "$value" ]] || return 1
    echo "$value"
}

# Read a key from .env, falling back to .env.example
project_setting() {
    env_value "$1" && return 0
    [[ -f .env.example ]] || return 1
    local value
    value=$(grep -E "^$1=" .env.example | head -1 | cut -d'=' -f2-)
    [[ -n "$value" ]] || return 1
    echo "$value"
}

# Stop on a missing setting
missing_setting() {
    printf "\n  \033[31m✗\033[0m  %s is set in neither .env nor .env.example.\n\n" "$1" >&2
    exit 1
}

BASE_NAME=$(project_setting BASE_NAME) || missing_setting BASE_NAME
BASE_DOMAIN=$(project_setting BASE_DOMAIN) || missing_setting BASE_DOMAIN
ROUTER_NAME=$(project_setting ROUTER_NAME) || missing_setting ROUTER_NAME
CONTAINER_PORT=$(project_setting CONTAINER_PORT) || missing_setting CONTAINER_PORT

# The container, the network and the volumes all share one name
ROUTER_IMAGE="caddy:latest"
ROUTER_ADMIN="http://localhost:2019"
ROUTER_CONTAINER="$ROUTER_NAME"
ROUTER_NETWORK="$ROUTER_NAME"
ROUTER_DATA_VOLUME="${ROUTER_NAME}-data"
ROUTER_CONFIG_VOLUME="${ROUTER_NAME}-config"
CA_CERT_FILENAME="${BASE_NAME}-caddy-ca.crt"

VERBOSE=false
for _arg in "$@"; do
    [[ "$_arg" == "--verbose" || "$_arg" == "-v" ]] && VERBOSE=true
done

# ─── UI ──────────────────────────────────────────────────────────────────────

STEP_LABEL=""
SPIN_PID=""

# Animate the spinner
_spin_loop() {
    local frames=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
    local i=0
    while true; do
        printf "\r  %s  %-42s" "${frames[$((i++ % 10))]}" "$STEP_LABEL"
        sleep 0.08
    done
}

# Stop the spinner
stop_spin() {
    [[ -z "$SPIN_PID" ]] && return
    kill "$SPIN_PID" 2>/dev/null
    wait "$SPIN_PID" 2>/dev/null
    SPIN_PID=""
}

# Start a step
step() {
    stop_spin
    STEP_LABEL="$1"
    if [[ "$VERBOSE" == "true" ]]; then
        printf "\n  \033[2m▸\033[0m  %s\n" "$1"
    else
        printf "  ·  %-42s" "$1"
        _spin_loop &
        SPIN_PID=$!
    fi
}

# Close a step with its outcome
_result() {
    local icon="$1" color="$2" note="$3"
    stop_spin
    local cr='\r'
    [[ "$VERBOSE" == "true" ]] && cr=''
    printf "${cr}  ${color}${icon}\033[0m  %-42s \033[2m%s\033[0m\n" "$STEP_LABEL" "$note"
}

# End the step as done
ok() { _result "✓" "\033[32m" "${1:-}"; }

# End the step as skipped
skip() { _result "–" "\033[2m" "${1:-}"; }

# End the step as failed and stop the script
fail() {
    _result "✗" "\033[31m" "${1:-}"
    [[ "$VERBOSE" == "false" ]] && printf "\n  \033[2mLog: %s\033[0m\n\n" "$LOG_FILE"
    exit 1
}

# Run a command, sending its output to the log unless --verbose
run() {
    if [[ "$VERBOSE" == "true" ]]; then
        "$@"
    else
        "$@" >> "$LOG_FILE" 2>&1
    fi
}

# Print the banner, once
header() {
    [[ -n "$DEV_ENV_HEADER_SHOWN" ]] && return
    export DEV_ENV_HEADER_SHOWN=1
    printf "\n  \033[1m%s\033[0m  dev environment" "$BASE_NAME"
    [[ "$VERBOSE" == "false" ]] && printf "  \033[2m--verbose for details\033[0m"
    printf "\n\n"
}

# ─── Checkout ────────────────────────────────────────────────────────────────

# Name this checkout from git
derive_compose_name() {
    local common_dir root
    common_dir=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null) || return 1
    root=$(git rev-parse --show-toplevel 2>/dev/null) || return 1

    if [[ "$root" == "$(dirname "$common_dir")" ]]; then
        echo "$BASE_NAME"
    else
        echo "${BASE_NAME}-$(basename "$root" | sed 's/[^a-zA-Z0-9._-]/-/g')"
    fi
}

# Return the domain a checkout is served at
domain_for() {
    if [[ "$1" == "$BASE_NAME" ]]; then
        echo "$BASE_DOMAIN"
    else
        echo "${1#"${BASE_NAME}"-}.${BASE_DOMAIN}"
    fi
}

# Return this checkout's Compose project name
compose_name() {
    env_value COMPOSE_PROJECT_NAME || derive_compose_name
}

# ─── Router ──────────────────────────────────────────────────────────────────

# Check whether the router is running
router_running() {
    docker ps --format '{{.Names}}' | grep -q "^${ROUTER_CONTAINER}$"
}

# Print whichever container holds ports 80 and 443
port_holder() {
    docker ps --format '{{.Names}}\t{{.Ports}}' | grep -E ':(80|443)->' | cut -f1 | head -1
}

# Explain a port conflict
report_port_conflict() {
    printf "\n  \033[33m┌─ notice\033[0m\n"
    printf "  \033[33m│\033[0m  \033[1m%s\033[0m already holds ports 80 and 443, which this\n" "$1"
    printf "  \033[33m│\033[0m  project's router needs. Stop it first, then try again:\n"
    printf "  \033[33m│\033[0m\n"
    printf "  \033[33m│\033[0m    docker stop %s\n" "$1"
    printf "  \033[33m└\033[0m\n\n"
}

# List every route registered with the router
registered_routes() {
    curl -s "${ROUTER_ADMIN}/config/apps/http/servers/main/routes" 2>/dev/null
}
