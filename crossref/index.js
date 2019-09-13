
const fs = require('fs');
const path = require('path');
const util = require('util');

const cli = require('command-line-args');
const logSymbols = require('log-symbols');
const { URI } = require('vscode-uri');

const server = require('./server');
const symbols = require('./symbols');
const references = require('./references');

// Put this in a different place
const tokenize = require('../tokenize/tokenize');


//////////////////////////////////////////////////////////////////////////////


const cliSpec = [
    { name: 'server' },
    { name: 'dir' },
    { name: 'out' }
];


//////////////////////////////////////////////////////////////////////////////


async function main() {

    // Parse the command line args
    let config = get_config();
    console.log("\n", logSymbols.success, "parsed config");
    
    // Connect to the language server
    let srv = await connect(config);
    console.log("", logSymbols.success, "connected to server");

    // Pass a context to all methods from here on to handle shutting down the
    // server process gracefully
    let ctx = {
        // The configuration
        config: config,
        
        // The output graph
        graph: new Map(),

        // The server child process and connection
        server: srv
    };

    // Find the files to search
    let files = get_files(ctx);
    console.log("\n   processing files ...", "\n");
        
    // For each of the files
    for (let file of files) {

        let lines = fs.readFileSync(file, 'utf8').split('\n');

        // For each of the symbols
        let syms = await get_symbols(ctx, file);
        for (let symbol of syms) {

            // Skip non-functions
            let kind = symbols.kindToString(symbol.kind);
            if (kind !== "function")
                continue;

            symbol = ensure_correct_location(ctx, lines, symbol, kind);

            // Add the symbol to the graph
            await add_symbol(ctx, symbol);
        }
        
        console.log("  ", logSymbols.success, file, "\n");
    }

    // Write the graph to a file as json
    write_json_graph(ctx);
    console.log("", logSymbols.success, "wrote data to", ctx.config.out);
    
    // Success
    console.log("", logSymbols.success, "done", "\n");
    clean_exit(ctx, 0);
}


main();


//////////////////////////////////////////////////////////////////////////////


function get_config() {
    
    // Parse args
    const args = cli(cliSpec);    

    // Check args
    let config = check_args(args);

    // Handle errors
    if (!config.ok) {
        console.log(config.error_msg);
        process.exit(1);
    }
    
    return config;
}

function check_args(args) {
    
    if (!args.server) {
        return { ok: false, error_msg: "missing --server: need a path to a language server" };
    }
    if (!args.dir) {
        return { ok: false, error_msg: "missing --dir: need a path to source code directory" };
    }
    return {
        ok: true,
        server: path.resolve(args.server),
        dir: path.resolve(args.dir),
        out: path.resolve(args.out ? args.out : "./xrefs.json")
    };
}


//////////////////////////////////////////////////////////////////////////////


async function connect(config) {
    
    // Spawn and connect to a language server
    let server_result = await server.connect({
        binaryPath: config.server,
        projectDir: config.dir,
        check: check_capabilities
    });

    // Handle errors
    if (!server_result.ok) {
        console.log(server_result.error_msg);
        process.exit(1);
    }

    return server_result;
}


function check_capabilities(caps) {

    // Check that the server supports finding symbols
    if (!caps.documentSymbolProvider)
        return {
            ok: false,
            error_msg: "server doesn't have document symbol provider capability"
        };
    
    // Check that the server supports finding references
    if (!caps.referencesProvider)
        return {
            ok: false,
            error_msg: "server doesn't have references provider capability"
        };

    return { ok: true };
}


//////////////////////////////////////////////////////////////////////////////


function get_files(ctx) {
    
    // Find files to cross reference
    let files_result = find_javascript_files(ctx.config);

    // Handle errors
    if (!files_result.ok) {
        console.log(files_result.error_msg);
        clean_exit(ctx, 1);
    }

    return files_result.paths;
}


function find_javascript_files(config) {
    
    var files = [];
    try {
        walk(config.dir, function(file) {
            if (path.extname(file) === ".js")
                files.push(file);
        });
    } catch (error) {
        return { ok: false, error_msg: error.toString() };
    }
    
    return { ok: true, paths: files };
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


//////////////////////////////////////////////////////////////////////////////


async function get_symbols(ctx, file) {
    
    // Find symbols
    let symbol_result = await symbols.get(ctx.server.conn, file);
    
    // Handle errors
    if (!symbol_result.ok) {
        console.log(symbol_result.error_msg);
        clean_exit(ctx, 1);
    }
    
    return symbol_result.symbols;
}

function ensure_correct_location(ctx, file_lines, symbol, kind) {

    // Sanity check
    let lineno = symbol.location.range.start.line;
    if (lineno >= file_lines.length) {
        console.log("symbol is one line", lineno,
                    "but file only has", file_lines.length, "lines");
        clean_exit(ctx, 1);
    }

    // Tokenize the line
    let line = file_lines[lineno];
    let tokens = tokenize(line);

    // Find token that corresponds to symbol kind and adjust character
    // offset to match
    for (var token of tokens) {
        if (token.type === kind) {
            console.log("    ", "-",
                        "symbol", symbol.name, "started at", symbol.location.range.start.character,
                        "but tokenizer positions it at", token.offset);
            symbol.location.range.start.character = token.offset;
            return symbol;
        }
    }

    // Something went wrong with the tokenizer or symbol data
    console.log("couldn't find token type", kind, "in line", lineno);
    console.log("\nline:");
    console.log(line);
    console.log("\ntokens:");
    console.log(tokens);
    clean_exit(ctx, 1);    
}

async function add_symbol(ctx, symbol) {
    
    // Find references
    let refs_result = await references.get(ctx.server.conn, symbol.location);
    
    // Handle errors
    if (!refs_result.ok) {
        console.log(refs_result.error_msg);
        clean_exit(ctx, 1);
    }

    let symbol_id = make_id(ctx, symbol.location);
    if (ctx.graph.has(symbol_id)) {
        console.log("Symbol is already in graph:");
        console.log("\n" + symbol);
        console.log("\n" + ctx.graph);
        clean_exit(ctx, 1);
    }
    
    // Transform references into compact ids
    let reference_ids = refs_result.references.map(function(ref) {
        return make_id(ctx, ref);
    });
    
    // Save the data
    ctx.graph.set(symbol_id, reference_ids);
}

function make_id(ctx, location) {

    // Make the path relative to the project directory
    let uri = URI.parse(location.uri);
    let relpath = path.relative(ctx.config.dir, uri.path);
    
    // path:L(line):(offset)
    return relpath
        + ":L" + location.range.start.line
        + ":" + location.range.start.character;
}


//////////////////////////////////////////////////////////////////////////////


function write_json_graph(ctx) {
    let json_result = graph_to_json(ctx.config.dir,
                                    ctx.graph,
                                    ctx.config.out);
    if (!json_result.ok) {
        console.log(json_result.error_msg);
        clean_exit(ctx, 1);
    }
}

function graph_to_json(project_dir, graph, output_file) {
    let json = {
        dir: project_dir,
        symbols: {}
    };

    graph.forEach(function(value, key, map) {
        json.symbols[key] = value;
    });

    try {
        fs.writeFileSync(output_file, JSON.stringify(json, null, 2));
    } catch (error) {
        return { ok: false, error_msg: error.toString() };
    }

    return { ok: true };
}


//////////////////////////////////////////////////////////////////////////////


function clean_exit(ctx, code) {
    server.exit(ctx.server.conn);
    process.exit(code);
}
