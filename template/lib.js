
const fs = require('fs');
const path = require('path');
const fsExtra = require('fs-extra');
const mustache = require('mustache');
const logSymbols = require('log-symbols');


/////////////////////////////////////////////////////////////////////////////////////////////


function exec(config) {
    config.symbols = load_symbols(config.xrefs);
    config.templates = {
        dir: readTemplate(config.template_dir, "dir.html"),
        file: readTemplate(config.template_dir, "file.html"),
        refs: readTemplate(config.template_dir, "references.html")
    };
    
    // Make sure output directories exist
    fsExtra.ensureDirSync(config.outdir);
    fsExtra.ensureDirSync(path.join(config.outdir, "file"));
    fsExtra.ensureDirSync(path.join(config.outdir, "refs"));
    
    // Files are file.ext.html, where the html can be stripped off later
    // (for now it's only cosmetically annoying).

    // Render index.html
    renderHome(config);

    // Render html files for real files and directories
    renderFiles(config, config.html);

    // Render info on symbols and references
    renderReferences(config);

    console.log("\n", logSymbols.success, "SUCCESS", "\n");
}


/////////////////////////////////////////////////////////////////////////////////////////////


function readTemplate(template_dir, file) {
    return fs.readFileSync(path.join(template_dir, file), 'utf8');
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

function renderHome(config) {

    console.log("\n", "rendering index ...");
    
    let home = templateDirectory(config, config.html);
    let out = path.join(config.outdir, "index.html");
    fs.writeFileSync(out, home, 'utf8');

    console.log("  ", logSymbols.success, out);
}

function renderFiles(config, dir) {

    console.log("\n", "rendering files and directories ...");
    
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

        console.log("  ", logSymbols.success, out);
        
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
        let _path = path.join(dir, file);
        let isDirectory = fs.statSync(_path).isDirectory();
        
        let parts = path.parse(file);

        entries.push({
            name: parts.name,
            path: path.join(reldir, parts.base),
            type: (isDirectory ? "dir" : "file")
        });
    });

    // Render the template
    return mustache.render(config.templates.dir, {
        paths: (reldir === "" ? [] : breadcrumb_paths(reldir, true /** is dir **/)),
        entries: entries
    });
}

function templateFile(config, file) {

    // Read the html snippet
    let relpath = path.relative(config.html, file);    
    let text = fs.readFileSync(file, 'utf8');

    // Wrap it in a table with line numbers
    text = with_lines(text, 0, -1);

    // Render the template
    return mustache.render(config.templates.file, {
        paths: breadcrumb_paths(relpath, false /** is dir **/),
        content: text
    });
}

function breadcrumb_paths(relative_path, is_dir) {
    let dirs = [];
    collect_dirs(relative_path, dirs);

    let paths = [];
    for (var i = dirs.length - 1; i >= 0; i--) {
        let dir = dirs[i];
        paths.push({
            path: path.join(dir, "index.html"),
            name: path.basename(dir)
        });
    }

    if (is_dir) {
        paths.push({
            path: path.join(relative_path, "index.html"),
            name: path.basename(relative_path)
        });
    } else {
        paths.push({
            path: relative_path,
            name: path.parse(relative_path).name
        });
    }

    let out = [];
    let first = true;
    paths.forEach(function(p) {
        if (!first)
            out.push('/');
        
        out.push('<a href="/file/' + p.path + '">' + p.name + '</a>');
        
        if (first)
            first = false;
    });


    return out;
}

function collect_dirs(p, out) {
    let dir = path.dirname(p);

    // Base case
    if (dir === "." || dir === "/")
        return;

    out.push(dir);
    collect_dirs(dir, out);
}

function with_lines(text, start, end) {
    
    let out = [];
    out.push('<table id="file-table" class="file-container">');
    out.push('<tbody>');
    
    let lines = text.split('\n');
    let last = lines.length;
    let lineno = 1;

    if (end < 0) end = last;

    for (var i = start; i < end; i++) {
        let line = lines[i];
        if (lineno == last && line.length == 0)
            break;
        
        out.push('<tr class="line" id="' + 'L' + lineno + '">');
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

    console.log("\n", "rendering references ...");
    
    for (var symbol in config.symbols) {

        let references = config.symbols[symbol];
        let html = templateReference(config, symbol, references);
        
        let basename = symbol.split(":").join("_") + ".html";
        let out = path.join(config.outdir, "refs", basename);
        
        fs.writeFileSync(out, html, 'utf8');
        
        console.log("  ", logSymbols.success, out);
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
    return mustache.render(config.templates.refs, {
        symbol: symbol_info,
        references: refs_info
    });
}

function id2parts(str) {

    let parts = str.split(":");
    let line = parseInt(parts[1].substring(1));
    
    return { file: parts[0], line: line + 1, offset: parts[2] };
}

module.exports = {
    exec: exec
};
