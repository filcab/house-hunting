#!/bin/sh

scp index.html {map,popup,script}.js style.css *.json "$1"
