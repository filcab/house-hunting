//// First, create an object containing LatLng and population for each city.
const cities = {
  // important keys, unimportant values, for now
  "Cambridge": 1,
  "Oxford": 1,
};

const propertiesPerCity = {
  "Cambridge": [
    // Castle
    {id: 1, loc: {lat: 51.752141, lng: -1.263379}},
    // Natural History Museum
    {id: 2, loc: {lat: 51.759101, lng: -1.255483}},
    // Covered Market
    {id: 3, loc: {lat: 51.753257, lng: -1.256685}},
  ],
  "Oxford": [
    // Norfolk Street Bakery
    {id: 4, loc: {lat: 52.195186, lng: 0.131626}},
    // Mathematical Bridge
    {id: 5, loc: {lat: 52.202624, lng: 0.115195}},
    // Botanic Garden
    {id: 6, loc: {lat: 52.193417, lng: 0.127769}},
  ],
};

const unsortedProperties = [
  // Random place in "Chiltern Hills"
  {id: 7, loc: {lat: 51.651666, lng: -0.854828}},
  // Bletchley Park
  {id: 8, loc: {lat: 51.997719, lng: -0.740643}},
];

// distances are in meters
const maxDistanceToStation = 1600;
const thresholdForMapAutozoom = 1;

var g_map;
var g_circles = {};
var g_bounds = new google.maps.LatLngBounds();

function drawStationCircle(map, name, loc) {
  g_circles[name] = new google.maps.Circle({
    strokeColor: '#aa0000',
    strokeOpacity: 0.5,
    strokeWeight: 1,
    fillColor: '#00aa00',
    fillOpacity: 0.1,
    map: map,
    center: loc,
    radius: maxDistanceToStation,
  });
}

function addStation(map, place) {
  console.log(place.name);
  var loc = place.geometry.location;
  console.log(loc.toString());

  drawStationCircle(map, place.name, loc);

  // fitBounds() if the user didn't change the map center.
  const distanceToMapCenter = google.maps.geometry.spherical.computeDistanceBetween(g_bounds.getCenter(), map.getCenter());
  console.log("Distance: " + distanceToMapCenter);
  // Initially, the bounds are empty. Don't try to measure distance to center if so.
  const shouldFitBounds = g_bounds.isEmpty() || distanceToMapCenter < thresholdForMapAutozoom;

  g_bounds.extend(loc);
  if (shouldFitBounds) {
    console.log("Calling fitBounds()");
    map.fitBounds(g_bounds);
  }
}

function placeCallback(results, maybe_ok) {
  var res = results[0];
  console.log(maybe_ok + ' result (' + results.length + '): ' + res.name);
  addStation(g_map, res);
}

function initMap() {
  console.log("Starting");
  // Create the map.
  g_map = new google.maps.Map(document.getElementById('map'), {
    zoom: 13,
    center: {
      lat: 0,
      lng: 0
    },
    mapTypeId: 'hybrid'
  });

  var placeService = new google.maps.places.PlacesService(g_map);

  // Send the queries
  for (var city in cities) {
    var req = {
      query: city + ' station',
      fields: ['name', 'geometry.location']
    };
    console.log("Requesting data for: " + city);
    placeService.findPlaceFromQuery(req, placeCallback);
  }
}
