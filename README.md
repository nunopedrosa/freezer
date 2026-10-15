# Congelador — PWA

Static, offline-first freezer inventory PWA, in Portuguese, based on `ListaCongeladorExemplo.pdf`.

## Deploy
For DreamHost, run these commands on the server from the cloned `freezer` directory after pulling the latest changes:

```sh
./scripts/deploy.sh --dry-run
./scripts/deploy.sh
```

The default destination is `~/freezer.trekm.com`. If the domain uses a different web directory, pass that path:

```sh
./scripts/deploy.sh /home/your-user/freezer.trekm.com
```

The script copies only the seven public app files, excluding Git history, tests, documentation, and ZIP archives. Existing unrelated files (including `.htaccess` and `.well-known`) are preserved. Files are replaced individually, with `sw.js` published last. Configure the domain's web directory and HTTPS in DreamHost before serving the app. Increment the cache version in `sw.js` whenever deploying changed app assets.

Alternatively, upload the seven public app files to an HTTPS-enabled folder on your web host. Open `index.html` in a browser. On iOS use Safari > Share > Add to Home Screen. The app works offline after its first successful load.

## Usage
Tap product/category names to edit. Use `+` and `−` to adjust quantities; toggle `1`/`½` to switch increments. `×` removes an item, and the category arrows reorder categories. Use Print/PDF for A4 portrait output, and Export/Import for JSON backup.

## Important interpretation of reference
The PDF shows **every** circled digit ①–⑨ beside each item, and does not identify which numbers are marked as the actual quantity. The imported entries therefore start with quantity **zero**. The six reference items with a `½` symbol are preconfigured for half-unit increments. In print, selected numbers are bold and unused numbers are hidden while preserving their spacing. This interpretation can be adjusted if the paper form is meant to work differently.

## Data and limitations
Data are stored locally in browser `localStorage`, with no server transmission or accounts. Different devices do not automatically sync; export/import JSON to move data. Browser data clearing may erase the inventory. The A4 layout is designed for the reference list; very long lists may overflow one page. Check print preview before printing.

## Development
No build process or dependencies. For local development, run `python3 -m http.server 8080` in this directory, then open http://localhost:8080. Service workers require HTTPS or localhost.

## Aligned sections (v0.2)
Categories are arranged in synchronized left/right pairs. Every pair shares the height of its tallest category, so the horizontal separators stay aligned after items are added or deleted on either side. This also applies to the A4 print layout. Use **Imprimir / PDF** and select **Save as PDF** in the browser print dialog. If the list exceeds one page, the app warns before printing; the print layout uses 12 mm margins, larger condensed text, and continues onto additional pages rather than clipping excess content.

## Editing and updates

Focusing a product name, category name, or title selects its text so typing replaces it. Click again within a focused field to position the caret.

The app checks for updates on launch, when returning to it, and when the connection returns. **Verificar atualização** checks manually; **Atualizar** appears once a new version has downloaded. Clicking it saves the current edit and reloads the app. Inventory remains in local storage, and the downloaded version works offline.

When deploying changed assets, increment the `CACHE` version in `sw.js` and upload the complete app together. Existing installations from v0.2/v3 may need all app tabs/windows closed and reopened once to pick up these new update controls.

Browser integration checks: `node tests/browser.cjs` with Playwright installed. Optional `PLAYWRIGHT_PATH` and `CHROMIUM_PATH` environment variables select an existing Playwright installation and Chromium executable. The checks use a temporary local HTTP server and isolated browser storage.

## Printing on iPhone

On iPhone/iPad, **Imprimir / PDF** creates an A4 PDF directly on the device, avoiding the browser print dialog. Choose **Partilhar PDF** when available, or **Guardar PDF** and open it in Files to print. **Criar PDF** offers the same option on other devices; it is hidden on iPhone/iPad to avoid duplicate buttons. The PDF includes the quantity legend below the title and separator lines between category pairs. The PDF uses the current inventory, works offline, hides unused quantities, and paginates long lists. PDF pages are high-resolution images, so text in this export is not searchable/selectable. Desktop browser printing remains available.
