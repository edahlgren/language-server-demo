const prism = require('prismjs');

// Borrow the token type from prismjs for conformity
function Token(type, content, alias, length, greedy) {
    this.type = type;
    this.content = content;
    this.alias = alias;
    // Copy of the full string this token was created from
    this.length = length;
    this.greedy = !!greedy;
}

function token_type(whitespace, string_type) {
    let type = "chars";
    if (string_type)
        type = string_type;
    if (whitespace)
        type = "whitespace";
    return type;
}

function split_string_token(str, string_type) {
    
    // Handle zero length strings first
    if (str.length == 0)
        return [];
    
    // Does the string begin with whitespace?
    let whitespace = (str.search(/\s/g) == 0);
    
    let tokens = [];
    let next = 1;
    
    while (next > 0) {
        // Search for this pattern
        let regex = (whitespace ? /[^\s]/g : /\s/g);
        next = str.search(regex);

        // Extract the substring for the new token
        let substr = str;
        if (next > 0){
            substr = str.substring(0, next);
            str = str.substring(next);
        }

        // Find the type of the string
        let type = token_type(whitespace, string_type);
        
        // Add the token
        tokens.push(new Token(type, substr, undefined, substr.length, false));
        
        // Flip and search for the opposite
        whitespace = !whitespace;
    }

    return tokens;
}

function expand(tokens, string_type) {
    let expanded = [];
    tokens.forEach(function(token) {

        // Expand arrays
        if (Array.isArray(token)) {
            let extra = expand(token);
            expanded = expanded.concat(extra);
            return;
        }

        // Expand array content
        if (Array.isArray(token.content)) {
            let extra = expand(token.content, token.type);
            expanded = expanded.concat(extra);
            return;
        }

        // Expand string tokens
        if (typeof token == 'string') {
            let extra = split_string_token(token, string_type);
            expanded = expanded.concat(extra);
            return;
        }

        // Add normal tokens
        expanded.push(token);
    });
    
    return expanded;
}

function tokenize(text) {

    // Tokenize the text
    let grammar = prism.languages['javascript'];
    let tokens = prism.tokenize(text, grammar);

    // Expand arrays, and strings into 'whitespace' and
    // 'string' tokens
    tokens = expand(tokens);

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

        // Is it whitespace?
        if (token.type === "whitespace") {

            // Add line and offset info for debugging purposes at least
            token.line = line;
            token.offset = offset;

            // Increment newlines if there are any
            let lines = newlines(token.content);
            line += lines;

            // Increment offset based whether there were lines added
            if (lines > 0) {
                offset = 0;
                offset += extra(token.content);
            } else {
                offset += token.length;
            }
            
            return;
        }

        // Otherwise add the line and offset information
        token.line = line;
        token.offset = offset;
        
        // Adjust the offset by the length of the content. If this
        // contained a real newline then it would just be a string,
        // so no need to advance the line count
        offset += token.length;
    });

    return tokens;
}

module.exports = tokenize;
