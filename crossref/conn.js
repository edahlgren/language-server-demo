const cp = require('child_process');
const path = require('path');

const rpc = require('vscode-jsonrpc');
const lst = require('vscode-languageserver-types');
const { URI } = require('vscode-uri');


//////////////////////////////////////////////////////////////////////////////


// binaryPath:  path to language server binary
// projectDir:  path to project directory
// checks:      [ function(capabilities) -> return ok, error_msg ]


//////////////////////////////////////////////////////////////////////////////


async function get_capabilities(conn, project_path) {
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

async function connect(config) {
    
    // Spawn the language server as a child process
    let childProcess = cp.spawn("node", [config.binaryPath]);
    
    // Use stdin and stdout for communication with the language server
    let connection = rpc.createMessageConnection(
        new rpc.StreamMessageReader(childProcess.stdout),
        new rpc.StreamMessageWriter(childProcess.stdin));

    // Listen on the connection, or else cannot use sendRequest
    connection.listen();

    // Ask the server for its capabilities, also initializing it with
    // the project path
    let cap_result = get_capabilities(connection, config.projectDir);
    if (!cap_result.ok)
        return cap_result;

    // Make sure the server actually sent back capabilities
    if (!cap_result.capabilities)
        return { ok: false, error_msg: "server doesn't have capabilities" };

    // Execute the checks
    for (var check of config.checks) {
        let check_result = check(cap_result.capabilities);
        if (!check_result.ok)
            return check_result;
    }

    // Tell the server that we checked its params
    connection.sendNotification('initialized');
    
    // Looks like everything is ok, return the child process and connection
    return { ok: true, proc: childProcess, conn: connection };
}

module.exports = {
    connect: connect
};
