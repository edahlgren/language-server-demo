// Defines async cross reference

const cp = require('child_process');
const path = require('path');

const rpc = require('vscode-jsonrpc');
const lst = require('vscode-languageserver-types');
const { URI } = require('vscode-uri');

async function init(conn, project_path) {
    let result;
    try {
        result = await conn.sendRequest('initialize', {
            processId: process.pid,
            rootPath: project_path,
            workspaceFolders: [],
            capabilities: {}
        });
    } catch (error) {
        return {
            ok: false,
            error_msg: 'got error trying to initialize: ' + error.toString()
        };
    }

    return { ok: true, capabilities: result.capabilities };
}

async function get_symbols(conn, uri) {
    let result;
    try {
        result = await conn.sendRequest('textDocument/documentSymbol', {
            textDocument: {
                uri: uri
            }
        });
    } catch (error) {
        return {
            ok: false,
            error_msg: 'got error trying to get symbols: ' + error.toString()
        };
    }

    return { ok: true, symbols: result };
}

function print_symbol_kind(kind) {
    switch (kind) {
    case lst.SymbolKind.File:
        return "file";
    case lst.SymbolKind.Module:
        return "module";
    case lst.SymbolKind.Namespace:
        return "namespace";
    case lst.SymbolKind.Package:
        return "package";
    case lst.SymbolKind.Class:
        return "class";
    case lst.SymbolKind.Method:
        return "method";
    case lst.SymbolKind.Property:
        return "property";
    case lst.SymbolKind.Field:
        return "field";
    case lst.SymbolKind.Constructor:
        return "constructor";
    case lst.SymbolKind.Enum:
        return "enum";
    case lst.SymbolKind.Interface:
        return "interface";
    case lst.SymbolKind.Function:
        return "function";
    case lst.SymbolKind.Variable:
        return "variable";
    case lst.SymbolKind.Constant:
        return "constant";
    case lst.SymbolKind.String:
        return "string";
    case lst.SymbolKind.Number:
        return "number";
    case lst.SymbolKind.Boolean:
        return "boolean";
    case lst.SymbolKind.Array:
        return "array";
    case lst.SymbolKind.Object:
        return "object";
    case lst.SymbolKind.Key:
        return "key";
    case lst.SymbolKind.Null:
        return "null";
    case lst.SymbolKind.EnumMember:
        return "enum member";
    case lst.SymbolKind.Struct:
        return "struct";
    case lst.SymbolKind.Event:
        return "event";
    case lst.SymbolKind.Operator:
        return "operator";
    case lst.SymbolKind.TypeParameter:
        return "type parameter";
    default:
        return "unknown";
    }
}

async function get_references(conn, uri, line, char) {
    let result;
    try {
        result = await conn.sendRequest('textDocument/references', {
            textDocument: {
                uri: uri
            },
            position: {
                line: line,
                character: char
            },
            context: {
                includeDeclaration: false
            }
        });
    } catch (error) {
        return {
            ok: false,
            error_msg: 'got error trying to get references: ' + error.toString()
        };
    }

    return { ok: true, references: result };
}

function print_cross_references(xrefs) {
    xrefs.forEach(function(xref) {
        console.log(' ', '- symbol:', xref.symbol);
        console.log(' ', '- type:', xref.type);
        console.log('');
        console.log('   ', '- defined at:');
        console.log('     ', '- file:', xref.def.uri);
        console.log('     ', '- line:', xref.def.range.start.line + 1);
        console.log('     ', '- offset:', xref.def.range.start.character);
        console.log('');
        console.log('   ', '- references:');
        xref.refs.forEach(function(ref) {
            console.log('     ', '- file:', ref.uri);
            console.log('     ', '- line:', ref.range.start.line + 1);
            console.log('     ', '- offset:', ref.range.start.character);
            console.log('');
        });
        console.log('');
    });
}

async function cross_reference(langserver_path, project_path, file_path) {

    // Spawn the language server process
    let childProcess = cp.spawn("node", [langserver_path]);
    
    // Use stdin and stdout for communication
    let connection = rpc.createMessageConnection(
        new rpc.StreamMessageReader(childProcess.stdout),
        new rpc.StreamMessageWriter(childProcess.stdin));
    
    // Listen on the connection, or else sendRequest complains
    connection.listen();

    // Initialize the connection
    let init_result = await init(connection, project_path);
    if (!init_result.ok)
        return init_result;
    
    // Check that we have the server capabilities we need
    if (!init_result.capabilities) {
        console.log("server doesn't have capabilities");
        process.exit(1);
    }
    if (!init_result.capabilities.referencesProvider) {        
        console.log("server doesn't have references provider capability");
        process.exit(1);
    }
    if (!init_result.capabilities.documentSymbolProvider) {
        console.log("server doesn't have document symbol provider capability");
        process.exit(1);
    }

    // Tell the server that we checked its params
    connection.sendNotification('initialized');
    
    // Parse the file path into a URI string
    let uri_path = URI.file(file_path).toString();

    // Find the symbols in the file
    let symbols_result = await get_symbols(connection, uri_path);
    if (!symbols_result.ok)
        return symbols_result;

    // Find the references for each symbol
    var xrefs = [];
    for (var symbol of symbols_result.symbols) {
        
        // Query for references to this symbol
        let refs_result = await get_references(connection, symbol.location.uri,
                                               symbol.location.range.start.line,
                                               symbol.location.range.start.character);
        if (!refs_result.ok)
            return refs_result;

        // Collect cross references
        xrefs.push({
            symbol: symbol.name,
            type: print_symbol_kind(symbol.kind),
            def: symbol.location,
            refs: refs_result.references
        });
    }

    // Tell the server we're done
    connection.sendNotification('exit');
    
    return { ok: true, xrefs: xrefs };
}

module.exports = {
    get_references: cross_reference,
    print_references: print_cross_references
};
