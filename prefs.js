const PREFS_URL = 'dynamic/preferences';

function makeDefaultPrefs() {
  return {
    highlight: []
  };
}

// I've asked the experts and they mentioned keeping it simple.
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
    console.debug('loaded prefs:', prefs);
    return prefs;
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
