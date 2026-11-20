# Coyote Creek Trail Explorer

An interactive map, timeline and cost tracker for completing San José's **Coyote Creek Trail**, from the Bay to Anderson Dam.

**Live site:** https://alexstorer.github.io/coyote-creek-trail/

## What's inside

- **Map**: every trail reach from the City of San José's Trail Reach GIS layer, colored by status (open, interim, in design, planned gap), with notes on cost and funding.
- **Timeline**: 40 dated milestones from 1990 to 2035, covering plans, grants, construction, the 2017 flood and encampment clearances. Each one links to its source. It reads like a scrolling story: the year strip stays pinned at the top, and a map beside the cards follows along. For each event, the map flies to where it happened and redraws the trail as it stood on that date.
- **Costs**: total cost and cost per mile for City projects completed 2021–2025, plus a calculator that estimates the cost of closing the remaining ~4.9 miles of gaps.
- **Documents**: master plans, design plan sets, CEQA filings and Council memos. Each one is pinned to the stretch of trail it covers, with a small strip showing where it falls along the trail and a pinned locator map. The section also includes an atlas of 35 figures (`img/schematics/`), ordered north to south. They come from the City's master plans, construction plan sets (35–100%), feasibility studies, Council memos and the Bay Area Ridge Trail maps. One of them is an undated "Coyote Creek Park" long-range plan that imagined swim and boating lagoons along the creek.
- **News**: 34 local articles from 2004 to 2026.
- **Scorecards**: every project event says whether the work was completed, whether it was on schedule (the finish date planned at award vs. the actual opening) and whether it was on budget. Each verdict cites the Council memos. A delivery table in the Costs section summarizes them, and the City's own 2011 cost estimate for the northern gap appears alongside.
- **Photos**: geotagged, openly licensed images from Wikimedia Commons. Each one is pinned on the map and attached to the matching timeline events.

## Data sources

- Trail geometry: [City of San José Trail Reach dataset](https://data.sanjoseca.gov/dataset/trail-reach) (ArcGIS layer `OPN_OpenDataService/MapServer/538`), retrieved November 2026. The raw download is in `data/source/`. `data/reaches.geojson` and `data/reaches.js` are trimmed copies. The trimming drops the separate Coyote Alamitos Canal reaches and the duplicate on-street alternate alignments.
- Costs and dates: City Council and committee memos (Legistar), Valley Water releases, State Coastal Conservancy staff reports, and local news. Each one is cited inline in `data/data.js`.
- Location links: `data/geo.js` connects events, documents and plan sheets to trail sections. It also records the year each section opened. Opening years before 2021 are approximate, and the file marks them that way.
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
