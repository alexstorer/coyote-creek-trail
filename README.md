# Coyote Creek Trail Explorer

An interactive map, timeline and cost tracker for completing San José's **Coyote Creek Trail**, from the Bay to Anderson Dam.

**Live site:** https://alexstorer.github.io/coyote-creek-trail/

## What's inside

- **Map**: every trail reach from the City of San José's Trail Reach GIS layer, colored by status (open, interim, in design, planned gap), with notes on cost and funding.
- **Timeline**: 40 dated milestones from 1990 to 2035, covering plans, grants, construction, the 2017 flood and encampment clearances. Each one links to its source.
- **Costs**: total cost and cost per mile for City projects completed 2021–2025, plus a calculator that estimates the cost of closing the remaining ~4.9 miles of gaps.
- **Documents**: master plans, design plan sets (schematics), CEQA filings and Council memos.
- **News**: 34 local articles from 2004 to 2026.
- **Photos**: openly licensed images from Wikimedia Commons.

## Data sources

- Trail geometry: [City of San José Trail Reach dataset](https://data.sanjoseca.gov/dataset/trail-reach) (ArcGIS layer `OPN_OpenDataService/MapServer/538`), retrieved November 2026. The raw download is in `data/source/`. `data/reaches.geojson` and `data/reaches.js` are trimmed copies. The trimming drops the separate Coyote Alamitos Canal reaches and the duplicate on-street alternate alignments.
- Costs and dates: City Council and committee memos (Legistar), Valley Water releases, State Coastal Conservancy staff reports, and local news. Each one is cited inline in `data/data.js`.
- Basemap: Esri Canvas tiles with © OpenStreetMap contributors.

## Caveats

- The gap-closure cost is an extrapolation from recent per-mile costs. It is **not** an official City estimate. The City's only published figure covers the whole trail network: $300–400M, unfunded.
- Reach lengths and opening dates sometimes differ between sources. Where they do, this site uses the City GIS values.

## Running locally

This is a static site with no build step. To view it locally:

```
python3 -m http.server
```

Then open http://localhost:8000.

Not affiliated with the City of San José, Valley Water, or Santa Clara County.
