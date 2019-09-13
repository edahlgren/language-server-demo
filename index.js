#!/usr/bin/env node


const fs = require('fs');
const path = require('path');

const prism = require('prismjs');
const xref = require('./xrefs.js');


/////////////////////////////////////////////////////////////////////////////////////////////


const server_bin = './extra/javascript-typescript-langserver/lib/language-server-stdio';
const project_path = path.resolve('./test-project');
const test_file = path.join(project_path, 'index.js');


/////////////////////////////////////////////////////////////////////////////////////////////


// DONE 0. Parse symbols and find references, and store this   -----|
//         information in a key-value store. Start only with        |
//         function symbols and store everything in a JSON          |
//         file, using the line and offset information to           | FIXME, these need to be
//         create the keys                                          | in sync with each other
//                                                                  |
// DONE 1. Associate tokens with line and offset information   -----|
//
//      2. Give html span elements a link based on the line
//         and offset information if they are a symbol or a
//         reference to a symbol
//
//      3. Load the JSON file into lunrjs and test a basic
//         query for the references of a symbol
//
//      4. Implement link-handling so that the lunrjs query is
//         invoked when a link on a symbol is clicked
//
//      5. Create anchors to line numbers in the html so that
//         the query page can jump to a line in a file
//
//      6. Create the HTML + CSS for the file pages and the
//         query result pages
//
// You can obviously add search and snippets later, but this
// is sort of the bare minimum you would need.


/////////////////////////////////////////////////////////////////////////////////////////////


function tokenize(file, language) {

    var out = [];

    let text = fs.readFileSync(file, 'utf8');
    let grammar = prism.languages[language];
    let tokens = prism.tokenize(text, grammar);

    var offset = 0;
    var line = 0;
    
    tokens.forEach(function(token) {
        
        /**
         let regexp = /\n/g;
         let str = '\n\n    ';
         
         let last_index = str.lastIndexOf('\n');
         
         let array = [...str.matchAll(regexp)];
         
         console.log('num newlines:', array.length);
         console.log('last newline at:', last_index);
         console.log('extra space:', str.length - (last_index + 1));
         **/
        
        if (typeof token == 'string') {
            // Move on.
            var len = token.length;
            
        }
        
    });
    
    return out;
}

async function exec() {

    // Note: 1 & 2 can be done separately. But we should probably
    // do 2 first so we can check that the hashes we find during
    // tokenization actually have data associated with them
    
    // 1. Generate the HTML with line number tags that we can
    //    jump to
    
    // Get tokens with extra offset and line number information
    let tokens = tokenize(test_file, 'javascript');

    // Wrap them them in span elements and give them ids unique
    // ids that combine the name, type, file, line, and offset
    // into a hash. Maybe make them into links
    // ...
    
    // Add line numbers
    // ...

    
    // 2. Get the reference information and write it to an XML or
    //    YAML file that's easy to load and parse later
    /**
    let xref_result = await xref.get_references(server_bin,
                                                project_path,
                                                test_file);
    if (!xref_result.ok)
        return xref_result;

    xref.print_references(xref_result.xrefs);
     **/


    // 3. Write javascript to handle the links and jump to the
    //    correct file + line (if only one option), or show the
    //    full results of options (defs, refs, etc) otherwise
    
}

exec();
