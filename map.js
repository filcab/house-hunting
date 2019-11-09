'use strict';
function getAvailableTileLayers() {
  // Regular OSM server
  const osm = {
    name: 'OpenStreetMap',
    urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    options: {
      detectRetina: true,
      attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  };

  // Wikimedia server, has 2x images
  const wikimedia = {
    name: 'Wikimedia',
    urlTemplate: 'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}{r}.png',
    options: {
      attribution:
          '&copy; <a href="https://foundation.wikimedia.org/w/index.php?title=Maps_Terms_of_Use#Where_does_the_map_data_come_from.3F">WikiMedia Int</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }
  };

  return [wikimedia, osm].map(function(descriptor) {
    const options = descriptor.options;
    return {
      layer: L.tileLayer(descriptor.urlTemplate, options),
      name: descriptor.name
    };
  });
}

// Only available vector layer type is mapboxGL. Try validating we have webGL
// before we use it.
function getAvailableVectorLayers() {
  if (!utils.isWebGLAvailable() || (false && !canFetchMapTiler()))
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
  const map = {};
  // Use a starting point in London. We'll call flyToBounds soon anyway.
  map.leafletMap = L.map(divId, {
    center: [51.505, -0.09],
    zoom: 13,
  });


  map.tileLayers = getAvailableTileLayers();
  map.vectorLayers = getAvailableVectorLayers();

  const allLayers = map.vectorLayers.concat(map.tileLayers);
  // Add the best layer (vectors have priority) to the map
  allLayers[0].layer.addTo(map.leafletMap);

  map.layersControl = L.control.layers();
  allLayers.forEach(obj => map.layersControl.addBaseLayer(obj.layer, obj.name));

  // Add misc controls to map
  map.layersControl.addTo(map.leafletMap);
  L.control.scale().addTo(map.leafletMap);

  return map;
}

function footAreaStyle(area) {
  // Compare against certain circle areas for deciding how to colour isochrones.
  // Radius in m, area in m^2
  const radius2Area = r => Math.PI * r * r;

  let color = '#ff0055';
  let opacity = 0.0125;
  if (area < radius2Area(750)) {
    color = '#00ff55';
    opacity = 0.10;
  } else if (area < radius2Area(1000)) {
    color = '#aaff55';
    opacity = 0.05;
  } else if (area < radius2Area(1500)) {
    color = '#ffaa55';
    opacity = 0.025;
  }

  return {
    color: color,
    fillOpacity: opacity,
    weight: 1,
  };
}

function compareFeatureArea(f1, f2) {
  return f2.area - f1.area;
}

function drawGeoJSONArea(prefs, area) {
  // First, make sure the feature group is sorted according to the area size
  area.geojson.features.sort(compareFeatureArea);
  const drawn = L.geoJSON(area.geojson, {
    style: feature => footAreaStyle(feature.properties.area),
    attribution: area.attribution
  });
  drawn.area = area;
  return drawn;
}

function drawArea(prefs, area) {
  if (area.type == 'geojson')
    return drawGeoJSONArea(prefs, area);

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
    radius: area.radius,
  });
  circle.area = area;
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
    return window.innerWidth * 0.90;
  }
}
const popupMaxWidth = calculatePopupMaxWidth();

function updateMarkerHighlightStyle(state, obj, marker) {
  const markerClasses =
      ['marker-ok', 'marker-ng', 'marker-sold', 'marker-scheduled'];
  // Remove all out marker classes first, then re-add whichever we need
  marker._icon.classList.remove.apply(marker._icon.classList, markerClasses);

  // Priority (first one to match):
  //   sold
  //   scheduled
  //   ng
  //   ok
  // We shouldn't really have ok + ng, though

  if (obj.tags && obj.tags.includes('Sold STC')) {
    marker.getElement().classList.add('marker-sold');
    return;
  }

  const schedule = getScheduleFor(state.prefs, obj);
  if (schedule !== undefined) {
    marker.getElement().classList.add(`marker-scheduled`);
    // Don't return. Allow ok/ng to override scheduled class
  }

  const highlights = state.prefs.highlights;
  for (const type of ['ng', 'ok']) {
    const props = highlights[type];
    // NEWID: TODO: Need to remove the older ID code path
    let shouldHighlight = props.indexOf(obj.id) != -1;
    shouldHighlight |= props.indexOf(toOldID(obj.id)) != -1;
    if (shouldHighlight) {
      marker.getElement().classList.add(`marker-${type}`);
      return;
    }
  }
}

function addProperty(state, p, popupFunction) {
  const marker = L.marker(p.loc);
  marker.property = p;
  marker.bindPopup(popupFunction, {maxWidth: popupMaxWidth});
  marker.addTo(state.map.leafletMap);

  // Add a class to tag this as a property marker
  marker._icon.classList.add('marker-property');

  // Has to be called only after adding to the map, otherwise we don't have an
  // element/style yet
  updateMarkerHighlightStyle(state, p, marker)

  return marker;
}

function fitToMarkers(map, markers) {
  const featureGroup = new L.featureGroup(markers);
  console.debug('fitting to:', featureGroup.getBounds());
  map.leafletMap.flyToBounds(featureGroup.getBounds());
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
        areaMarkers.forEach((circle, name, Map) => bounds.extend(circle.getBounds()));
      }
      return locationEvent.bounds;
    },

    locationOptions: {
      enableHighAccuracy: true,
    },
  };

  const control = L.control.locate(options).addTo(map.leafletMap);
  // Add a user-triggered (mandatory) request for orientation information,
  // otherwise we don't get a compass from Leaflet.Locate
  L.DomEvent.on(control._link, 'click', function() {
    if (!askedForOrientation && window.DeviceOrientationEvent) {
      askedForOrientation = true;
      DeviceOrientationEvent.requestPermission();
    }
  });
}
