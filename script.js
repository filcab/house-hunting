// TESTING
var map = createAndAttachMap('map');

// Test data.
// Soon we should have some way to load data dynamically. That way, a deploy
// just needs to add data.js or similar.

// Interesting areas:
// We'll draw a circle 1.6km wide around each of these. In the future, we should
// be able to have a query and ask some geocoding service. For now, hardcode
// coordinates.
const interestingAreas = {
  'Cambridge': {lat: 52.194401, lng: 0.137446},
  'Cambridge North': {lat: 52.227446, lng: 0.156565},
};

// Properties near each area. We might want to only show the ones on some areas.
const propertiesPerArea = {
  'Cambridge North': [
    // "Baits Bite Lock"
    {id: 1, loc: {lat: 52.237085, lng: 0.174802}},
  ],
  'Cambridge': [
    // Norfolk Street Bakery
    {id: 4, loc: {lat: 52.195186, lng: 0.131626}},
    // Mathematical Bridge
    {id: 5, loc: {lat: 52.202624, lng: 0.115195}},
    // Botanic Garden
    {id: 6, loc: {lat: 52.193417, lng: 0.127769}},
  ],
};

// Properties not attached to any area (they're outside all of them, or we have
// no explicit data for where they are other than coordinates)
const unsortedProperties = [
  // Random place in "Chiltern Hills"
  {id: 7, loc: {lat: 51.651666, lng: -0.854828}},
  // Bletchley Park
  {id: 8, loc: {lat: 51.997719, lng: -0.740643}},
];

// distances are in meters
const areaDiameter = 1600;
const thresholdForMapAutozoom = 1;

// Create a circle per area, make it easy to get to the objects later.
var circles = new Map(
    Object.entries(interestingAreas)
        .map(([name, loc]) => [name, circleArea(map, loc, areaDiameter)]));

// Fit the map to the circles we have
var bounds = L.latLngBounds();
for (const circle of circles.values()) {
  bounds.extend(circle.getBounds());
}
map.fitBounds(bounds);

// FIXME: Do we need these?
var id2Marker = new Map();
var area2Markers = new Map();

for (const [area, props] of Object.entries(propertiesPerArea)) {
  const areaMarkers = props.map(function(prop) {
    const marker = addProperty(map, prop);
    id2Marker.set(prop.id, marker);
    return marker;
  });
  area2Markers.set(area, areaMarkers);
}
