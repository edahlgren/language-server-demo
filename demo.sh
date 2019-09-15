#!/bin/bash

# The first argument is a path to a nodejs javascript source code directory

rm -rf test-output
mkdir test-output

node index.js \
     --server extra/javascript-typescript-langserver/lib/language-server-stdio \
     --source $1 \
     --templates html_templates \
     --workdir test-output \
     --assets assets
