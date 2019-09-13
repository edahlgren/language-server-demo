const lst = require('vscode-languageserver-types');
const { URI } = require('vscode-uri');


//////////////////////////////////////////////////////////////////////////////


async function get_symbols(conn, file) {
    let uri_path = URI.file(file).toString();
    
    let result;
    try {
        result = await conn.sendRequest('textDocument/documentSymbol', {
            textDocument: {
                uri: uri_path
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
        return "enum-member";
    case lst.SymbolKind.Struct:
        return "struct";
    case lst.SymbolKind.Event:
        return "event";
    case lst.SymbolKind.Operator:
        return "operator";
    case lst.SymbolKind.TypeParameter:
        return "type-parameter";
    default:
        return "unknown";
    }
}


//////////////////////////////////////////////////////////////////////////////


module.exports = {
    get: get_symbols,
    kindToString: print_symbol_kind
};
