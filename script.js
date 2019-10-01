function element(type) {
  var e = document.createElement(type);
  return e;
}

function div(className) {
  var d = element('div');
  d.className = className;
  return d;
}

function span(className) {
  var s = element('span');
  s.className = className;
  return s;
}

function img(url) {
  var i = element('img');
  i.src = url;
  return i;
}

function anchor(url, text) {
  var a = element('a');
  a.textContent = text;
  a.setAttribute('href', url);
  return a;
}

// Function that builds a popup for a marker.
function propertyPopup(marker) {
  const prop = marker.property;
  var contents = div('popup-contents');

  var photos = div('popup-photos');
  contents.appendChild(photos);
  var mainPhoto = div('popup-photos-main');
  if (prop.imgs && prop.imgs[0]) mainPhoto.appendChild(img(prop.imgs[0]));
  photos.appendChild(mainPhoto);

  if (prop.imgs.length == 1) {
    // Cheat and make this take the whole width since we only have a single
    // photo
    mainPhoto.style.width = '100%';
  } else {
    var otherPhotos = div('popup-photos-other');
    if (prop.imgs && prop.imgs[1]) otherPhotos.appendChild(img(prop.imgs[1]));
    if (prop.imgs && prop.imgs[2]) otherPhotos.appendChild(img(prop.imgs[2]));
    photos.appendChild(otherPhotos);
  }

  var info = div('popup-info');
  contents.appendChild(info);

  var priceAndPhone = div('popup-price-and-phone');
  var price = span('popup-price');
  const priceStr =
      `${prop.price.display}${prop.price.qual ? ' ' + prop.price.qual : ''}`;
  price.textContent = priceStr;
  priceAndPhone.appendChild(price);

  var spacer = span('popup-spacer');
  priceAndPhone.appendChild(spacer);

  var phone = span('popup-phone');
  phone.textContent = prop.agent.phone;
  priceAndPhone.appendChild(phone);

  info.appendChild(priceAndPhone);

  var description = div('popup-description');
  description.appendChild(anchor(prop.url, prop.desc));
  info.appendChild(description);

  var location = div('popup-location');
  location.textContent = prop.addr;
  info.appendChild(location);

  var summary = div('popup-summary');
  summary.textContent = prop.summary;
  info.appendChild(summary);

  return contents;
}

// All map-related functions called in this file should be abstract regarding
// the map being used. We've only tested one map library, but hopefully it's
// abstracted enough.
var map = createAndAttachMap('map');

// Add current location control from Leaflet.Locate plugin, but only if we're
// serving through https
if (window.location.protocol == 'https:') L.control.locate().addTo(map);

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
