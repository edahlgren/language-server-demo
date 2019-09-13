
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');

const cli = require('command-line-args');
const logSymbols = require('log-symbols');

const tokenize = require('./tokenize');

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

    // Parse the xrefs data
    let data = load_data(args.xrefs);
    
    // Make the project path absolute
    args.project = path.resolve(args.project);
    
    // Find javascript files in the project
    let js_files = find_javascript_files(args.project);

    console.log("", "processing ...");
    
    js_files.forEach(function(file) {
        // Find the path relative to the project dir
        let relpath = path.relative(args.project, file);
        
        // Find any directories leading up to the file that
        // we might need to create in args.outdir
        let reldir = path.dirname(relpath);

        // Format the file as HTML
        let str = html(data, args.project, relpath);

        // Create intermediate directories in outdir as needed
        if (reldir.length > 0) {
            let outdir = path.join(args.outdir, reldir);
            fsExtra.ensureDirSync(outdir);
        }

        // Write the html to the outdir
        let basename = path.parse(file).name + ".html";
        let outpath = path.join(args.outdir, reldir, basename);
        fs.writeFileSync(outpath, str, 'utf8');
        
        console.log("  ", logSymbols.success, relpath);
    });

    console.log("", logSymbols.success, "done");
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

function find_javascript_files(dir) {
    var files = [];
    walk(dir, function(file) {
        if (path.extname(file) === ".js")
            files.push(file);
    });
    return files;
}

function walk(dir, callback) {
    // Skip node modules directory
    if (path.basename(dir) === "node_modules")
        return;

    // Process other files
    fs.readdirSync(dir).forEach(function(file) {
        let dirPath = path.join(dir, file);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ?
            walk(dirPath, callback) : callback(path.join(dir, file));
    });
};

/////////////////////////////////////////////////////////////////////////////////////////////


function html(data, project, file) {
    
    // Make paths absolute
    let abspath = path.join(project, file);
    
    // Read in the file
    let text = fs.readFileSync(abspath, 'utf8');
    
    // Tokenize the file
    let tokens = tokenize(text);

    // Stringify the tokens into html, wrapping them with links to their
    // canonical symbol if they're present in the xrefs file
    return stringify(tokens, function(token) {
        let id = file + ":L" + token.line + ":" + token.offset;

        let canonical = data.get(id);
        if (!canonical)
            return "";
        
        return "/search?symbol=" + canonical;
    });
}

function stringify(token, get_link) {
    
    // Base case
    if (typeof token == 'string')
        return encode(token);

    // Expand arrays
    if (Array.isArray(token)) {
        return token.map(function(element) {
            return stringify(element, get_link);
        }).join('');
    }

    // Don't decorate whitespace
    if (token.type === "whitespace")
        return encode(token.content);
    
    // Get the link for the token
    let link = get_link(token);

    // Don't decorate uninteresting strings
    if (link === "" && token.type == "string")
        return stringify(token.content, get_link);
    
    // Wrap the content in a link
    let content = stringify(token.content, get_link);
    if (link.length > 0) {
        content = '<a class="xref" href="' + link + '">' + content + '</a>';
    }

    // Create the HTML element
    let tag = 'span';
    let classes = ['token', token.type];
    let class_str = (classes === "" ? "" : ' class="' + classes.join(' ') + '"');
    
    return '<' + tag + class_str + '>' + content + '</' + tag + '>';
}

function encode(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
}
