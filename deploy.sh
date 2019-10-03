#!/bin/sh

# Assumes destination directory already exist
# Don't set group or owner, let the destination handle it
# Don't set dir times, it was failing and I don't care
rsync -avz --no-g --no-o -O index.html {map,popup,prefs,script}.js style.css dynamic *.json "$1"
