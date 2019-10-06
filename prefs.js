const PrefsUrl = 'dynamic/preferences';

function makeDefaultPrefs() {
  return {
    highlight: []
  };
}

// Loads prefs from server immediately
async function UserPreferences() {
  const obj = {
    save: async function() {
      console.log('saving prefs:', obj.prefs);
      const connection = await fetch(
          PrefsUrl, {method: 'POST', body: JSON.stringify(obj.prefs)});
      console.log(connection);
      const response = await connection.json();
      if (response.result != 'ok') {
        console.log(`saving preferences: not ok response: ${response}`);
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
      const response =
          await fetch(PrefsUrl).then(x => x.json()).catch(function(error) {
            return {result: 'server error', error: error};
          });

      if (response.result != 'ok') {
        const newPrefs = makeDefaultPrefs();
        console.log('loading preferences: not ok response:', response);
        console.log('setting default preferences:', newPrefs);
        obj.prefs = newPrefs;
        return obj;
      }

      try {
        obj.prefs = JSON.parse(response.prefs);
      } catch (e) {
        console.log(`Exception: ${e}`);
        console.log('Couldn\'t parse pref response:')
        console.log(response);
        obj.prefs = makeDefaultPrefs();
      }
      console.log('loaded prefs:', obj.prefs);
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
