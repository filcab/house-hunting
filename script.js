// All map-related functions called in this file should be abstract regarding
// the map being used. We've only tested one map library, but hopefully it's
// abstracted enough.
const map = createAndAttachMap('map');

// Add current location. Only works if protocol is https:
enableGeolocation(map);

// Distances are in meters
const areaDiameter = 1600;

// Actual data (not committed)
const dataFiles = ['data-rm.json', 'data-otm.json'];
const areas = ['areas.json'];
// Test data, as an example
const testFiles = ['test-data.json'];
const testAreas = ['test-areas.json'];

// Some utility functions
// Promise: Fetch a JSON object, or return an empty array, if not possible to
// fetch
function maybeFetchJSON(path) {
  // FIXME: Don't mind 404 errors, just return an empty array
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
function fetchMergeJSONArrays(files) {
  const reqs = files.map(maybeFetchJSON);
  return Promise.all(reqs).then(array => array.flat());
}

// Promise: If the input is empty, fetch the test JSON arrays
function ifEmptyFetchTests(data, tests) {
  if (data.length == 0) {
    console.log(`data not found, fetching test data from ${tests}`);
    return fetchMergeJSONArrays(tests);
  }
  return data;
}

// Interesting areas:
// We'll draw a circle ${areaDiameter} wide around each of these. In the future,
// we should be able to have a query and ask some geocoding service. For now,
// hardcode coordinates.
async function drawInterestingAreas() {
  const interestingAreas =
      await fetchMergeJSONArrays(areas).then(function(areas) {
        console.log(areas);
        return ifEmptyFetchTests(areas, testAreas);
      });

  // Create a circle per area
  const kv_pairs = interestingAreas.map(function(area) {
    return Object.entries(area).map(
        ([name, loc]) => [name, circleArea(map, name, loc, areaDiameter)])
  });

  // Return a map of area_name -> circle
  return new Map(kv_pairs.flat());
}

async function drawMarkers() {
  // Add markers for all the properties we care about
  const data = await fetchMergeJSONArrays(dataFiles).then(
      data => ifEmptyFetchTests(data, testFiles));
  const markers = data.map(p => addProperty(map, p, propertyPopup));
  return markers;
}

const userPrefsPromise = UserPreferences();
userPrefsPromise.then(async function(userPrefs) {
  console.log(userPrefs);

  const areas = await drawInterestingAreas();
  console.log(areas);
  console.log(Array.from(areas.values()));
  const markers = await drawMarkers();

  fitToMarkers(map, markers.concat(Array.from(areas.values())));
  console.log('done!');
});
