const PREFS_URL = 'dynamic/preferences';

function makeDefaultPrefs() {
  return {
    highlights: {},
  };
}

function autoUpgradePreferences(prefs) {
  if (prefs.highlight) {
    const oldHighlights = prefs.highlight;
    delete prefs.highlight;
    prefs.highlights = { 'scheduled': oldHighlights };
  }
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
    prop.highlight = name;
  } else {
    const idx = namedHighlights.indexOf(prop.id);
    console.assert(idx != -1);
    namedHighlights.splice(idx, 1);
    // Make sure there's no more occurences of prop.id
    console.assert(namedHighlights.indexOf(prop.id) == -1);
    console.assert(prop.highlight == name);
    delete prop.highlight;
  }
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
  const connection =
      await fetch(PREFS_URL, {method: 'POST', body: JSON.stringify(prefs)});
  console.debug(connection);
  const response = await connection.json();
  if (response.result != 'ok') {
    console.warn(`saving preferences: not ok response: ${response}`);
    return;
  }

  try {
    const jsonResponse = JSON.parse(response.prefs);
    if (jsonResponse != prefs)
      console.warn(`oops. response: ${jsonResponse} != prefs: ${prefs}`);
  } catch (e) {
    console.error(`Exception: ${e}`);
    console.error('Couldn\'t parse pref response:')
    console.error(response);
  }
}
