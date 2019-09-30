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

// maxWidth will depend on screen type:
//   phones/etc: most/all of the screen
//   tablet/computer: A "decent" size
function calculatePopupMaxWidth() {
  // I guess this is good enough to distiniguish between laptop/tablet and
  // phone?
  if (window.innerWidth > 1024) {
    return window.innerWidth * 0.40;
  } else {
    return window.innerWidth * 0.85;
  }
  //return width * window.devicePixelRatio;
}
const popupMaxWidth = calculatePopupMaxWidth();
function addProperty(map, p, popupFunction) {
  // Add marker
  const marker = L.marker(p.loc);
  marker.property = p;
  // FIXME: We might want to set this to *a lot* (screen width, maybe?) and then
  // trim it down with CSS, depending on the type of screen
  marker.bindPopup(popupFunction, { maxWidth: popupMaxWidth });
  marker.addTo(map);
  return marker;
}

function fitToMarkers(map, markers) {
  const featureGroup = new L.featureGroup(markers);
  map.fitBounds(featureGroup.getBounds());
}
