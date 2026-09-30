# InsureBench — public report

An interactive, **fully static** cost-vs-quality report for InsureBench. No
backend, no database, no API keys: a single `index.html` reads a baked
`data/report.json` and does all filtering and charting client-side. That makes
it trivially deployable on Vercel **and** keeps the private benchmark out of the
public surface — only aggregate results cross over.

## What's published (and what isn't)

`data/report.json` is produced by the **private** InsureBench repo:

```
python -m app.main export-report --config config/report.yaml --out ../insurebench-report/data
```

It contains ONLY: per-combo results (accuracy + CI, cost, tokens, n), a
per-(combo, item) score matrix keyed on **opaque task ids + task metadata**
(family / capability / difficulty / status / has-attachment), a few **public**
sample questions (prompt text only), and the learnings + roadmap prose.

It NEVER contains: private prompts, answer keys, expected answers, or raw model
outputs. The export is the privacy boundary; nothing private lives in this repo.

## Update the report

1. In the private repo, edit `config/report.yaml` (the designated `specs`,
   `samples`, learnings/roadmap), then run the `export-report` command above.
2. Commit the refreshed `data/report.json` here and push — Vercel redeploys.

## Decision models

`/decisions` contains **General decisions** and **Yes/No binary models**, with separate full-benchmark and exploratory cohorts. Binary scores include only yes/no answers, even for general models. Cost and latency remain those of the entire measured request; the page labels request sizes explicitly. WC classification is a separate decisioning family in development, with no scores published here yet.

Refresh its aggregate-only data from the private InsureBench checkout:

```bash
python scripts/export_decision_report.py --out C:/AI/Projects/insurebench-report/data/decisions.json
```

The exporter publishes counts and source hashes, never prompts, labels per case, business evidence or raw model responses. Adapted Laya inputs remain a separate diagnostic. Local cost is unmeasured, not zero. To preview with Python's static server, open `/decisions.html`; Vercel exposes the clean `/decisions` URL.

## Deploy

Static site, no build step:

- **Vercel dashboard:** import this repo, framework preset **Other**, build
  command empty, output dir `.`.
- **CLI:** `vercel --prod` from this folder.
- **Local preview:** `python -m http.server 8090` then open `localhost:8090`.

## Stack

Plain HTML + vanilla JS + inline SVG scatter; `marked` (CDN) renders the
markdown sections. Deliberately framework-free for v1 — straightforward to port
to Next.js later if routing/MDX is wanted.
