#!/usr/bin/env bash
set -euo pipefail

ENV_FILE=".env.firebase-deploy"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing ${ENV_FILE}."
  echo "Create it from .env.firebase-deploy.example and fill in the Firebase login emails."
  exit 1
fi

set -a
source "${ENV_FILE}"
set +a

: "${FIREBASE_PERSONAL_ACCOUNT:?Set FIREBASE_PERSONAL_ACCOUNT in ${ENV_FILE}}"
: "${FIREBASE_WORK_ACCOUNT:?Set FIREBASE_WORK_ACCOUNT in ${ENV_FILE}}"
: "${FIREBASE_PERSONAL_PROJECT:?Set FIREBASE_PERSONAL_PROJECT in ${ENV_FILE}}"
: "${FIREBASE_WORK_PROJECT:?Set FIREBASE_WORK_PROJECT in ${ENV_FILE}}"

# If either account is missing locally, add it once with:
# firebase login:add "$FIREBASE_PERSONAL_ACCOUNT"
# firebase login:add "$FIREBASE_WORK_ACCOUNT"

current_firebase_account() {
  local login_output
  login_output="$(firebase login:list 2>&1 || true)"
  printf '%s\n' "${login_output}" | sed -n 's/^Logged in as //p' | head -n 1
}

use_firebase_account() {
  local account="$1"
  local current_account
  local login_output

  current_account="$(current_firebase_account)"

  if [[ "${current_account}" == "${account}" ]]; then
    echo "Firebase CLI already using ${account}."
    return 0
  fi

  login_output="$(firebase login:use "${account}" 2>&1)" || {
    if [[ "${login_output}" == *"Already using account"* ]]; then
      echo "Firebase CLI already using ${account}."
      return 0
    fi

    echo "${login_output}"
    return 1
  }

  echo "${login_output}"
}

restore_personal_login() {
  echo "Switching Firebase CLI login back to ${FIREBASE_PERSONAL_ACCOUNT}..."
  use_firebase_account "${FIREBASE_PERSONAL_ACCOUNT}" || {
    echo "Warning: could not restore Firebase CLI login to ${FIREBASE_PERSONAL_ACCOUNT}."
  }
}

trap restore_personal_login EXIT

echo "Building app..."
npm run build

echo "Deploying personal Firebase project..."
use_firebase_account "${FIREBASE_PERSONAL_ACCOUNT}"
firebase deploy --project "${FIREBASE_PERSONAL_PROJECT}"

echo "Deploying work Firebase project..."
use_firebase_account "${FIREBASE_WORK_ACCOUNT}"
firebase deploy --project "${FIREBASE_WORK_PROJECT}"

echo "Firebase deploys completed."
