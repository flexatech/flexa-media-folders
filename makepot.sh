#!/usr/bin/env bash
# Regenerate i18n/languages/flexa-media-folders.pot (PHP + JS strings).
#
# The React admin app is TypeScript; `wp i18n make-pot`'s JS extractor cannot
# parse TS/TSX, so scripts/extract-js-i18n.php first copies the literal
# __()/_x()/_n() calls into plain-JS stub files, extracts the JS strings from
# those, then the PHP strings are extracted and both are merged.
set -euo pipefail

PLUGIN_SLUG="flexa-media-folders"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
POT_FILE="i18n/languages/${PLUGIN_SLUG}.pot"
TMP_DIR="build/.makepot"
TMP_JS_DIR="${TMP_DIR}/js"
TMP_JS_POT="${TMP_DIR}/js.pot"

cd "${ROOT_DIR}"

command -v wp >/dev/null 2>&1 || { echo "wp-cli is required" >&2; exit 1; }

rm -rf "${TMP_DIR}"
mkdir -p "${TMP_JS_DIR}" "$(dirname "${POT_FILE}")"

# 1. Copy the admin app's literal i18n calls into plain-JS stubs
#    (build/.makepot/js, same relative paths + line numbers).
wp eval-file scripts/extract-js-i18n.php extract --skip-wordpress

# 2. Extract JS strings. Source calls go through apps/admin/src/lib/i18n.ts,
#    which injects the text domain at runtime, so the calls carry no domain
#    argument -> extract with --ignore-domain (the stub dir is all our code).
wp i18n make-pot "${TMP_JS_DIR}" "${TMP_JS_POT}" \
    --ignore-domain --skip-php --skip-audit

# Point references back at the TS sources instead of the stub files.
wp eval-file scripts/extract-js-i18n.php fix-refs --skip-wordpress

# 3. Extract PHP strings + plugin header metadata, merge the JS entries in.
wp i18n make-pot . "${POT_FILE}" \
    --domain="${PLUGIN_SLUG}" --slug="${PLUGIN_SLUG}" \
    --include="flexa-media-folders.php,uninstall.php,src,views" \
    --skip-js --skip-audit \
    --merge="${TMP_JS_POT}"

rm -rf "${TMP_DIR}"

COUNT="$(grep -c '^msgid ' "${POT_FILE}")"
echo "Wrote ${POT_FILE} ($((COUNT - 1)) strings)"
