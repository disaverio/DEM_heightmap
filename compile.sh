#!/bin/bash

rm -Rf dist/*
node node_modules/requirejs/bin/r.js -o build.js
mv dist/src/DemHeightmap.js .
rm -Rf dist/*
mv DemHeightmap.js dist/