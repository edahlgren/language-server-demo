
const fs = require('fs');
const cli = require('command-line-args');
const template = require('./lib');


/////////////////////////////////////////////////////////////////////////////////////////////


const cliSpec = [
    { name: 'xrefs' },
    { name: 'templates' },
    { name: 'html' },
    { name: 'outdir' }
];


main();


/////////////////////////////////////////////////////////////////////////////////////////////

//
// This demo is the simplest case, where we don't have much metadata and we can
// render all of the symbol-references pages at once. With a large project that
// might not be so easy, so best to do it dynamically in the demo itself
//

//
// DONE  Create very minimal templates and test out this logic
// DONE  Then add CSS to make the code and directories look OK
//
// DONE  Add a simple breadcrumb to go up and down directories easily
// DONE  Highlight lines as you jump to them
// DONE  When you click a line, highlight and anchor it in the URL
// TODO  Test on a larger project with directories
//

/////////////////////////////////////////////////////////////////////////////////////////////


function main() {

    // Parse args
    const args = cli(cliSpec);

    // Check args
    if (!args.templates) {
        console.log("missing --project: need to pass a project dir");
        process.exit(1);
    }
    if (!fs.existsSync(args.templates)) {
        console.log("templates dir (--templates) doesn't exist");
        process.exit(1);
    }
    if (!args.html) {
        console.log("missing --html: need to pass a directory containing html snippets");
        process.exit(1);
    }
    if (!fs.existsSync(args.html)) {
        console.log("html directory (--html) doesn't exist");
        process.exit(1);
    }
    if (!args.xrefs) {
        console.log("missing --xrefs: need to pass an xrefs file");
        process.exit(1);
    }
    if (!fs.existsSync(args.xrefs)) {
        console.log("xrefs file (--xrefs) doesn't exist");
        process.exit(1);
    }
    if (!args.outdir) {
        console.log("missing --file: need to pass a javascript file");
        process.exit(1);
    }
    if (!fs.existsSync(args.outdir)) {
        console.log("output directory (--outdir) doesn't exist");
        process.exit(1);
    }

    template.exec({
        xrefs: args.xrefs,
        template_dir: args.templates,
        html: args.html,
        outdir: args.outdir
    });
    
    process.exit(0);
}
