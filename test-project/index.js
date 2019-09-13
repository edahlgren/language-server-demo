const path = require('path');
const print = require('pretty-print');

const walk = require('./walk');

function main() {
    walk('.', function(file) {
        if (path.extname(file) === ".js")
            console.log(file);
    });
    print(['val1', 'val2', 'val3'], {leftPadding: 0});
}

main();
