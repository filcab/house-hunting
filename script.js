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
    {id: 1, name: 'Prop 1', loc: {lat: 52.237085, lng: 0.174802}},
  ],
  'Cambridge': [
    // Norfolk Street Bakery
    {id: 4, name: 'Prop Quatre', loc: {lat: 52.195186, lng: 0.131626}},
    // Mathematical Bridge
    {id: 5, name: 'Prop 五', loc: {lat: 52.202624, lng: 0.115195}},
    // Botanic Garden
    {id: 6, name: 'Prop Seis', loc: {lat: 52.193417, lng: 0.127769}},
  ],
};

// Properties not attached to any area (they're outside all of them, or we have
// no explicit data for where they are other than coordinates)
const unsortedProperties = [
  // "Llamas land" is just funny
  {id: 2, name: 'Prop Due', loc: {lat: 52.196926, lng: 0.113044}},
  // Midsommer Common
  {id: 7, name: 'Prop Siete', loc: {lat: 52.210419, lng: 0.128407}},
];

// distances are in meters
const areaDiameter = 1600;
const thresholdForMapAutozoom = 1;

// Create a circle per area, make it easy to get to the objects later.
var circles = new Map(
    Object.entries(interestingAreas)
        .map(([name, loc]) => [name, circleArea(map, loc, areaDiameter)]));

// FIXME: Do we need these? Maybe later, for enabling/disabling regions
var id2Marker = new Map();
var area2Markers = new Map();

function propertyPopup(marker) {
  const prop = marker.property;
  return `Name: ${prop.name}, Coordinates: ${marker.getLatLng().toString()}`;
}

for (const [area, props] of Object.entries(propertiesPerArea)) {
  const areaMarkers = props.map(function(prop) {
    const marker = addProperty(map, prop, propertyPopup);
    id2Marker.set(prop.id, marker);
    return marker;
  });
  area2Markers.set(area, areaMarkers);
}

unsortedProperties.forEach(
    prop => id2Marker.set(prop.id, addProperty(map, prop, propertyPopup)));

// Fit the map to the markers and circles we have
var bounds = L.latLngBounds();
for (const circle of circles.values()) {
  bounds.extend(circle.getBounds());
}
for (const marker of id2Marker.values()) {
  bounds.extend(marker.getLatLng());
}
map.fitBounds(bounds);
