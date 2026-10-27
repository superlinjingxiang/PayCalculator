`umami-v3.4.1-tracker.ts.txt` is the unmodified official tracker from
https://raw.githubusercontent.com/umami-software/umami/v3.4.1/src/tracker/index.ts
(retrieved 2026-10-27), under the accompanying MIT license. Browser tests
transpile this pinned TypeScript source and substitute its two build placeholders
for the standard `/api/send` endpoint. It is a test fixture, never bundled into
the website; deployment serves the official locked Umami image's script.
