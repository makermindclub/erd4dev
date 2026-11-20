# Package recordings

These GIFs were captured from a running Laravel host application using the real ERD4Dev package at commit `7e3db351c3c3ad2f995768d8cbc1690b90cbe72d`.

Chromium recorded the application viewport at 1280 × 800. FFmpeg trimmed preparation, resized to 1120 × 700, and encoded 10 frames per second. The interface, dialogs, notices, and board content are the application's actual rendered output. No interface mockups, cursor overlays, captions, or replacement frames were added.

The capture uses isolated tutorial projects. SQL imports, file downloads, Blueprint draft writes, and ER regeneration are real operations in that demonstration environment. Blueprint build commands and migrations were not executed as part of the tutorials.

## Re-record

Use `scripts/record-package-tutorials.mjs` against a compatible local Laravel demonstration application. It requires Node.js, Playwright with its FFmpeg binary, Chromium, and system FFmpeg.

```bash
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
PACKAGE_URL=http://127.0.0.1:8080 \
node scripts/record-package-tutorials.mjs
```

Set `CLIPS=er-modeling,relational-sql` to record a subset. `CHROMIUM_PATH` can override `/usr/bin/chromium`. The script prints the temporary directory containing original WebM captures, final screenshots, and a manifest. Existing GIFs with matching names are replaced.

The application must be an isolated local demo: recording creates sample projects, writes drafts, and changes tutorial diagrams. The script limits the host to localhost or 127.0.0.1.
