
// Find the table element
var table = document.getElementById('file-table');

// Handle hash changes
function handle_hash_change() {

    // Is there an anchor?
    let anchor = window.location.hash;
    let parts = anchor.split('#');
    if (parts.length != 2)
        return;

    // Is it a line number?
    let line = parts[1];
    if (!/L\d+/.test(line))
        return;

    // Is there already something highlighted?
    let highlighted = table.dataset.highlighted;

    // Is it already this line?
    if (highlighted === line)
        return;

    // Is it something else?
    if (highlighted && highlighted !== "") {
        
        // Remove the highlighted class element so
        // two lines aren't highlighted at once
        let old = document.getElementById(highlighted);
        old.classList.remove("highlight");
    }

    // Add the highlight class to this line
    let elem = document.getElementById(line);
    elem.classList.add("highlight");

    // Save this in the table dataset
    table.dataset.highlighted = line;
}

// Handle potential hashes on load
handle_hash_change();

// Handle hash changes
window.onhashchange = handle_hash_change;

// Change the hash when a line number is clicked
var lines = table.getElementsByClassName('line-number');

for (var i = 0; i < lines.length; i++) {
    lines[i].onclick = function(e) {
        window.location.hash = "#" + e.target.parentNode.id;
    };
}
