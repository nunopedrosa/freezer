# App-owned publication contract; common engine: BaseCentral deploy 1.0.0.
APP_ID=freezer
SOURCE_SUBDIR=.
DEFAULT_DESTINATION="${DEPLOY_SITE:-$HOME/freezer.trekm.com}"
DEPLOY_URL=https://freezer.trekm.com
PUBLIC_FILES=$(cat <<'PUBLIC_FILES'
app.js
icon.svg
index.html
manifest.webmanifest
print-pdf.js
shared-chevron.svg
shared-controls.css
shared-icons.svg
style.css
sw.js
PUBLIC_FILES
)
