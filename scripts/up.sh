#!/bin/bash
# scripts/up.sh — Start this checkout's dev environment.
#
# Brings up the shared Caddy router, registers this checkout's route, and
# starts its containers.
#
# Usage:
#   ./scripts/up.sh [--verbose|-v]

ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [[ -z "$ROOT" ]]; then
    printf "\n  \033[31m✗\033[0m  Not inside a git checkout.\n\n" >&2
    exit 1
fi
cd "$ROOT" || exit 1

source "$ROOT/scripts/lib.sh"

LOG_FILE="/tmp/${BASE_NAME}-up-$$.log"
CA_CERT="/tmp/${BASE_NAME}-caddy-ca-$$.crt"

trap 'stop_spin; printf "\n"; exit 130' INT TERM
trap 'rm -f "$CA_CERT"' EXIT

# ─── Steps ───────────────────────────────────────────────────────────────────

# Create the network the router and every checkout share
ensure_router_network() {
    docker network ls --format '{{.Name}}' | grep -q "^${ROUTER_NETWORK}$" && return 1
    run docker network create "$ROUTER_NETWORK"
}

# Start the shared router container
ensure_router_running() {
    router_running && return 1

    # Re-checked here in case something grabbed the ports since the pre-flight.
    PORT_HOLDER=$(port_holder)
    [[ -n "$PORT_HOLDER" ]] && return 3

    if docker ps -a --format '{{.Names}}' | grep -q "^${ROUTER_CONTAINER}$"; then
        run docker start "$ROUTER_CONTAINER" || return 2
    else
        run docker run -d \
            --name "$ROUTER_CONTAINER" \
            --network "$ROUTER_NETWORK" \
            --restart unless-stopped \
            -p 80:80 -p 443:443 -p 443:443/udp -p 2019:2019 \
            -v "${ROUTER_DATA_VOLUME}:/data" \
            -v "${ROUTER_CONFIG_VOLUME}:/config" \
            -e CADDY_ADMIN=0.0.0.0:2019 \
            "$ROUTER_IMAGE" || return 2
    fi

    local retries=30
    until curl -s "${ROUTER_ADMIN}/config/" >/dev/null 2>&1; do
        ((retries-- == 0)) && return 2
        sleep 1
    done
}

# Load the router's base config, which Caddy drops on every restart
ensure_router_config() {
    [[ "$(curl -s "${ROUTER_ADMIN}/config/apps/http/servers/main" 2>/dev/null)" != "null" ]] && return 1

    run curl -sf -X POST "${ROUTER_ADMIN}/load" \
        -H 'Content-Type: application/json' \
        -d "{
            \"apps\": {
                \"http\": {
                    \"servers\": {
                        \"main\": {
                            \"listen\": [\":80\", \":443\"],
                            \"automatic_https\": {\"disable\": true},
                            \"tls_connection_policies\": [{}],
                            \"routes\": []
                        }
                    }
                },
                \"tls\": {
                    \"automation\": {
                        \"policies\": [{\"subjects\": [\"${BASE_DOMAIN}\", \"*.${BASE_DOMAIN}\"], \"issuers\": [{\"module\": \"internal\"}]}]
                    },
                    \"certificates\": {\"automate\": [\"${BASE_DOMAIN}\", \"*.${BASE_DOMAIN}\"]}
                }
            }
        }" || return 2
}

# Register this checkout's route with the router
register_route() {
    curl -sf "${ROUTER_ADMIN}/id/${COMPOSE_NAME}" >/dev/null 2>&1 && return 1

    run curl -sf -X POST "${ROUTER_ADMIN}/config/apps/http/servers/main/routes" \
        -H 'Content-Type: application/json' \
        -d "{
            \"@id\": \"${COMPOSE_NAME}\",
            \"match\": [{\"host\": [\"${DOMAIN}\"]}],
            \"handle\": [{
                \"handler\": \"subroute\",
                \"routes\": [{\"handle\": [{
                    \"handler\": \"reverse_proxy\",
                    \"upstreams\": [{\"dial\": \"${COMPOSE_NAME}-app-1:${CONTAINER_PORT}\"}]
                }]}]
            }],
            \"terminal\": true
        }" || return 2
}

# Copy the router's CA certificate out of the container
extract_ca_cert() {
    docker cp "${ROUTER_CONTAINER}:/data/caddy/pki/authorities/local/root.crt" "$CA_CERT" 2>/dev/null
}

