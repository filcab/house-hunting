// FIXME: This should probably be patched in mapbox-gl-leaflet
// For now, do it during map.js initialization to guarantee any created object
// is fixed.
//
// Mapbox-GL-Leaflet will throttle a function call, which will make it
// be called at most one time every X interval. If we have some of those updates
// pending when we remove the layer, they'll be called later. By then, this._map
// is undefined, so they'll crash. Monkey-patch the _update() function to check
// this._map and return immediately if it is null.
// FIXME: Couldn't repro the problem after adding this code, and couldn't break
// on the replacement function. Might not be fully working.
const old_update = L.MapboxGL.prototype._update;
L.MapboxGL.prototype._update = function() {
  if (this._map === undefined) {
    console.debug(
        'called _update after map was removed! We should send the patch to mapbox-gl-leaflet');
    return;
  }
  old_update.apply(this, arguments);
};


// TODO: Have a key file in the server, fetch it, fetch the base JSON with that
// key. If anything fails, we can't use MapTiler.
async function canFetchMapTiler() {
  // This url is embedded in the style we're using
  const mapTilerUrl = 'https://osm2vectortiles.tileserver.com/v2.json';
  const response = await fetch(mapTilerUrl, {
                     mode: 'no-cors'
                   }).catch(error => ({ok: false, error: error}));

  if (!response.ok) {
    console.debug('bad response from maptiler:', response);
    return false;
  }

  // "cast to bool" just so we always return a true/false value
  return await!!response.json().catch(function(error) {
    console.debug(`could not fetch map tiler json: ${error}`);
    return false;
  });
}

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

// Only available vector layer is mapboxGL. Try validating we have webGL and we
// can fetch the style file before we return it.
// We also save the first backup tile layer so we can replace ourselves in the
// map if we hit an error.
function getAvailableVectorLayers(layersControl, tileLayers) {
  if (!isWebGLAvailable() || (false && !canFetchMapTiler()))
    return [];

  let gl = null;
  // Depending on availability of WebGL, we might be able to use vector tiles.
  try {
    // Add OSM vector maps, display using mapboxGL
    gl = L.mapboxGL({
      style:
          'https://raw.githubusercontent.com/osm2vectortiles/mapbox-gl-styles/master/styles/bright-v9-cdn.json',
      accessToken: 'no-token'
    });
    gl.on('add', function(event) {
      // Sorry... reaching into the object as I can't find another way
      const map = event.target._map;
      gl.getMapboxMap().on('error', function(error) {
        console.log('mapbox error', error);
        layersControl.removeLayer(gl);
        if (map.hasLayer(gl)) {
          console.log('active layer was mapbox, replacing');
          gl.remove();
          // Assume there's at least one tile layer
          map.addLayer(tileLayers[0].layer);
          console.debug('replaced');
        }
      });
    });
  } catch (error) {
    console.log('internal error creating mapbox gl layer', error);
    return [];
  }
  return [{layer: gl, name: 'MapboxGL'}];
}

function createAndAttachMap(divId) {
  // Use a starting point in London. We'll call flyToBounds soon anyway.
  const map = L.map(divId, {
    center: [51.505, -0.09],
    zoom: 13,
  });

  const layersControl = L.control.layers().addTo(map);

  // We might need to remove vector layers later (on errors), so let's give it a
  // reference to the layersControl.
  const tileLayers = getAvailableTileLayers();
  const vectorLayers = getAvailableVectorLayers(layersControl, tileLayers);

  const allLayers = vectorLayers.concat(tileLayers);

  // Only add a layer to the map here, so we can add a vector one if we have one
  allLayers[0].layer.addTo(map);

  allLayers.forEach(
      layerDef => layersControl.addBaseLayer(layerDef.layer, layerDef.name));

  L.control.scale().addTo(map);
  console.log(map);
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

function setHighlightStyle(prefs, marker) {
  const p = marker.property;

  // Priority (last one sticks):
  //   "Our" highlights
  //   "Sold STC"
  //   ??
  const shouldHighlight = prefs.get('highlight').indexOf(p.id) != -1;
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
