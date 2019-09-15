
const fs = require('fs');
const cli = require('command-line-args');

const genhtml = require('./lib');


/////////////////////////////////////////////////////////////////////////////////////////////


const cliSpec = [
    { name: 'project' },
    { name: 'xrefs' },
    { name: 'outdir' }
];


main();


/////////////////////////////////////////////////////////////////////////////////////////////


function main() {

    // Parse args
    const args = cli(cliSpec);

    // Check args
    if (!args.project) {
        console.log("missing --project: need to pass a project dir");
        process.exit(1);
    }
    if (!fs.existsSync(args.project)) {
        console.log("project dir (--project) doesn't exist");
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

    genhtml.exec({
        project: args.project,
        xrefs: args.xrefs,
        outdir: args.outdir
    });

    process.exit(0);
}
