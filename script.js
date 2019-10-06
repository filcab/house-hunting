// All map-related functions called in this file should be abstract regarding
// the map being used. We've only tested one map library, but hopefully it's
// abstracted enough.
const map = createAndAttachMap('map');

// Distances are in meters
const areaDiameter = 1600;

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
      console.log(`Failed request to ${response.url}: ${response.status} ${
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
    console.log(`data not found at ${dataFiles}, fetching test data from ${testFiles}`);
    fetched = await fetchMergeJSONArrays(testFiles);
  }
  // Merge all areas into a single object
  // If two areas are defined with the same name, only the latter will be used.
  // FIXME: Maybe be nicer
  return fetched;
}

// Interesting areas:
// We'll draw a circle ${areaDiameter} wide around each of these. In the future,
// we should be able to have a query and ask some geocoding service. For now,
// hardcode coordinates.
function drawInterestingAreas(map, areas, prefs) {
  // Create a circle per area
  return areas.map(function(area) {
    const marker = circleArea(prefs, map, area, areaDiameter);
    area.marker = marker;
    return marker;
  });
}

function drawMarkers(map, props, prefs) {
  // Add markers for all the properties we care about
  return props.map(function(prop) {
    const marker = addProperty(prefs, map, prop, propertyPopup);
    prop.marker = marker;
    return marker;
  });
}

// Global data, for ease of access, mostly
document.data = {};

async function main() {
  const prefs = await UserPreferences();
  document.data.prefs = prefs;
  console.log('prefs', prefs);
  const areas = await fetchWithBackup(areaFiles, testAreas);
  document.data.areas = areas;
  console.log('areas', areas);
  const props = await fetchWithBackup(dataFiles, testFiles);
  document.data.props = props;
  console.log('props', props);

  const areaMarkers = drawInterestingAreas(map, areas, prefs);
  const markers = drawMarkers(map, props, prefs);

  fitToMarkers(map, markers.concat(Array.from(areaMarkers.values())));

  // Add current location. Only works if protocol is https:
  enableGeolocation(map, areaMarkers);

  console.log('done!');
}
main()
