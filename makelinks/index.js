
const fs = require('fs');
const path = require('path');

const cli = require('command-line-args');
const { JSDOM } = require("jsdom");


/////////////////////////////////////////////////////////////////////////////////////////////


const cliSpec = [
    { name: 'xrefs' },
    { name: 'html' }
];


main();


/////////////////////////////////////////////////////////////////////////////////////////////


function main() {
    // Parse args
    const args = cli(cliSpec);

    // Check args
    if (!args.xrefs) {
        console.log("missing --xrefs: need to pass an xrefs file");
        process.exit(1);
    }
    if (!fs.existsSync(args.xrefs)) {
        console.log("xrefs file (--xrefs) doesn't exist");
        process.exit(1);
    }
    if (!args.html) {
        console.log("missing --html: need to pass a directory containing html");
        process.exit(1);
    }
    if (!fs.existsSync(args.html)) {
        console.log("html directory (--html) doesn't exist");
        process.exit(1);
    }

    // Parse the xrefs data into multiple maps
    let data = load_data(args.xrefs);

    console.log(data);

    // FIXME:
    //
    // It looks like the xrefs and tokenization locations aren't adding up
    // because the xrefs functions start at the beginning of the function
    // definition and include the word "function", whereas the tokenization
    // code uses locations based on syntax highlighting (function is a keyword)
    //
    // So it would probably be best to combine the tokenization logic with
    // xrefs a bit, so that when the symbols are being parsed, we run the
    // tokenizer on the line and look for the first "function" token, and then
    // we use that position. That would also validate that a function is actually
    // recognized by the tokenizer before we add the cross reference data to the
    // set.
    
    // For each html file
    walk(args.html, function(file) {
        
        console.log("\nprocessing:", file);

        // Read the html file in as a DOM
        let content = fs.readFileSync(file, 'utf8');
        
        var dom = new JSDOM(content);
        let indexed = dom.window.document.getElementsByClassName('indexed');

        for (var i = 0; i < indexed.length; i++) {

            // Get the id of the element
            let id = indexed[i].id;
            let inner = indexed[i].innerHTML;

            // Skip elements that we have no info on
            let canonical = data.get(id);
            if (!canonical) {
                console.log("id", id, "(", inner, ")", "isn't in xrefs map, skipping ...");
                continue;
            }

            console.log("adding link for id", id, "(", inner, ")", "to", canonical);
            
            // Wrap the inner html with a link
            indexed[i].innerHTML =
                '<a class="xref" href="' + make_link(canonical) + '">'
                + inner
                + '</a>';
        }
    });
    
}

function load_data(file) {

    // Read the file as JSON
    let content = fs.readFileSync(file, 'utf8');
    let json = JSON.parse(content);

    // Organize the data so that we can easily look up any symbol
    // or reference and get back a canonical id.
    let data = new Map();

    // For each symbol
    for (var symbol in json.symbols) {

        // Skip things that are not real fields in the JSON
        if (!json.symbols.hasOwnProperty(symbol))
            continue;

        // Sanity check
        if (data.has(symbol)) {
            console.log("Can't add symbol twice:", symbol);
            process.exit(1);
        }

        // Make the symbol point to itself
        data.set(symbol, symbol);

        // For each reference to this symbol
        let references = json.symbols[symbol];
        references.forEach(function(ref) {

            // Sanity check
            if (data.has(ref)) {
                console.log("Can't add reference twice:", ref);
                process.exit(1);
            }

            // Make each reference point to the symbol as the
            // canonical representation
            data.set(ref, symbol);
        });
    }

    return data;
}

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(function(file) {        
        let dirPath = path.join(dir, file);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ?
            walk(dirPath, callback) : callback(path.join(dir, file));
    });
};

function make_link(canonical) {
    return "/search?symbol=" + canonical;
}
