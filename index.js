#!/usr/bin/env node


const fs = require('fs');
const path = require('path');

const fsExtra = require('fs-extra');
const cli = require('command-line-args');

const crossref = require('./crossref/lib');
const genhtml = require('./tokenize/lib');
const template = require('./template/lib');


/////////////////////////////////////////////////////////////////////////////////////////////


const cliSpec = [
    { name: 'server' },
    { name: 'source' },
    { name: 'templates' },
    { name: 'workdir' },
    { name: 'assets' }
];


main();


// YIPEE it works!!
//
// You can obviously add search and references snippets later,
// but this is sort of the bare minimum you would need.
//
// It works in 3 stages:
//
//   1. Executes a language server to find the def-ref information
//      about files in a project. There will be varying levels of quality
//      between different language servers, but generally they seem to
//      return _some_ useful data at least. The def-ref information is
//      stored in JSON file simply as:
//
//      dir: <------------------------- project directory root
//      symbols: {
//          file:line:offset: [ <------ symbol
//              file:line:offset, <---- references
//              ...
//          ],
//          ...
//
//   2. Executes a tokenizer to transform source code files into tokens,
//      which are used to wrap the source code in labeled HTML span elements
//      (for syntax highlighting) and links (for jumping to defs and refs).
//      Any tokenizer could be used, but this prototype uses prismjs for
//      the convenience of directly executing javascript
//
//   3. Uses the cross reference data from step 1 and the html output from step
//      2 to fill in html templates for the final website files. All website
//      content is static, so you can view the entire site simply by running:
//
//        $ cd WORKDIR/static
//        $ http-server
//


/////////////////////////////////////////////////////////////////////////////////////////////


async function main() {

    // Parse args
    const args = cli(cliSpec);    
    if (!args.server) {
        console.log("missing --server: need a path to a language server");
        process.exit(1);
    }
    if (!args.source) {
        console.log("missing --source: need a path to source code directory");
        process.exit(1);
    }
    if (!args.templates) {
        console.log("missing --templates: need a path to html templates");
        process.exit(1);
    }
    if (!args.workdir) {
        console.log("missing --workdir: need a path to a directory to write output");
        process.exit(1);
    }

    // Files and directories to create in the working dir
    let xrefs_file = path.join(args.workdir, "xrefs.json");
    let snippets_dir = path.join(args.workdir, "snippets");
    let static_dir = path.join(args.workdir, "static");
    let assets_dir = path.join(args.workdir, "static", "assets");

    console.log("\n", "CROSS REFERENCING", "\n");
    
    // Cross reference the source code
    await crossref.exec({
        server: path.resolve(args.server),
        dir: path.resolve(args.source),
        out: xrefs_file
    });

    console.log("\n", "GENERATING HTML SNIPPETS", "\n");
    
    // Ensure the snippets dir exists
    fsExtra.ensureDirSync(snippets_dir);
    
    // Generate html snippets of each source file
    genhtml.exec({
        project: args.source,
        xrefs: xrefs_file,
        outdir: snippets_dir
    });

    console.log("\n", "TEMPLATING HTML", "\n");
    
    // Ensure the static dir exists
    fsExtra.ensureDirSync(static_dir);
    
    // Template the final html files
    template.exec({
        xrefs: xrefs_file,
        template_dir: args.templates,
        html: snippets_dir,
        outdir: static_dir
    });

    console.log("\n", "MOVING ASSETS", "\n");
    
    // If there are assets, ensure that they're copied
    if (args.assets)
        fsExtra.copySync(args.assets, assets_dir);
    
    console.log("\n", "DONE", "\n");
    
    process.exit(0);
}
