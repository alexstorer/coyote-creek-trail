// Location links: which trail reaches (City GIS REACHIDs) each event, document and plan sheet refers to.
// Ranges are written as R(from, to) along the north→south MAINLINE order defined in data.js.
const R = (a, b) => MAINLINE.slice(MAINLINE.indexOf(a), MAINLINE.indexOf(b) + 1);
const CITY = R("COY03", "COY15");
const NORTH_GAP = R("COY05.1", "COY07.1");
const FLOOD_REACH = R("COY05.1", "COY12");        // Valley Water project: Montague → Tully
const COUNTY = R("COY16", "PARKWAY");
const TRESTLE = [37.3269, -121.8661];

// Year each reach opened. approx: true = year not documented; inferred from the earliest record.
const BUILT = {
  COY00: { y: 2009, approx: true }, COY03: { y: 2009, approx: true }, COY04: { y: 2009, approx: true },
  "COY05.4": { y: 2015, approx: true }, "COY05.6": { y: 2015, approx: true },
  "COY05.8": { y: 2025.24 }, COY06: { y: 2025.24 },
  COY08: { y: 2009, approx: true }, COY08A: { y: 2009, approx: true },
  COY09: { y: 2021.83 }, COY10: { y: 2021.83 }, COY11: { y: 2021.83 }, COY11A: { y: 2021.83 },
  COY12: { y: 2025.33 },
  COY13: { y: 2009.58 }, COY13B: { y: 2009.58, approx: true }, COY14: { y: 2009.58, approx: true }, COY15: { y: 2009.58, approx: true },
  COY15A: { y: 2021.49 }, "COY15-1": { y: 2021.49 },
};
["COY16","COY17","COY18","COY19A","COY19B","COY20A","COY21A","COY21B","COY22A","PARKWAY","Connector"].forEach(id => BUILT[id] = { y: 1990, approx: true });

// Plan sheets and location maps extracted from primary documents.
const SCHEMATICS = [
  { k: "mab2023", t: "Location map: Mabury Rd to Empire St (Project 8087)", d: "City of San José Council memo, 2023", r: ["COY05.8", "COY06"], src: SRC.memoMabury2023 },
  { k: "william", t: "Vicinity map: 16th St / William St to Story Rd (Project 6324)", d: "City of San José Council memo, Jan 2021", r: ["COY09", "COY10"], src: SRC.memoWilliamStory },
  { k: "story", t: "Location map: Story Rd to Phelan Ave through Kelley Park", d: "City of San José Council memo, 2020", r: ["COY11"], src: SRC.memoStoryPhelan },
  { k: "phelan", t: "Aerial alignment: Phelan Ave to Tully Rd (Project 8675)", d: "City of San José Council memo, Nov 2023. Shows the trail, access points and encampment-abatement zones.", r: ["COY12"], src: SRC.memoPhelanTully },
  { k: "ridgeN", t: "Coyote Creek Parkway North: William St to Metcalf Park", d: "Bay Area Ridge Trail Council, 2025", r: R("COY08", "COY22A"), src: "https://ridgetrail.org/wp-content/uploads/2017/07/Santa-Clara_Coyote-Creek-Parkway-North_2025.pdf" },
  { k: "ridgeS", t: "Coyote Creek Parkway South: Metcalf Park to Morgan Hill", d: "Bay Area Ridge Trail Council, 2020", r: ["PARKWAY"], src: "https://ridgetrail.org/wp-content/uploads/2017/07/2020_SantaClara_CoyoteCreekParkwaySouth.pdf" },
];

// Per-event extras, keyed by the event's date string in TIMELINE.
//   r: reaches to highlight · pt: point to mark · ph: photo file names · sch: plan sheet key
const EVENT_GEO = {
  "1990": { r: COUNTY, ph: ["Kluft-photo-2019-06-16-Coyote-Creek-Trail-Lakes.jpg"], sch: "ridgeS" },
  "2004-03-09": { r: CITY },
  "2005-03": { r: R("COY12", "COY14") },
  "2007-03-20": { r: COUNTY, ph: ["Ducks at Cottonwood Lake in Hellyer County Park.jpg"] },
  "2008": { r: R("COY03", "COY06") },
  "2009-08-15": { r: ["COY13", "COY14"], ph: ["Kluft-photo-2019-06-16-Coyote-Creek-Trail-Tully-trailhead.jpg", "Coyote_Creek_under_highway_237.jpg"] },
  "2011-09-13": { r: R("COY05.1", "COY06.1"), ph: ["Berryessa station from Marbury Road, March 2018.JPG"] },
  "2012": { pt: TRESTLE },
  "2015-10": { r: ["COY05.8", "COY06"] },
  "2016-05": { r: CITY },
  "2017-02-21": { pt: [37.3185, -121.8478], r: R("COY11", "COY13") },
  "2017-06-15": { r: FLOOD_REACH, ph: ["Coyote_Creek_aerial.jpg"] },
  "2017-08-29": { r: ["COY11", "COY12"] },
  "2019-12-23": { r: ["COY09", "COY10"] },
  "2020-06": { r: NORTH_GAP },
  "2021-01-26": { r: ["COY09", "COY10"], sch: "william" },
  "2021-03-21": { r: ["COY10", "COY11"] },
  "2021-07": { r: ["COY15A", "COY15"] },
  "2021-11-07": { r: R("COY08", "COY11"), ph: ["Happy Hollow Park & Zoo -San Jose, California, USA-2Oct2011 (1).jpg"], sch: "story" },
  "2022-01-01": { r: R("COY08", "COY12") },
  "2022-11-16": { r: ["COY05.8", "COY06"] },
  "2023-04-06": { r: FLOOD_REACH },
  "2023-04-19": { r: ["COY05.8", "COY06"], sch: "mab2023" },
  "2023-06": { pt: TRESTLE, r: ["COY09", "COY10"] },
  "2023-11-07": { r: ["COY12"], sch: "phelan" },
  "2024-05-07": { r: ["COY05.8", "COY06"] },
  "2024-10-22": { r: FLOOD_REACH },
  "2025-01-02": { r: FLOOD_REACH },
  "2025-02-21": { r: R("COY05.4", "COY08") },
  "2025-04": { r: ["COY05.8", "COY06"], ph: ["Miguelita_or_Lower_Silver_Creek_confluence_with_Coyote_Creek.jpg"] },
  "2025-05": { r: ["COY12"] },
  "2025-08": { r: ["COY06-D"] },
  "2025-12-12": { pt: [37.3113, -121.8423], r: ["COY12", "COY05.8", "COY06"] },
  "2026-04-15": { r: ["COY10"], pt: [37.3265, -121.8635] },
  "2026-05-21": { r: R("COY08", "PARKWAY"), ph: ["Kluft-photo-2019-06-16-Coyote-Creek-Trail-Bailey-turn.jpg"], sch: "ridgeN" },
  "2026-07-20": { pt: TRESTLE },
  "2026-08-03": { r: FLOOD_REACH },
  "2027-12": { pt: TRESTLE },
  "2028-10": { r: FLOOD_REACH },
  "2035": { r: NORTH_GAP },
};

