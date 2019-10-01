// All map-related functions called in this file should be abstract regarding
// the map being used. We've only tested one map library, but hopefully it's
// abstracted enough.
var map = createAndAttachMap('map');

// Add current location control from Leaflet.Locate plugin, but only if we're
// serving through https
if (window.location.protocol == 'https:')
  L.control.locate().addTo(map);

// Distances are in meters
const areaDiameter = 1600;

// Actual data (not committed)
const dataFiles = ['data.json', 'data-otm.json'];
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
const interestingAreas = fetchMergeJSONArrays(areas).then(
    areas => ifEmptyFetchTests(areas, testAreas));
// Create a circle per area, keep them in a dict
const circles = interestingAreas.then(function(areas) {
  const kv_pairs =
      areas
          .map(function(area) {
            return Object.entries(area).map(
                ([name,
                  loc]) => [name, circleArea(map, name, loc, areaDiameter)])
          })
          .flat();
  return new Map(kv_pairs);
});

// Now add markers for all the properties we care about
const data = fetchMergeJSONArrays(dataFiles).then(
    data => ifEmptyFetchTests(data, testFiles));

Promise.all([circles, data]).then(function([circles, data]) {
  // Add markers and fit the map to them. No need to keep track of the markers,
  // as any click on them will be able to access the property.
  const markers = data.map(p => addProperty(map, p, propertyPopup));
  fitToMarkers(map, markers.concat(Array.from(circles.values())));
  console.log('done!');
});
