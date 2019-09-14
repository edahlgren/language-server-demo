
const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');

const cli = require('command-line-args');
const mustache = require('mustache');
const logSymbols = require('log-symbols');


/////////////////////////////////////////////////////////////////////////////////////////////


const cliSpec = [
    { name: 'templates' },
    { name: 'html' },
    { name: 'xrefs' },
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
// TODO  Create very minimal templates and test out this logic
// TODO  Then add CSS to make the code and directories look OK
// TODO  Add a simple breadcrumb to go up and down directories easily
// TODO  Add a one-line snippet to the references section showing the
//       code in context
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

    let config = {
        html: args.html,
        outdir: args.outdir,
        symbols: load_symbols(args.xrefs),
        
        dir_template: readTemplate(args, "dir.html"),
        file_template: readTemplate(args, "file.html"),
        refs_template: readTemplate(args, "references.html")
    };

    // Make sure output directories exist
    fsExtra.ensureDirSync(config.outdir);
    fsExtra.ensureDirSync(path.join(config.outdir, "files"));
    fsExtra.ensureDirSync(path.join(config.outdir, "refs"));
    
    // Files are file.ext.html, where the html can be stripped off later
    // (for now it's only cosmetically annoying).

    // Render index.html
    renderHome(config);

    // Render html files for real files and directories
    renderFiles(config, config.html);

    // Render info on symbols and references
    renderReferences(config);
}

function load_symbols(file) {
    // Read the file as JSON
    let content = fs.readFileSync(file, 'utf8');
    let json = JSON.parse(content);
    let symbols = {};
    
    // For each symbol
    for (var symbol in json.symbols) {

        // Skip things that are not real fields in the JSON
        if (!json.symbols.hasOwnProperty(symbol))
            continue;

        symbols[symbol] = json.symbols[symbol];
    }
    
    return symbols;
}

function readTemplate(args, file) {
    return fs.readFileSync(path.join(args.templates, file), 'utf8');
}

function renderHome(config) {

    let home = templateDirectory(config, '');
    let out = path.join(config.outdir, "index.html");
    fs.writeFileSync(out, html, 'utf8');
}

function renderFiles(config, dir) {

    fs.readdirSync(dir).forEach(function(file) {
        // Is this path a directory?
        let _path = path.join(dir, file);
        let isDirectory = fs.statSync(_path).isDirectory();

        // Find the renderer
        let relpath = path.relative(config.html, _path);
        let renderer = (isDirectory ? templateDirectory : templateFile);

        // Render the directory or file
        let html = renderer(config, _path);
        let out = path.join(config.outdir, "file", relpath);
        fs.writeFileSync(out, html, 'utf8');

        // Recursive if directory
        if (isDirectory)
            renderFiles(config, _path);
    });
}

function templateDirectory(config, dir) {

    // Read the directory entries
    let entries = [];
    let reldir = path.relative(config.html, dir);    
    
    fs.readdirSync(dir).forEach(function(file) {
        let parts = path.parse(file);

        // Wrap file and subdirectory names with links
        let link = "/file/" + path.join(dir, parts.base);
        entries.push('<a href="' + link + '">' + parts.name + '</a>');
    });

    // Render the template
    return mustache.render(config.dir_template, { contents: entries });
}

function templateFile(config, file) {

    // Read the html snippet
    let filepath = path.join(config.html, file);
    let text = fs.readFileSync(filepath, 'utf8');

    // Wrap it in a table with line numbers
    text = with_lines(text, 0, -1);

    // Render the template
    return mustache.render(config.file_template, { contents: text });
}

function with_lines(text, start, end) {

    let out = [];
    out.push('<table class="source-file">');
    out.push('<tbody>');
    
    let lines = text.split('\n');
    let last = lines.length;
    let lineno = 1;

    if (end < 0) end = last;

    for (var i = start; i < end; i++) {
        let line = lines[i];
        if (lineno == last && line.length == 0)
            return;
        
        out.push('<tr id="' + 'L' + lineno + '">');
        out.push('<td class="line-number">' + lineno + '</td>');
        out.push('<td class="code">' + line + '</td>');
        out.push('</tr>');
        
        lineno += 1;
    }

    out.push('</tbody>');
    out.push('</table>');
    
    return out.join('\n');
}

function renderReferences(config) {

    for (var symbol in config.symbols) {

        let references = config.symbols[symbol];
        let html = templateReference(config, symbol, references);
        
        let out = path.join(config.outdir, "refs", symbol);
        fs.writeFileSync(out, html, 'utf8');
    }
}

function templateReference(config, symbol, references) {

    // Extract parts from the symbol id
    let symbol_info = id2parts(symbol);

    // Extract parts from the reference ids
    let refs_info = [];
    references.forEach(function(ref) {
        refs_info.push(id2parts(ref));
    });
    
    // Render the template
    return mustache.render(config.refs_template, {
        symbol: symbol_info,
        references: refs_info
    });
}

function id2parts(str) {

    let parts = str.split(":");
    return { file: parts[0], line: parts[1], offset: parts[2] };
}
