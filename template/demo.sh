#!/bin/bash

node index.js \
     --xrefs ../crossref/xrefs.json \
     --templates ./templates \
     --html ../snippets \
     --outdir ../static
