function createAndAttachMap(divId) {
  // Use a starting point in London. We'll call flyToBounds soon anyway.
  const map = L.map(divId, {
    center: [51.505, -0.09],
    zoom: 13,
  });

  // Depending on availability of WebGL, we might be able to use vector tiles.
  if (isWebGLAvailable()) {
    // Add OSM vector maps, display using mapboxGL
    L.mapboxGL({
       style:
           'https://raw.githubusercontent.com/osm2vectortiles/mapbox-gl-styles/master/styles/bright-v9-cdn.json',
       accessToken: 'no-token'
     }).addTo(map);
  } else {
    const osmLayers = {
      // Regular OSM server
      1: {
        urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      },
      // Wikimedia server, has 2x images
      2: {
        urlTemplate:
            'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}@2x.png',
        attribution:
            '&copy; <a href="https://foundation.wikimedia.org/w/index.php?title=Maps_Terms_of_Use#Where_does_the_map_data_come_from.3F">WikiMedia Int</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      },
    };

    // Try to get the layer using the devidePixelRatio, fall back to the non-retina one
    const osmLayer = osmLayers[window.devicePixelRatio] || osmLayers[1];
    //const osmLayer = osmLayers[1];
    L.tileLayer(osmLayer.urlTemplate, {
       attribution: osmLayer.attribution,
     }).addTo(map);
  }

  return map;
}

// Higher-level function to draw a circle around an "interesting area"
function circleArea(prefs, map, area, diameter) {
  const circle = L.circle(area.loc, {
    color: '#a00',
    opacity: 0.5,
    weight: 1,
    fillColor: '#0a0',
    fillOpacity: 0.05,
    radius: diameter,
  });
  circle.area = area;
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
  const marker = L.marker(p.loc);
  marker.property = p;

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
  console.log('fitting to:', featureGroup.getBounds());
  map.flyToBounds(featureGroup.getBounds());
}

let askedForOrientation = false;
function enableGeolocation(map, areaMarkers) {
  // Only enable Leaflet.Locate plugin if we're on https:, otherwise it won't
  // work.
  if (window.location.protocol != 'https:')
    return;

  const options = {
    getLocationBounds: function(locationEvent) {
      // FIXME: This is probably being shallow copied only :-(
      const origBounds = locationEvent.bounds;

      let found = false;
      for (const area of areaMarkers) {
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
        areaMarkers.forEach((circle, name, map) => bounds.extend(circle.getBounds()));
      }
      return locationEvent.bounds;
    },

    locationOptions: {
      enableHighAccuracy: true,
    },
  };

  const control = L.control.locate(options).addTo(map);
  // Add a user-triggered (mandatory) request for orientation information,
  // otherwise we don't get a compass from Leaflet.Locate
  L.DomEvent.on(control._link, 'click', function() {
    if (!askedForOrientation && window.DeviceOrientationEvent) {
      askedForOrientation = true;
      DeviceOrientationEvent.requestPermission();
    }
  });
}
