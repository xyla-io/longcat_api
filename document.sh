#!/bin/bash

set -e
set -x

rm -rf documentation/dist

./node_modules/apidoc/bin/apidoc -i controllers/ -o documentation/dist

mkdir documentation/dist/assets
cp -R documentation/assets/* documentation/dist/assets/
