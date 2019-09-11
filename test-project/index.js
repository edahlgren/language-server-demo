function main() {
    bar();
    foo();
}

function foo() {
    bar();
}

function bar() {
    console.log("hello world");
}

main();
