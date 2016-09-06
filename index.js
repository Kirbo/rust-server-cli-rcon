var tools = require('./lib/functions');
var realTerm = require("terminal-kit").realTerminal;

tools.init(realTerm);

realTerm.eraseDisplay();
realTerm.fullscreen(true);
