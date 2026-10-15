#!/usr/bin/env bash
# Run on DreamHost from a cloned checkout; no build dependencies required.
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/deploy.sh [--dry-run] [DESTINATION]

Copy the app from this checkout to DESTINATION (default: $HOME/freezer.trekm.com).
Run on the DreamHost server after cloning or pulling the repository.
Only public app files are copied. Existing unrelated files are preserved.
EOF
}

dry_run=false
destination="${HOME}/freezer.trekm.com"
destination_set=false
for arg in "$@"; do
  case "$arg" in
    --dry-run) dry_run=true ;;
    -h|--help) usage; exit 0 ;;
    -*) printf 'Unknown option: %s\n' "$arg" >&2; usage >&2; exit 1 ;;
    *)
      if "$destination_set"; then
        printf 'Only one destination may be supplied.\n' >&2; exit 1
      fi
      destination="$arg"
      destination_set=true
      ;;
  esac
done

source_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
files=(index.html style.css app.js print-pdf.js manifest.webmanifest icon.svg sw.js)
for file in "${files[@]}"; do
  if [[ ! -f "$source_dir/$file" ]]; then
    printf 'Missing required app file: %s\n' "$source_dir/$file" >&2; exit 1
  fi
done
if [[ -z "$destination" || "$destination" == / ]]; then
  printf 'Choose a non-empty site directory, not /.\n' >&2; exit 1
fi

printf 'Source: %s\nDestination: %s\n' "$source_dir" "$destination"
if "$dry_run"; then
  printf 'Would copy: %s\n' "${files[@]}"
  exit 0
fi

mkdir -p -- "$destination"
destination="$(cd -- "$destination" && pwd)"
if [[ "$destination" == "$source_dir" ]]; then
  printf 'Destination must differ from the cloned checkout.\n' >&2; exit 1
fi

# Rename each staged file into place so requests never see a partially written file.
# Publish the service worker last, after all assets referenced by it are in place.
staged_file=''
trap 'if [[ -n "$staged_file" ]]; then rm -f -- "$staged_file"; fi' EXIT
for file in "${files[@]}"; do
  staged_file="$(mktemp "$destination/.freezer-deploy.XXXXXX")"
  cp -- "$source_dir/$file" "$staged_file"
  chmod 644 "$staged_file"
  mv -f -- "$staged_file" "$destination/$file"
  staged_file=''
  printf 'Copied %s\n' "$file"
done
printf 'Deployment complete: %s\n' "$destination"
