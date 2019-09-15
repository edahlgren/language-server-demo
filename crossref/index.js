
const path = require('path');
const cli = require('command-line-args');

const crossref = require('./lib');


//////////////////////////////////////////////////////////////////////////////


const cliSpec = [
    { name: 'server' },
    { name: 'dir' },
    { name: 'out' }
];


main();


//////////////////////////////////////////////////////////////////////////////


async function main() {

    const args = cli(cliSpec);    

    if (!args.server) {
        console.log("missing --server: need a path to a language server");
        process.exit(1);
    }
    if (!args.dir) {
        console.log("missing --dir: need a path to source code directory");
        process.exit(1);
    }
    
    await crossref.exec({
        server: path.resolve(args.server),
        dir: path.resolve(args.dir),
        out: path.resolve(args.out ? args.out : "./xrefs.json")
    });
    
    process.exit(0);
}
