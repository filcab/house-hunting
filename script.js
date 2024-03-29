'use strict';
// Global data, for ease of access, mostly
document.state = {};

const isDevSite = window.location.hostname == 'localhost' ||
    window.location.pathname.includes('/dev/');

function toOldID(id) {
  return String(id).replace(/^[a-z]+/i, '');
}

// Some utility functions
// Promise: Fetch a JSON object, or return an empty array, if not possible to
// fetch
function maybeFetchJSON(path) {
  // FIXME: Don't mind connection errors, just return an empty array
  return fetch(path).then(function(response) {
    if (!response.ok) {
      // TODO: Maybe have a better way to report errors to user
      console.warn(`Failed request to ${response.url}: ${response.status} ${response.statusText}`);
      return [];
    }
    return response.json()
  });
}

// Promise: Merge an array of maybeFetchJSON results
async function fetchMergeJSONArrays(files) {
  const reqs = files.map(maybeFetchJSON);
  const array = await Promise.all(reqs)
  return array.flat();
}

function drawInterestingAreas(state, map, areas) {
  return areas
      .map(function(area) {
        const marker = drawArea(state.prefs, area);
        area.marker = marker;
        return marker;
      })
      // Remove unknown area types
      .filter(Boolean);
}

const poiSymbols = {
  school: '🏫',
};

function markerContent(poi) {
  const marker = utils.div('marker-label');
  const content = utils.div('marker-label-content', marker);
  content.textContent = poiSymbols[poi.kind];
  utils.div('marker-label-arrow', marker);
  return marker;
}

function poiMarker(state, poi) {
  const options = {
    icon: L.divIcon({
      className: `marker-poi`,
      html: markerContent(poi),
      iconAnchor: L.point(0, 0)
    })
  };

  const marker = L.marker(poi.loc, options);
  marker.bindPopup(poiPopup.bind({}, state, poi, marker));
  marker.on('add', layer => {
    updateMarkerHighlightStyle(state, poi, marker);
  });
  return marker;
}

function drawPOIs(state, pois) {
  const layers = {};
  const poiMarkers = new Map();

  const groupedPois = utils.groupBy(pois, 'kind');
  // Further group schools by phase
  groupedPois.school = utils.groupBy(groupedPois.school, 'phase')

  for (const [kind, group] of Object.entries(groupedPois)) {
    if (Array.isArray(group)) {
      // No subgroups
      console.assert(group.length > 0);
      const layer = L.layerGroup([]);
      for (const obj of group) {
        const marker = poiMarker(state, obj);
        marker.addTo(layer);
        poiMarkers.set(obj.id, marker.addTo(layer));
      }
      console.assert(layers[kind] === undefined);
      layers[kind] = layer;
    } else {
      for (const [subgroup, objs] of Object.entries(group)) {
        const name =
            `${kind.charAt(0).toUpperCase() + kind.slice(1)} - ${subgroup}`;
        const layer = L.layerGroup([]);
        for (const obj of objs) {
          const marker = poiMarker(state, obj);
          marker.addTo(layer);
          poiMarkers.set(obj.id, marker.addTo(layer));
        }
        console.assert(layers[name] === undefined);
        layers[name] = layer;
      }
    }
  }

  return layers;
}

function drawMarkers(state, map, props) {
  // Add markers for all the properties we care about
  return Array.from(props.values(), function(prop) {
    const marker = addProperty(state, prop, propertyPopup.bind({}, state));
    // Cheat for now. We should change things so markers have a propID, but not
    // a property pointer. That way we can treat manually-added properties the
    // same way as other properties.
    // FIXME: Properly split property definitions (persistent) from added
    // information (transient information (e.g: markers)).
    Object.defineProperty(prop, 'marker', {enumerable: false, value: marker});
    return marker;
  });
}

function adjustTitleIfDev() {
  // Don't ever set more than once
  if (document.title.endsWith(' (dev)'))
    return;

  if (isDevSite)
    document.title += ' (dev)'
}

function applyPreferencesToProperties(prefs, props) {
  for (const [name, propIDs] of Object.entries(prefs.highlights)) {
    propIDs.forEach(function(id) {
      const prop = props.get(id);
      if (prop === undefined) {
        // FIXME: Add a proper (user-visible) warning
        console.warn(`Property ID #${
            id} has a highlight, but the property doesn't exist!`);
        return;
      }
      props.get(id).highlights.push(name);
    });
  }

  const subsequentlyRemoved = [];
  for (const [id, date] of Object.entries(prefs.scheduled)) {
    // Assume well-formed. Force string as manually added properties are
    // integers for ease of applying max/min.
    if (!props.has(String(id))) {
      subsequentlyRemoved.push(id);
      continue;
    }
  }

  // FIXME: For now, there's not much a user can do... fix it
  if (isDevSite && subsequentlyRemoved.length)
    alert(`These properties got removed, but are still scheduled: ${subsequentlyRemoved}`);
}

