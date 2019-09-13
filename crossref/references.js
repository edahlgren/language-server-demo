// No deps


//////////////////////////////////////////////////////////////////////////////


async function get_references(conn, location) {
    let result;
    try {
        result = await conn.sendRequest('textDocument/references', {
            textDocument: {
                uri: location.uri
            },
            position: {
                line: location.range.start.line,
                character: location.range.start.character
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


//////////////////////////////////////////////////////////////////////////////


module.exports = {
    get: get_references
};
