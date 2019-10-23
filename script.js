'use strict';
// Global data, for ease of access, mostly
document.state = {};

// global utility functions (FIXME: Remove them and thread the state object
// through). These functions are only valid after the initial part of the main()
// function
const getPrefs = () => document.state.prefs;
const getAreas = () => document.state.areas;
const getProps = () => document.state.props;

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

function drawMarkers(state, map, props) {
  // Add markers for all the properties we care about
  return Array.from(props.values(), function(prop) {
    const marker = addProperty(state, map, prop, propertyPopup.bind({}, state));
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

  if (window.location.hostname == 'localhost' ||
      window.location.pathname.includes('/dev/'))
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
  for (const [idString, date] of Object.entries(prefs.scheduled)) {
    // Assume well-formed
    const id = Number(idString);
    if (!props.has(id)) {
      subsequentlyRemoved.push(id);
      continue;
    }

    // Assume dates are ok (they should be if we've set them)
    // Not much we can do: keys in JSON *must* be strings
    // I'm unsure what the best practices are in JS. For now, handling this
    // manually by converting what we get from keys from preferences into
    // numbers to get props by ID.
    props.get(id).scheduled = new Date(date);
  }

  // FIXME: For now, there's not much a user can do... fix it
  if (subsequentlyRemoved.length)
    alert(`These properties got removed, but are still scheduled: ${subsequentlyRemoved}`);
}

function initializeProp(prop) {
  prop.highlights = prop.highlights || [];
  return prop;
}

// Assume we can start at 0 and increment and never run into the IDs from the other sites.
// TODO: Maybe namespace this
function nextPropId() {
  const numericIDs = [0, ...getPrefs().manuallyAdded.map(p => p.id)];
  const nextID = Math.max.apply({}, numericIDs) + 1;
  console.assert(isFinite(nextID));
  return nextID;
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

  map.scheduleControl = L.control.schedule().addTo(map.leafletMap);

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
    popup.setContent(addPropertyPopup(state, map, popup, ev.latlng));
    this.openPopup(popup);
  });

  console.info('done!');
}
main(document.state)
