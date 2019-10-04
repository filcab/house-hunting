const PrefsUrl = '/dynamic/preferences';

const defaultPrefsJSON = JSON.stringify({
  highlight: [],
});

// Loads prefs from server immediately
async function UserPreferences() {
  const obj = {
    save: async function() {
      const response = await fetch(PrefsUrl, {
                         method: 'POST',
                         body: JSON.stringify(obj.prefs)
                       }).then(x => x.json());
      if (response.result != 'ok') {
        console.log(`not ok response: ${response}`);
        return;
      }

      try {
        const jsonResponse = JSON.parse(response.prefs);
        if (jsonResponse != obj.prefs)
          console.log('oops. response: ${jsonResponse} != prefs: ${obj.prefs}');
      } catch (e) {
        console.log(`Exception: ${e}`);
        console.log('Couldn\'t parse pref response:')
        console.log(response);
        ;
      }
    },

    load: async function() {
      const response = await fetch(PrefsUrl).then(x => x.json());
      if (response.result != 'ok') {
        const newPrefs = JSON.parse(defaultPrefsJSON);
        console.log(
            `not ok response: ${response}, setting default: ${newPrefs}`);
        obj.prefs = newPrefs;
        return obj;
      }

      try {
        obj.prefs = JSON.parse(response.prefs);
      } catch (e) {
        console.log(`Exception: ${e}`);
        console.log('Couldn\'t parse pref response:')
        console.log(response);
      }
      return obj;
    },

    get: function(name) {
      return obj.prefs[name];
    },

    // Does not automatically save!
    set: function(name, value) {
      obj.prefs[name] = value;
      // Useful for chaining
      return obj;
    },
  };

  await obj.load();
  return obj;
}
