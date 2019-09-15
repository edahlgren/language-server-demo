#!/bin/bash

rm -rf test-output
mkdir test-output

node index.js \
     --server extra/javascript-typescript-langserver/lib/language-server-stdio \
     --source test-project \
     --templates html_templates \
     --workdir test-output \
     --assets assets
