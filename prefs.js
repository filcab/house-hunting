const PrefsUrl = '/dynamic/preferences';

async function savePrefs(prefs) {
  const response = await fetch(PrefsUrl, {
                     method: 'POST',
                     body: JSON.stringify(prefs)
                   }).then(x => x.json());
  if (response.result != 'ok') {
    console.log(`not ok response: ${response}`);
    return {};
  }

  try {
    return JSON.parse(response.prefs);
  } catch (e) {
    console.log(`Exception: ${e}`);
    console.log('Couldn\'t parse pref response:')
    console.log(response);
    return {};
  }
}

async function loadPrefs() {
  const response = await fetch(PrefsUrl).then(x => x.json());
  if (response.result != 'ok') {
    console.log(`not ok response: ${response}`);
    return {};
  }

  try {
    return JSON.parse(response.prefs);
  } catch (e) {
    console.log(`Exception: ${e}`);
    console.log('Couldn\'t parse pref response:')
    console.log(response);
    return {};
  }
}
