'use strict';
const PREFS_URL = 'dynamic/preferences';

function autoUpgradePreferences(prefs) {
  if (prefs.highlight) {
    const oldHighlights = prefs.highlight;
    delete prefs.highlight;
    prefs.highlights = { 'scheduled': oldHighlights };
  }

  prefs.highlights = (prefs.highlights || {});
  // Make sure our highlight arrays exists
  for (const name of ['ng', 'ok', 'scheduled'])
      prefs.highlights[name] = prefs.highlights[name] || [];

  prefs.manuallyAdded = (prefs.manuallyAdded || []);
  prefs.notes = (prefs.notes || {});
  prefs.scheduled = (prefs.scheduled || {});
  return prefs;
}

// Changing preferences should always be done via these functions
function toggleNamedHighlight(state, prop, name, checked) {
  const prefs = state.prefs;
  const namedHighlights =
      prefs.highlights[name] || (prefs.highlights[name] = []);
  prefs.highlights[name] = namedHighlights;
  if (checked) {
    // NEWID: TODO: Needs to change if we change id format
    let wasHighlighted = namedHighlights.indexOf(prop.id) == -1;
    wasHighlighted |= namedHighlights.indexOf(toOldID(prop.id)) == -1;

    console.assert(wasHighlighted);
    namedHighlights.push(prop.id);
    console.assert(prop.highlights.indexOf(name) == -1);
    prop.highlights.push(name);
  } else {
    // NEWID: TODO: Needs to change if we change id format
    const idx = namedHighlights.indexOf(prop.id);
    if (idx == -1)
      idx = namedHighlights.indexOf(toOldID(prop.id));
    console.assert(idx != -1);
    namedHighlights.splice(idx, 1);
    // Make sure there's no more occurences of prop.id
    console.assert(namedHighlights.indexOf(prop.id) == -1);
    // NEWID: TODO: Needs to change if we change id format
    console.assert(namedHighlights.indexOf(toOldID(prop.id)) == -1);

    const highlightIdx = prop.highlights.indexOf(name);
    console.assert(highlightIdx != -1);
    prop.highlights.splice(highlightIdx, 1);
    // Make sure there's no more occurences of the highlight name
    console.assert(prop.highlights.indexOf(name) == -1);
  }
}

function unscheduleVisit(prefs, prop) {
  console.log('Removing visit date');
  // NEWID: TODO: Needs to change if we change id format
  // We can just remove both
  delete prefs.scheduled[prop.id];
  delete prefs.scheduled[toOldID(prop.id)];
  delete prop.scheduled;
}

function scheduleVisit(prefs, prop, datetime) {
  // NEWID: TODO: Needs to change if we change id format (at least to check + replace older id format)
  console.log(`Visiting ${prop.id} on ${datetime}`);
  // NEWID: Make sure we remove the older ID
  delete prefs.scheduled[toOldID([prop.id])];
  prefs.scheduled[String(prop.id)] = datetime;
}

function getScheduleFor(prefs, prop) {
  // Guarantee prop.id is a string, as we use numbers for manually added
  // properties.
  const maybeSchedule = prefs.scheduled[String(prop.id)];
  if (maybeSchedule === undefined)
    return maybeSchedule;

  return new Date(maybeSchedule);
}

function addPropertyManually(state, prop) {
  initializeProp(prop);

  // For now, make sure that prop.id isn't in prefs.
  // It should never happen, but just in case...
  for (const p of state.prefs.manuallyAdded)
    // Make sure it works even if we have some values as strings, others as numbers
    // NEWID: TODO: Needs to change if we change id format
    console.assert(p.id != prop.id);

  state.prefs.manuallyAdded.push(prop);
  const marker = addProperty(state, prop, propertyPopup.bind({}, state));
  // Cheat for now. We should change things so markers have a propID, but not a
  // property pointer. That way we can treat manually-added properties the same
  // way as other properties.
  // FIXME: Properly split property definitions (persistent) from added
  // information (transient information (e.g: markers)).
  Object.defineProperty(prop, 'marker', {enumerable: false, value: marker});

  savePreferences(state.prefs);
}

function getPropertyNotes(state, prop) {
  // NEWID: TODO: Needs to change if we change id format
  let notes = state.prefs.notes[prop.id];
  if (notes === undefined) {
    // auto-upgrade + delete old version
    notes = state.prefs.notes[toOldID(prop.id)];
    delete state.prefs.notes[toOldID(prop.id)];
  }

  if (notes === undefined)
    notes = '';
  else
    // NEWID: Save to updated ID unless we have empty notes (just created)
    state.prefs.notes[prop.id] = notes;

  return notes;
}

// Returns true if preferences were saved
function setPropertyNotes(state, prop, notes) {
  // NEWID: TODO: Needs to change if we change id format
  const id = prop.id;
  const trimmed = notes.trim();
  const propNotes = state.prefs.notes;
  if (propNotes[id] == trimmed)
    // No change
    return false;

  if (propNotes[toOldID(id)] !== undefined)
    delete propNotes[toOldID(id)];

  propNotes[id] = trimmed;
  savePreferences(state.prefs);
  return true;
}

// I've asked the experts and they suggested keeping it simple.
async function loadPreferences() {
  const response =
      await fetch(PREFS_URL).then(x => x.json()).catch(function(error) {
        return {result: 'server error', error: error};
      });

  if (response.result != 'ok') {
    const newPrefs = autoUpgradePreferences({});
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
    return autoUpgradePreferences({});
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
