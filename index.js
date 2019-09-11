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