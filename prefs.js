const PREFS_URL = 'dynamic/preferences';

function makeDefaultPrefs() {
  return {
    highlights: {scheduled: [], ok: [], ng: []},
    scheduled: {},
    manuallyAdded: [],
  };
}

function autoUpgradePreferences(prefs) {
  if (prefs.highlight) {
    const oldHighlights = prefs.highlight;
    delete prefs.highlight;
    prefs.highlights = { 'scheduled': oldHighlights };
  }

  // Make sure our highlight arrays exists
  for (const name of ['ng', 'ok', 'scheduled'])
      prefs.highlights[name] = prefs.highlights[name] || [];

  prefs.scheduled = (prefs.scheduled || {});
  prefs.manuallyAdded = (prefs.manuallyAdded || []);
  return prefs;
}

// Changing preferences should always be done via these functions
function toggleNamedHighlight(prefs, prop, name, state) {
  const namedHighlights =
      prefs.highlights[name] || (prefs.highlights[name] = []);
  prefs.highlights[name] = namedHighlights;
  if (state) {
    console.assert(namedHighlights.indexOf(prop.id) == -1);
    namedHighlights.push(prop.id);
    console.assert(prop.highlights.indexOf(name) == -1);
    prop.highlights.push(name);
  } else {
    const idx = namedHighlights.indexOf(prop.id);
    console.assert(idx != -1);
    namedHighlights.splice(idx, 1);
    // Make sure there's no more occurences of prop.id
    console.assert(namedHighlights.indexOf(prop.id) == -1);

    const highlightIdx = prop.highlights.indexOf(name);
    console.assert(highlightIdx != -1);
    prop.highlights.splice(highlightIdx, 1);
    // Make sure there's no more occurences of the highlight name
    console.assert(prop.highlights.indexOf(name) == -1);
  }
}

function unscheduleVisit(prefs, prop) {
  console.log('Removing visit date');
  delete prefs.scheduled[prop.id];
  delete prop.scheduled;
}

function scheduleVisit(prefs, prop, datetime) {
  console.log(`Visiting ${prop.id} on ${datetime}`);
  prefs.scheduled[prop.id] = datetime;
  prop.scheduled = datetime;
}

function addPropertyManually(map, prefs, prop) {
  initializeProp(prop);

  // For now, make sure that prop.id isn't in prefs.
  // It should never happen, but just in case...
  for (const p of prefs.manuallyAdded)
    // Make sure it works even if we have some values as strings, others as numbers
    console.assert(p.id != prop.id && Number(p.id) != Number(prop.id));

  prefs.manuallyAdded.push(prop);
  const marker = addProperty(prefs, map, prop, propertyPopup);
  // Cheat for now. We should change things so markers have a propID, but not a
  // property pointer. That way we can treat manually-added properties the same
  // way as other properties.
  // FIXME: Properly split property definitions (persistent) from added
  // information (transient information (e.g: markers)).
  Object.defineProperty(prop, 'marker', {enumerable: false, value: marker});

  savePreferences(prefs);
}

// I've asked the experts and they suggested keeping it simple.
async function loadPreferences() {
  const response =
      await fetch(PREFS_URL).then(x => x.json()).catch(function(error) {
        return {result: 'server error', error: error};
      });

  if (response.result != 'ok') {
    const newPrefs = makeDefaultPrefs();
    console.warn('loading preferences: not ok response:', response);
    console.warn('setting default preferences:', newPrefs);
    return newPrefs;
  }

  try {
    const prefs = JSON.parse(response.prefs);
    const newPrefs = autoUpgradePreferences(prefs);
    console.debug('loaded prefs:', newPrefs);
    return newPrefs;
  } catch (e) {
    console.error(`Exception: ${e}`);
    console.error('Couldn\'t parse pref response:')
    console.error(response);
    return makeDefaultPrefs();
  }
}

async function savePreferences(prefs) {
  console.debug('saving prefs:', prefs);
  const jsonPrefs = JSON.stringify(prefs);
  const connection = await fetch(PREFS_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json;charset=UTF-8'},
    body: jsonPrefs
  });
  console.debug(connection);
  const response = await connection.json();
  if (response.result != 'ok') {
    console.warn(`saving preferences: not ok response: ${response}`);
    return;
  }

  try {
    if (response.prefs != jsonPrefs)
      console.warn(`oops. response: ${response.prefs} != prefs: ${jsonPrefs}`);
  } catch (e) {
    console.error(`Exception: ${e}`);
    console.error('Couldn\'t parse pref response:')
    console.error(response);
  }
}
