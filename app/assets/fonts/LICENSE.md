# Schibsted Grotesk

**Licence:** SIL Open Font License 1.1 — permits self-hosting, embedding and redistribution.
Full text: <https://openfontlicense.org/> · Font source and licence as published:
<https://fonts.google.com/specimen/Schibsted+Grotesk/license>

**Files here** were fetched from `fonts.gstatic.com` on 2026-08-04 (T0.12), version `v7`:

| file | subset | bytes |
|---|---|---|
| `schibsted-grotesk-latin.woff2` | `latin` | 46,864 |
| `schibsted-grotesk-latin-ext.woff2` | `latin-ext` | 20,844 |

Both are **variable** fonts spanning weights 400–700, which is why two files cover what the old
`<link>` requested as four weights. The app measurably uses only 600 and 700
(`program/findings/T0.12.md`); the full range is kept so a future style change cannot silently
fall back.

Re-fetch, if ever needed, by requesting
`https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700&display=swap`
with a modern browser User-Agent (the endpoint serves `woff2` only to UAs it believes support
it) and reading the two distinct `src: url(...)` values out of the response.
