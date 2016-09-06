var tools = require('./lib/functions');
var realTerm = require("terminal-kit").realTerminal;
var args = tools.parseArguments(process.argv.slice(2));

var server;

if (args && args.server) {
    server = args.server;
}

tools.init(realTerm, server);

realTerm.eraseDisplay();
realTerm.fullscreen(true);
