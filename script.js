// All map-related functions called in this file should be abstract regarding
// the map being used. We've only tested one map library, but hopefully it's
// abstracted enough.
const map = createAndAttachMap('map');

// Actual data (not committed)
const dataFiles = ['data-rm.json', 'data-otm.json'];
const areaFiles = ['areas.json'];
// Test data, as an example
const testFiles = ['test-data.json'];
const testAreas = ['test-areas.json'];

// Some utility functions
// Promise: Fetch a JSON object, or return an empty array, if not possible to
// fetch
function maybeFetchJSON(path) {
  // FIXME: Don't mind connection errors, just return an empty array
  return fetch(path).then(function(response) {
    if (!response.ok) {
      // TODO: Maybe have a better way to report errors to user
      console.warn(`Failed request to ${response.url}: ${response.status} ${
          response.statusText}`);
      return [];
    }
    return response.json()
  });
}

// Promise: Merge an array of maybeFetchJSON results
async function fetchMergeJSONArrays(files) {
  const reqs = files.map(maybeFetchJSON);
  const array = await Promise.all(reqs)
  return array.flat();
}

async function fetchWithBackup(dataFiles, testFiles) {
  let fetched = await fetchMergeJSONArrays(dataFiles);
  if (fetched.length == 0) {
    console.warn(`data not found at ${dataFiles}, fetching test data from ${testFiles}`);
    fetched = await fetchMergeJSONArrays(testFiles);
  }
  // Merge all areas into a single object
  // If two areas are defined with the same name, only the latter will be used.
  // FIXME: Maybe be nicer
  return fetched;
}

function drawInterestingAreas(map, areas, prefs) {
  // Create a circle per area
  return areas
      .map(function(area) {
        const marker = drawArea(prefs, map, area);
        area.marker = marker;
        return marker;
      })
      // Remove unknown area types
      .filter(Boolean);
}

function drawMarkers(map, props, prefs) {
  // Add markers for all the properties we care about
  return Array.from(props.values(), function(prop) {
    const marker = addProperty(prefs, map, prop, propertyPopup);
    prop.marker = marker;
    return marker;
  });
}

// Global data, for ease of access, mostly
document.data = {};

// global utility functions
// These functions are only valid after the initial part of the main() function
const getPrefs = () => document.data.prefs;
const getAreas = () => document.data.areas;
const getProps = () => document.data.props;

function adjustTitleIfDev() {
  // Don't ever set more than once
  if (document.title.endsWith(' (dev)'))
    return;

  if (window.location.hostname == 'localhost' ||
      window.location.pathname.includes('/dev/'))
    document.title += ' (dev)'
}

function applyPreferencesToProperties(prefs, props) {
  const highlights = prefs.highlights;
  for (const [name, propIDs] of Object.entries(highlights)) {
    propIDs.map(id => props.get(id).highlight = name);
  }
}

async function main() {
  adjustTitleIfDev();

  const prefs = await loadPreferences();
  document.data.prefs = prefs;
  console.info('prefs', prefs);
  const areas = await fetchWithBackup(areaFiles, testAreas);
  document.data.areas = areas;
  console.info('areas', areas);
  const propList = await fetchWithBackup(dataFiles, testFiles);
  const props = new Map(propList.map(prop => [prop.id, prop]));
  document.data.props = props;
  console.info('props', props);

  applyPreferencesToProperties(prefs, props);

  const areaMarkers = drawInterestingAreas(map, areas, prefs);
  const markers = drawMarkers(map, props, prefs);

  fitToMarkers(map, markers.concat(Array.from(areaMarkers.values())));

  // Add current location. Only works if protocol is https:
  enableGeolocation(map, areaMarkers);

  console.info('done!');
}
main()