# Check whether this CA is already trusted, matching on its fingerprint
ca_already_trusted() {
    [[ -f "$CA_CERT" ]] || return 1

    local fingerprint
    fingerprint=$(openssl x509 -in "$CA_CERT" -noout -fingerprint -sha256 2>/dev/null | cut -d'=' -f2 | tr -d ':')
    [[ -n "$fingerprint" ]] || return 1

    if [[ "$OSTYPE" == "darwin"* ]]; then
        security find-certificate -a -Z /Library/Keychains/System.keychain 2>/dev/null \
            | grep -qi "SHA-256 hash: ${fingerprint}$"
    else
        [[ -f "/usr/local/share/ca-certificates/${CA_CERT_FILENAME}" ]] \
            && cmp -s "$CA_CERT" "/usr/local/share/ca-certificates/${CA_CERT_FILENAME}"
    fi
}

# Add the router's CA certificate to the system trust store
trust_ca() {
    local retries=15

    until docker exec "$ROUTER_CONTAINER" test -f /data/caddy/pki/authorities/local/root.crt 2>/dev/null; do
        ((retries-- == 0)) && return 2
        sleep 1
    done

    extract_ca_cert || return 3
    ca_already_trusted && return 1

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # Credentials were cached upfront via sudo -v, so this runs silently.
        run sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$CA_CERT" || return 3
    else
        run sudo cp "$CA_CERT" "/usr/local/share/ca-certificates/${CA_CERT_FILENAME}" || return 3
        run sudo update-ca-certificates || return 3
    fi
}

# ─── Main ────────────────────────────────────────────────────────────────────

if [[ ! -f .env ]]; then
    printf "\n  \033[31m✗\033[0m  No .env in this checkout. Run ./scripts/setup.sh first.\n\n" >&2
    exit 1
fi

# Fail on an .env from an older setup.sh before the router is touched
for _key in BASE_NAME BASE_DOMAIN ROUTER_NAME CONTAINER_PORT \
             COMPOSE_PROJECT_NAME APP_PORT GIT_COMMON_DIR; do
    if ! env_value "$_key" >/dev/null; then
        printf "\n  \033[31m✗\033[0m  .env has no %s. Run ./scripts/setup.sh to update it.\n\n" "$_key" >&2
        exit 1
    fi
done

COMPOSE_NAME=$(compose_name)
DOMAIN=$(domain_for "$COMPOSE_NAME")

header

# Bail out before asking for a password if the router cannot start at all.
if ! router_running; then
    BLOCKER=$(port_holder)
    if [[ -n "$BLOCKER" ]]; then
        report_port_conflict "$BLOCKER"
        exit 1
    fi
fi

# Prompt for sudo up front, so it does not interrupt the steps below
if [[ "$OSTYPE" == "darwin"* ]] && ! { extract_ca_cert && ca_already_trusted; }; then
    _Y=$'\033[33m' _D=$'\033[0m'

    printf "  ${_Y}┌─ notice${_D}\n"
    printf "  ${_Y}│${_D}  Adding and trusting the SSL certificate to your System Keychain\n"
    printf "  ${_Y}│${_D}  requires your macOS password.\n"
    printf "  ${_Y}│${_D}\n"
    if sudo -v -p "  ${_Y}│${_D}  Password: "; then
        printf "  ${_Y}└${_D}\n\n"
    else
        printf "  ${_Y}└${_D}\n\n"
        exit 1
    fi
fi

step "Setting up network"
ensure_router_network
case $? in 0) ok ;; 1) skip "already exists" ;; *) fail "could not create" ;; esac

step "Starting router"
ensure_router_running
case $? in
    0) ok ;;
    1) skip "already running" ;;
    3)
        _result "✗" "\033[31m" "ports 80/443 in use"
        report_port_conflict "$PORT_HOLDER"
        exit 1
        ;;
    *) fail "could not start" ;;
esac

step "Loading router config"
ensure_router_config
case $? in 0) ok ;; 1) skip "already loaded" ;; *) fail ;; esac

step "Registering ${DOMAIN}"
register_route
case $? in 0) ok ;; 1) skip "already registered" ;; *) fail ;; esac

step "Trusting CA certificate"
trust_ca
case $? in 0) ok ;; 1) skip "already trusted" ;; 2) skip "not yet ready" ;; *) fail ;; esac

step "Starting containers"
run docker compose up --build -d
[[ $? -ne 0 ]] && fail
ok

printf "\n  \033[32m✓\033[0m  \033[1mhttps://%s\033[0m\n\n" "$DOMAIN"