function initializeProp(prop) {
  prop.highlights = prop.highlights || [];
  return prop;
}

// Assume we can start at 0 and increment and never run into the IDs from the other sites.
// TODO: Maybe namespace this
function nextPropId(state) {
  // NEWID: TODO: Might need to change if we change id format (we might keep manually added props prefix-less)
  const numericIDs = [0, ...state.prefs.manuallyAdded.map(p => p.id)];
  const nextID = Math.max.apply({}, numericIDs) + 1;
  console.assert(isFinite(nextID));
  return nextID;
}

function element(type) {
  const e = document.createElement(type);
  return e;
}

function buildSchedule(prefs) {
  const dateOptions = {year: 'numeric', month: '2-digit', day: '2-digit'};
  const timeOptions = {hour: '2-digit', minute: '2-digit'};
  const items = Array.from(Object.entries(prefs.scheduled));
  // Our dates are written as ISO strings, starting with year, etc.
  items.sort((a, b) => a[1].localeCompare(b[1]));

  const sched = utils.div('schedule-div');
  let currentDate;
  for (const item of items) {
    const date = new Date(item[1]);
    if (date.toLocaleDateString() !== currentDate) {
      currentDate = date.toLocaleDateString();
      const dateDiv = utils.div('schedule-date');
      dateDiv.textContent = date.toLocaleDateString(undefined, dateOptions);
      sched.appendChild(dateDiv);
    }

    const timeDiv = utils.div('schedule-time');
    timeDiv.textContent = date.toLocaleTimeString(undefined, timeOptions);
    sched.appendChild(timeDiv);
  }

  return sched;
}

function tryUpgradingPreferencePropIDs(prefs, props) {
  for (const name in prefs.highlights) {
    const list = prefs.highlights[name];
    console.log(name, list);
    // Clone the list so we can alter the original
    for (const id of Array.from(list)) {
      console.log('trying to upgrade', id);
      for (const prefix of ['RM', 'OTM', 'ZO']) {
        // Already updated
        if (Number(id) == 0)
          continue;

        const newId = `${prefix}${id}`;
        const idx = list.indexOf(id);
        const p = props.get(newId);
        if (idx !== -1 && p !== undefined) {
          console.log(`upgrading highlight for propid ${id} -> ${newId}`);
          console.assert(idx != -1);
          list[idx] = newId;
        }
      }
    }
  }
}

async function main(state) {
  adjustTitleIfDev();

  const config = await fetch('config.json').then(function(response) {
    if (response.ok === false) {
      return fetch('test-config.json').then(x => x.json());
    }
    return response.json();
  });
  console.log(config);

  const prefs = await loadPreferences();
  state.prefs = prefs;
  console.info('prefs', prefs);
  const areas = await fetchMergeJSONArrays(config.areas);
  state.areas = areas;
  console.info('areas', areas);
  const fetchedProps = await fetchMergeJSONArrays(config.data);
  const propList = [...prefs.manuallyAdded, ...fetchedProps];
  const props = new Map(propList.map(prop => [prop.id, initializeProp(prop)]));

  tryUpgradingPreferencePropIDs(prefs, props);

  state.props = props;
  console.info('props', props);

  applyPreferencesToProperties(prefs, props);

  const map = createAndAttachMap('map');
  state.map = map;

  // We should be able to turn off the areas, from the Layers Control
  const areaMarkers = drawInterestingAreas(state, map, areas);
  const areaLayer = L.layerGroup(areaMarkers);
  areaLayer.addTo(map.leafletMap);
  map.layersControl.addOverlay(areaLayer, "Walking distances");
  const markers = drawMarkers(state, map, props);

  fitToMarkers(map, markers.concat(Array.from(areaMarkers.values())));

  // For now, all POIs are the same. Afterwards, we'll split them into different types
  const poisArray =
      config.pois !== undefined ? await fetchMergeJSONArrays(config.pois) : [];
  const poisLayers = poisArray.length !== 0 ? drawPOIs(state, poisArray) : {};
  for (const [name, layer] of Object.entries(poisLayers))
    map.layersControl.addOverlay(layer, name);

  map.scheduleControl =
      L.control.schedule({builder: buildSchedule.bind({}, prefs)})
          .addTo(map.leafletMap);

  // Add current location. Only works if protocol is https:
  enableGeolocation(map, areaMarkers);

  // On map click, open a popup to add a property at that coordinate
  map.leafletMap.on('contextmenu', function(ev) {
    console.log('contextmenu!', ev);
    // By default, make it harder to close
    const options = {
      maxWidth: popupMaxWidth,
      closeOnClick: false
    };
    const coords = ev.latlng;
    // We won't have two of these popups open at the same time, we can re-use
    // the ID if it was canceled.
    const popup = L.popup(options).setLatLng(coords);
    popup.setContent(addPropertyPopup(state, popup, ev.latlng));
    this.openPopup(popup);
  });

  console.info('done!');
}
main(document.state)
