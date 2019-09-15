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


/////////////////////////////////////////////////////////////////////////////////////////////


// DONE 0. Parse symbols and find references, and store this
//         information in a key-value store. Start only with
//         function symbols and store everything in a JSON  
//         file, using the line and offset information to   
//         create the keys                                  
//                                                          
// DONE 1. Associate tokens with line and offset information
//
// DONE 2. Give html span elements a link based on the line
//         and offset information if they are a symbol or a
//         reference to a symbol
//
// DONE 5. Create anchors to line numbers in the html so that
//         the query page can jump to a line in a file
//
// DONE 6. Create the HTML + CSS for the file pages and the
//         query result pages
//
//      7. Test on larger projects
//
// You can obviously add search and snippets later, but this
// is sort of the bare minimum you would need.


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
