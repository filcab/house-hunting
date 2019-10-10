function getAvailableTileLayers() {
  // Regular OSM server
  const osm = {
    name: 'OpenStreetMap',
    urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  };

  // Wikimedia server, has 2x images
  const wikimedia = {
    name: 'Wikimedia',
    urlTemplate: 'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}{r}.png',
    attribution:
        '&copy; <a href="https://foundation.wikimedia.org/w/index.php?title=Maps_Terms_of_Use#Where_does_the_map_data_come_from.3F">WikiMedia Int</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  };

  return [wikimedia, osm].map(function(descriptor) {
    return {
      layer: L.tileLayer(descriptor.urlTemplate, {
        attribution: descriptor.attribution,
      }),
      name: descriptor.name
    };
  });
}

// Only available vector layer type is mapboxGL. Try validating we have webGL
// before we use it.
function getAvailableVectorLayers() {
  if (!isWebGLAvailable() || (false && !canFetchMapTiler()))
    return [];

  // Add UK Ordnance Survey maps, display using mapboxGL
  const style_names = ['outdoor', 'road', 'light', 'night'];
  return style_names.map(function(style) {
    return {
      name: `UK OS ${style}`,
      layer: L.mapboxGL({
        accessToken: 'no-token',
        style:
            `https://s3-eu-west-1.amazonaws.com/tiles.os.uk/v2/styles/open-zoomstack-${style}/style.json`,
        attribution:
            'Contains OS data &copy; Crown copyright and database rights 2018',
      })
    };
  });
}

function createAndAttachMap(divId) {
  // Use a starting point in London. We'll call flyToBounds soon anyway.
  const map = L.map(divId, {
    center: [51.505, -0.09],
    zoom: 13,
  });


  const tileLayers = getAvailableTileLayers();
  const vectorLayers = getAvailableVectorLayers();

  const allLayers = vectorLayers.concat(tileLayers);
  // Add the best layer (vectors have priority) to the map
  allLayers[0].layer.addTo(map);

  const layersControl = L.control.layers();
  allLayers.forEach(obj => layersControl.addBaseLayer(obj.layer, obj.name));

  // Add misc controls to map
  layersControl.addTo(map);
  L.control.scale().addTo(map);
  return map;
}

function drawArea(prefs, map, area, diameter) {
  if (area.type != 'circle') {
    console.error(`Unknown area type: ${area.type}. Ignoring`);
    return;
  }
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

function setHighlightStyle(prefs, marker) {
  const p = marker.property;

  // Priority (last one sticks):
  //   "Our" highlights
  //   "Sold STC"
  //   ??
  const shouldHighlight = prefs.highlight.indexOf(p.id) != -1;
  if (shouldHighlight)
    marker.getElement().classList.add('marker-highlight');

  if (p.tags && p.tags.includes('Sold STC'))
    marker.getElement().classList.add('marker-sold');
}

function addProperty(prefs, map, p, popupFunction) {
  const marker = L.marker(p.loc);
  marker.property = p;

  marker.bindPopup(popupFunction, {maxWidth: popupMaxWidth});
  marker.addTo(map);

  // Has to be called only after adding to the map, otherwise we don't have an
  // element/style yet
  setHighlightStyle(prefs, marker)

  return marker;
}

function fitToMarkers(map, markers) {
  const featureGroup = new L.featureGroup(markers);
  console.debug('fitting to:', featureGroup.getBounds());
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
