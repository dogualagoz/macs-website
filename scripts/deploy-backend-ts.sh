#!/usr/bin/env bash
#
# Container deploy script for backend-ts on the production VPS (/opt/macs-website).
#
# Usage (first deploy & upgrades — fetches script from origin/main before running):
#   set -euo pipefail

LOCK_FILE="${LOCK_FILE:-/tmp/macs-backend-ts-deploy.lock}"
if ! command -v flock >/dev/null 2>&1; then
  echo "flock is required for deploy concurrency lock but was not found in PATH" >&2
  exit 1
fi
exec 9>"$LOCK_FILE"
flock -n 9 || {
  echo "deploy already in progress" >&2
  exit 1
}
#   cd /opt/macs-website && git fetch origin main && git show origin/main:scripts/deploy-backend-ts.sh | bash -s
#
# Usage (once script is present in /opt/macs-website):
#   bash /opt/macs-website/scripts/deploy-backend-ts.sh
#
# Exit codes:
#   0 - deploy succeeded ("deployed <sha>")
#   1 - pre-deploy validation failed or deploy failed and rolled back cleanly ("deploy failed, rolled back to <PREV>")
#   2 - deploy failed AND rollback failed ("rollback failed for <PREV>")

set -euo pipefail

REPO_DIR="${REPO_DIR:-/opt/macs-website}"
REMOTE="${REMOTE:-origin}"
BRANCH="${BRANCH:-main}"
COMPOSE_BASE_FILE="${COMPOSE_BASE_FILE:-docker-compose.yml}"
COMPOSE_PROD_FILE="${COMPOSE_PROD_FILE:-docker-compose.prod.yml}"
SERVICE_NAME="${SERVICE_NAME:-backend-ts}"
CONTAINER_NAME="${CONTAINER_NAME:-macs-backend-ts}"
IMAGE_NAME="${IMAGE_NAME:-macs-backend-ts}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-180}"
HEALTH_POLL_INTERVAL_SECONDS="${HEALTH_POLL_INTERVAL_SECONDS:-2}"

cd "$REPO_DIR"

# F15: Check for a dirty working tree BEFORE mutating the checkout.
if [[ -n "$(git status --porcelain)" ]]; then
  echo "uncommitted changes on server" >&2
  exit 1
fi

git fetch "$REMOTE" "$BRANCH"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "uncommitted changes on server" >&2
  exit 1
fi

PREV="$(git rev-parse HEAD)"
SAVED_COMPOSE_CONFIG="$(mktemp "${TMPDIR:-/tmp}/macs-backend-ts-compose.XXXXXX.yml")"
ROLLBACK_IMAGE_TAG="${IMAGE_NAME}:rollback-${PREV}"
PREV_IMAGE_ID=""
PREV_CONTAINER_EXISTED=0

cleanup() {
  rm -f "$SAVED_COMPOSE_CONFIG"
  if [[ -n "$PREV_IMAGE_ID" ]]; then
    docker image rm "$ROLLBACK_IMAGE_TAG" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# F16: Save resolved compose config and current backend-ts image ID (if any) before mutating checkout.
HAS_PREV_SERVICE=0
if [[ -f "$COMPOSE_BASE_FILE" && -f "$COMPOSE_PROD_FILE" ]] && \
   docker compose -f "$COMPOSE_BASE_FILE" -f "$COMPOSE_PROD_FILE" config --services 2>/dev/null | grep -qx "$SERVICE_NAME"; then
  if docker compose -f "$COMPOSE_BASE_FILE" -f "$COMPOSE_PROD_FILE" config > "$SAVED_COMPOSE_CONFIG" 2>/dev/null; then
    HAS_PREV_SERVICE=1
  fi
fi

if docker container inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
  PREV_CONTAINER_EXISTED=1
  PREV_IMAGE_ID="$(docker inspect --format '{{.Image}}' "$CONTAINER_NAME" 2>/dev/null || true)"
elif docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
  PREV_IMAGE_ID="$(docker image inspect --format '{{.Id}}' "$IMAGE_NAME" 2>/dev/null || true)"
fi

if [[ -n "$PREV_IMAGE_ID" ]]; then
  docker image tag "$PREV_IMAGE_ID" "$ROLLBACK_IMAGE_TAG"
fi

wait_for_healthy() {
  local elapsed=0
  local status=""
  while (( elapsed < HEALTH_TIMEOUT_SECONDS )); do
    status="$(docker inspect --format '{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || true)"
    if [[ "$status" == "healthy" ]]; then
      return 0
    fi
    sleep "$HEALTH_POLL_INTERVAL_SECONDS"
    elapsed=$(( elapsed + HEALTH_POLL_INTERVAL_SECONDS ))
  done
  status="$(docker inspect --format '{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || true)"
  [[ "$status" == "healthy" ]]
}

rollback() {
  if [[ "$PREV_CONTAINER_EXISTED" -eq 1 && "$HAS_PREV_SERVICE" -eq 1 && -n "$PREV_IMAGE_ID" ]]; then
    # Upgrade failure: restore checkout, saved image, and saved compose config without rebuilding.
    if ! git reset --hard "$PREV" >/dev/null 2>&1; then
      echo "rollback failed for $PREV: git reset failed" >&2
      exit 2
    fi
    if ! docker image tag "$ROLLBACK_IMAGE_TAG" "$IMAGE_NAME" >/dev/null 2>&1; then
      echo "rollback failed for $PREV: image restore failed" >&2
      exit 2
    fi
    if ! docker compose -f "$SAVED_COMPOSE_CONFIG" up -d --no-deps --no-build --force-recreate "$SERVICE_NAME"; then
      echo "rollback failed for $PREV: compose up failed" >&2
      exit 2
    fi
    if ! wait_for_healthy; then
      echo "rollback failed for $PREV: restored container did not become healthy" >&2
      exit 2
    fi
  else
    # First-install failure: stop/remove ONLY the new backend-ts service before resetting checkout.
    docker compose -f "$COMPOSE_BASE_FILE" -f "$COMPOSE_PROD_FILE" rm -f -s "$SERVICE_NAME" || true
    if docker container inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
      docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
    fi
    if docker container inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
      echo "rollback failed for $PREV: failed to remove $CONTAINER_NAME" >&2
      exit 2
    fi
    if [[ -n "$PREV_IMAGE_ID" ]]; then
      docker image tag "$ROLLBACK_IMAGE_TAG" "$IMAGE_NAME" >/dev/null 2>&1 || true
    else
      docker image rm "$IMAGE_NAME" >/dev/null 2>&1 || true
    fi
    if ! git reset --hard "$PREV" >/dev/null 2>&1; then
      echo "rollback failed for $PREV: git reset failed" >&2
      exit 2
    fi
  fi

  echo "deploy failed, rolled back to $PREV" >&2
  exit 1
}

git merge --ff-only "${REMOTE}/${BRANCH}"

if ! docker compose -f "$COMPOSE_BASE_FILE" -f "$COMPOSE_PROD_FILE" build "$SERVICE_NAME"; then
  rollback
fi

if ! docker compose -f "$COMPOSE_BASE_FILE" -f "$COMPOSE_PROD_FILE" up -d --no-deps "$SERVICE_NAME"; then
  rollback
fi

if ! wait_for_healthy; then
  rollback
fi

echo "deployed $(git rev-parse HEAD)"
