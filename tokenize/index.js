
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');

const cli = require('command-line-args');
const logSymbols = require('log-symbols');
const matchAll = require("match-all");
const prism = require('prismjs');


/////////////////////////////////////////////////////////////////////////////////////////////


const cliSpec = [
    { name: 'project' },
    { name: 'outdir' }
];


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
    if (!args.outdir) {
        console.log("missing --file: need to pass a javascript file");
        process.exit(1);
    }
    if (!fs.existsSync(args.outdir)) {
        console.log("output directory (--outdir) doesn't exist");
        process.exit(1);
    }

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
        let str = html(args.project, relpath);

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

main();


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


function html(project, file) {
    
    // Make paths absolute
    let abspath = path.join(project, file);

    // How to make HTML element ids. Empty string means no id
    let make_id = function(token) {
        if (!token.type || token.type !== "function")
            return "";
        
        return file + ":L" + token.line + ":" + token.offset;
    };

    // How to make HTML element classes. Empty string means no classes
    let make_classes = function(token) {
        let classes = ['token', token.type];
        if (token.type && token.type === "function")
            classes.push('indexed');
        return classes;
    };
    
    // Tokenize the file
    let tokens = tokenize(abspath);

    // Stringify the tokens into html
    return stringify(tokens, make_id, make_classes);
}


/////////////////////////////////////////////////////////////////////////////////////////////


function tokenize(file) {
    // Read in the file
    let text = fs.readFileSync(file, 'utf8');

    // Tokenize the text
    let grammar = prism.languages['javascript'];
    let tokens = prism.tokenize(text, grammar);

    // Keep track of line and offset
    let line = 0;
    let offset = 0;

    function newlines(str) {
        let array = str.match(/\n/g);
        if (!array)
            return 0;
        return array.length;
    }

    function extra(str) {
        let last_index = str.lastIndexOf('\n');
        if (last_index < 0)
            return str.length;
        
        return str.length - (last_index + 1);
    }
    
    // Label tokens with their line and character offset
    tokens.forEach(function(token) {

        // Safety check
        if (Array.isArray(token)) {
            console.log("We can't handle nested tokens:", token);
            process.exit(1);
        }
        
        // If it's just a string, then it's probably whitespace
        // (e.g. newlines and extra spaces). Adjust the line and
        // offset counter accordingly
        
        if (typeof token == 'string') {
            let lines = newlines(token);
            line += lines;

            if (lines > 0)
                offset = 0;
            
            offset += extra(token);
            return;
        }

        // Otherwise it's of type Token. Set the line and offset.
        token.line = line;
        token.offset = offset;
        
        // Adjust the offset by the length of the content. If this
        // contained a real newline then it would just be a string,
        // so no need to advance the line count
        offset += token.length;
    });

    return tokens;
}

function stringify(token, make_id, make_classes) {
    if (typeof token == 'string') {
        return encode(token);
    }

    if (Array.isArray(token)) {
        return token.map(function(element) {
            return stringify(element, make_id, make_classes);
        }).join('');
    }

    let tag = 'span';
    let content = stringify(token.content, make_id, make_classes);
    
    let id = make_id(token);
    let id_str = (id === "" ? "" : ' id="' + id + '"');
    
    let classes = make_classes(token);
    let class_str = (classes === "" ? "" : ' class="' + classes.join(' ') + '"');

    return '<' + tag + class_str + id_str + '>' + content + '</' + tag + '>';
}

function encode(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
}
