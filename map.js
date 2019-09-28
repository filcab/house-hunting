function createAndAttachMap(divId) {
  // Use a starting point in London. We'll call fitBounds soon anyway.
  var map = L.map(divId).setView([51.505, -0.09], 13);

  // Use OSM tiles for now. Maybe have a selector
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
     attribution:
         '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
   }).addTo(map);

  return map;
}

// Higher-level function to draw a circle around an "interesting area"
function circleArea(map, name, loc, diameter) {
  const circle = L.circle(loc, {
    color: '#a00',
    opacity: 0.5,
    weight: 1,
    fillColor: '#0a0',
    fillOpacity: 0.1,
    radius: diameter,
  });
  circle.bindTooltip(name);
  circle.addTo(map);
  return circle;
}

function addProperty(map, p, popupFunction) {
  // Add marker
  const marker = L.marker(p.loc);
  marker.property = p;
  marker.bindPopup(popupFunction);
  marker.addTo(map);
  return marker;
}

function fitToMarkers(map, markers) {
  const featureGroup = new L.featureGroup(markers);
  map.fitBounds(featureGroup.getBounds());
}
