House Hunting
=============

This repo contains the skeleton for a simple website to aggregate property locations (or whatever you want) when house hunting.

### Use cases
* Check out property data from multiple websites in a single (personal) one
  * In many of the websites/apps I've tried, there's no map of favourite locations (which should be an obvious feature to have).
    This project enables merging the "saved" lists from all the websites and displaying them on a map.
* Have all these mapped out on a mobile browser whilst visiting properties, without much hassle

## Requirements
* Web browser
* Web server (`python -mSimpleHTTPServer` or `python3 -mhttp.server` are ok for basic functionality)
* HTTPS for geolocation (required by at least Safari on recent iOS/macOS)
* CGI-capable webserver for "highlighted" support (Relies on `REMOTE_USER` environment variable to split preferences amongst users)
  * The `preferences` script uses the following non-standard (CGI) environment variables
    * The script saves data in `$CONTEXT_DOCUMENT_ROOT/data`, one file per user (named after the user)
    * The script uses the value of `$HTTPS` to make sure it's being served over HTTPS

Basic server configuration

## Contents
```
house-hunting/
  ├── apple-touch-icon.png  # App icon when using iOS' "Add to Home Screen" functionality
  ├── bookmarklet.js        # Unminified bookmarklet (Supports RightMove and OnTheMarket)
  ├── build.py              # Script that runs babel-minify on bookmarklet generating b.js
  ├── deploy.sh             # Simple rsync-based deploy script. Invoke with destination as argument
  ├── dynamic               # CGI scripts for preference storage (per user, relying on HTTP basic auth)
  ├── index.html            # HTML file, imports libraries, has map div,
  │                         # and imports the main script files
  ├── map.js                # Map abstraction layer. For now it only supports Leaflet
  ├── popup.js              # Function which generates the popup comments for a marker (propertyPopup)
  │                         # marker is expected to have a marker.property property
  ├── prefs.js              # Preference management (loads and stores to/from the cgi-script in dynamic)
  ├── script.js             # Main script logic: creates map, (maybe) enables geolocation,
  │                         # fetches data, sets up markers
  ├── style.css             # CSS rules
  ├── test-areas.json       # Test areas to draw if no actual data is available
  ├── test-data.json        # Test property data to use if no actual data is available
  └── utils.js              # Small utilities for detecting WebGL and other stuff
```
