function createAndAttachMap(divId) {
  // Use a starting point in London. We'll call fitBounds soon anyway.
  const map = L.map(divId).setView([51.505, -0.09], 13);

  // Use OSM tiles for now. Maybe have a selector
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
     attribution:
         '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
     detectRetina: true,
   }).addTo(map);

  return map;
}

// Higher-level function to draw a circle around an "interesting area"
function circleArea(prefs, map, name, loc, diameter) {
  const circle = L.circle(loc, {
    color: '#a00',
    opacity: 0.5,
    weight: 1,
    fillColor: '#0a0',
    fillOpacity: 0.05,
    radius: diameter,
  });
  circle.addTo(map);
  return circle;
}

// maxWidth will depend on screen type:
//   phones/etc: most/all of the screen
//   tablet/computer: A "decent" size
// FIXME: Using window.innerWidth as I don't know what else to use
function calculatePopupMaxWidth() {
  // I guess this is good enough to distinguish between laptop/tablet and phone?
  if (window.innerWidth > 1024) {
    return window.innerWidth * 0.40;
  } else {
    return window.innerWidth * 0.85;
  }
}
const popupMaxWidth = calculatePopupMaxWidth();

function addProperty(prefs, map, p, popupFunction) {
  // Add marker
  const marker = L.marker(p.loc);
  marker.property = p;
  // FIXME: We might want to set this to *a lot* (screen width, maybe?) and then
  // trim it down with CSS, depending on the type of screen
  marker.bindPopup(popupFunction, {maxWidth: popupMaxWidth});
  marker.addTo(map);

  // FIXME: Maybe deal with this elsewhere?
  // FIXME: Add some listener so we can toggle on/off easily
  // FIXME: Unsure if there's a better way. Leaflet doesn't seem to allow us to
  // change marker style
  const shouldHighlight = prefs.get('highlight').indexOf(p.id) != -1;
  if (shouldHighlight)
    marker.getElement().classList.add('marker-highlight');
  return marker;
}

function fitToMarkers(map, markers) {
  const featureGroup = new L.featureGroup(markers);
  map.fitBounds(featureGroup.getBounds());
}

let askedForOrientation = false;
function enableGeolocation(map, areas) {
  // Only enable Leaflet.Locate plugin if we're on https:, otherwise it won't
  // work.
  if (window.location.protocol != 'https:')
    return;

  const options = {
    getLocationBounds: function(locationEvent) {
      // FIXME: This is probably being shallow copied only :-(
      const origBounds = locationEvent.bounds;

      let found = false;
      for (const area of areas) {
        const circle = area[1];
        const bounds = circle.getBounds();
        // Compare against original bounds, as we don't want to grow too much
        // when we have overlapping areas
        if (bounds.contains(origBounds)) {
          found = true;
          locationEvent.bounds.extend(bounds);
        }
      }

      if (!found) {
        const bounds = locationEvent.bounds;
        areas.forEach((circle, name, map) => bounds.extend(circle.getBounds()));
      }
      return locationEvent.bounds;
    },

    locationOptions: {
      enableHighAccuracy: true,
    },
  };

  const control = L.control.locate(options).addTo(map);
  // Add a user-triggered (mandatory) request for orientation information
  L.DomEvent.on(control._link, 'click', function() {
    if (!askedForOrientation && window.DeviceOrientationEvent) {
      askedForOrientation = true;
      DeviceOrientationEvent.requestPermission().then(alert);
    }
  });
}