// Where each document applies (null = not location-specific). Keyed by document title in DOCS.
const DOC_GEO = {
  "Coyote Creek Trail Master Plan (low-res, ~6 MB)": CITY,
  "Coyote Creek Trail Master Plan (hi-res, ~32 MB)": CITY,
  "Master Plan: Montague Expwy to Hwy 101": R("COY05.1", "COY05.8"),
  "Master Plan: Hwy 101 to Story Rd": R("COY06", "COY10"),
  "Master Plan: Phelan Ave to Tully Rd": ["COY12"],
  "Master Plan: through Orchard Park": ["COY05.3", "COY05.4"],
  "Master Plan Amendment: Roosevelt Park": ["COY07", "COY07.1"],
  "Feasibility Study: Hwy 101 to Story Rd": R("COY06", "COY10"),
  "Feasibility Study: Martha St Pedestrian Bridge": ["COY08"],
  "Alignment Plan: Berryessa BART to Santa Clara St BRT": R("COY05.7", "COY07"),
  "Preliminary Engineering: Singleton Crossing": ["COY15A"],
  "San José Trail Program Strategic Plan (2016)": null,
  "90% Plans: Story Rd to Phelan Ave (38 MB)": ["COY11"],
  "35% Plans: Brokaw Rd to UPRR / Orchard Park (11 MB)": ["COY05.3"],
  "95% Plans: Brokaw Rd to UPRR (18 MB)": ["COY05.3"],
  "100% Plans: Hwy 280 (Selma Olinder) to Story Rd": ["COY09", "COY10"],
  "Overview Map: Section 1": null, "Overview Map: Section 2": null, "Overview Map: Section 3": null,
  "Reach map: William St to Phelan Ave": R("COY08", "COY11"),
  "Reach map: Hwy 237 Bikeway to Montague": ["COY03", "COY04"],
  "Reach map: Tully Rd to Yerba Buena": R("COY13", "COY15"),
  "Reach map: Yerba Buena to County": ["COY16"],
  "Coyote Creek Trail Fact Sheet": null,
  "County Parks: Coyote Creek Parkway guide map (PDF)": COUNTY,
  "Bay Area Ridge Trail map: Parkway North (2025)": R("COY08", "COY22A"),
  "CEQA: Coyote Creek Trail Master Plan (2005)": R("COY12", "COY14"),
  "CEQA: Master Plan Public Project PP09-218 (2011)": R("COY05.1", "COY06.1"),
  "CEQA: Story Rd to Phelan Ave (2014)": ["COY11"],
  "CEQA: Valley Water Flood Protection Project (2023)": FLOOD_REACH,
  "Natural Environment Study": null,
  "Biological Assessment / NES": null,
  "Mabury–Empire rebid & contingency (Feb 2025)": ["COY05.8", "COY06"],
  "Mabury–Empire contract award (2023)": ["COY05.8", "COY06"],
  "Phelan–Tully contract award (Nov 2023)": ["COY12"],
  "Story–Phelan contract award (2020)": ["COY11"],
  "William–Story contract award (2021)": ["COY09", "COY10"],
  "Singleton crossing (May 2021)": ["COY15A"],
  "Bike Plan & Trail Network Annual Update (2024)": null,
  "Trail Network Annual Report (2026)": null,
  "Neighborhood Services & Education Committee memo (Nov 2025)": null,
  "Coastal Conservancy: Singleton Crossing staff report (2021)": ["COY15A"],
};

// Human labels for reach endpoints where the GIS name doesn't split cleanly into "A To B".
const REACH_ENDS = {
  COY00: ["Dixon Landing Rd", "Hwy 237"], PARKWAY: ["Metcalf Rd", "Anderson Dam"], COY19B: ["Broderick Dr", "Silver Creek Valley Rd"],
  "COY15A": ["Singleton crossing", "Singleton crossing"], "COY06": ["Hwy 101", "Watson Park"], "COY06-D": ["Watson Park", "Julian St"],
  "COY06.1": ["Watson Park", "Watson Park bridge"], "COY07.2": ["Selma Olinder", "bridge"],
};
