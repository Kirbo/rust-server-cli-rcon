var config = require('../config');
var websocket = require('./websocket');

var tools = {
    _term: '',
    _interval: '',
    _websocket: websocket,
    _serverInfo: {},
    _history: [],
    _input: '',
    _scrollLines: 10,
    _currentScroll: 0,
    _scrollTimeout: null,
    _log: [],
    _visibleLines: 0,
    _server: config[Object.keys(config)[0]],
    _autoComplete: [
        'getlog ',
        'serverinfo',
        'status',
        'playerlist',
        'kick "player"',
        'ownerid <steamid> "player name" "reason"',
        'moderatorid <steamid> "player name" "reason"',
        'notice.popupall "message"',
        'say message',
        'find *',
        'ban "player/steamid"',
        'banid <steamid> "reason"',
        'removeid <steamid>',
        'unbanall',
        'banlist',
        'banlistex',
        'truth.enforce true/false',
        'save.all',
        'save.autosavetime "amount"',
        'teleport.toplayer "player 1" "player 2"',
        'teleport.topos "player" "Pos X" "Pos Y" "Pos Z"',
        'inv.giveplayer "player" "item" "amount"',
        'inv.giveall "item" "amount"',
        'dmg.godmode true/false',
        'crafting.complete',
        'crafting.cancel',
        'crafting.instant true/false',
        'crafting.instant_admins true/false',
        'crafting.timescale "amount"',
        'conditionloss.damagemultiplier "amount"',
        'conditionloss.armorhealthmult "amount"',
        'airdrop.drop',
        'airdrop.min_players "amount"',
        'server.writecfg',
        'server.save',
        'server.hostname',
        'server.clienttimeout "time"',
        'server.maxplayers "amount"',
        'server.pvp true/false',
        'server.steamgroup "steamgroup ID"',
        'sleepers.on true/false',
        'env.timescale "amount"',
        'env.time "amount"',
        'env.daylength "amount"',
        'env.nightlength "amount"',
        'falldamage.enabled true/false',
        'cheaters.log true/false',
        'player.backpackLockTime "amount"',
        'censor.nudity true/false'
    ],

    init: function (term, server) {
        tools._term = term;
        websocket.setTerminal(tools._term);

        if (server) {
            if (config[server]) {
                tools._server = config[server];
            }
            else {
                tools._term.eraseDisplay();
                tools._term.moveTo(1, 1);
                tools._term.reset();
                tools._term('No configurations found with "' + server + '"\n');
                tools._term.grabInput(false);
                process.exit();
            }
        }

        if (typeof tools._server.macros === 'object') {
            tools._autoComplete = tools._autoComplete.concat(Object.keys(tools._server.macros));
        }

        tools._term.grabInput(true);
        tools._websocket = websocket.Connect({
            addr: tools._server.server.address,
            port: tools._server.rcon.port,
            passwd: tools._server.rcon.password
        }, {
            start: tools.start,
            stop: tools.stop,
            log: tools.logResponse,
            ignore: tools.ignoreRow,
            dontLogToFile: tools.dontLogToFile,
            setLog: tools.setLog,
            redraw: tools.redraw,
            addLogRow: tools.addLogRow
        });

        if (tools._server && Array.isArray(tools._server.autoCommands)) {
            tools._server.autoCommands.forEach((command) => {
                websocket.Request(command, tools.logResponse);
            });
        }

        term.on('key', function (name, matches, data) {
            if (name === 'CTRL_C') {
                tools.terminate();
            }
            if (name === 'PAGE_UP') {
                var newScroll = (tools._currentScroll - tools._scrollLines);
                if (newScroll < 0) {
                    newScroll = 0;
                }
                if (newScroll != tools._currentScroll) {
                    tools._currentScroll = newScroll;
                    tools.redrawLog();
                    tools.redraw();
                }
            }
            if (name === 'PAGE_DOWN') {
                var newScroll = (tools._currentScroll + tools._scrollLines);
                var nextPageLines = tools.nextPageLines();
                if (newScroll > tools._log.length - nextPageLines) {
                    newScroll = tools._log.length - nextPageLines;
                }

                if (newScroll < 0) {
                    newScroll = 0;
                }
                if (newScroll != tools._currentScroll) {
                    tools._currentScroll = newScroll;
                    tools.redrawLog();
                    tools.redraw();
                }
            }
        });
        tools.setScrollLines();

        term.on('resize', function () {
            if ( tools._currentScroll == (tools._log.length - tools._scrollLines)) {
                var lastLine = true;
            }
            tools.setScrollLines();
            if ( lastLine ) {
                tools._currentScroll = (tools._log.length - tools.getHeight());
            }
            tools.redrawLog();
            tools.redraw();
        });
        tools.startInterval();
    },

    nextPageLines: function() {
        var lines = 0;
        var getHeight = tools.getHeight();
        var lastLine = (tools._currentScroll + tools._scrollLines);
        if ( lastLine > tools._log.length - getHeight) {
            lastLine = tools._log.length - 1;
        }
        var terminalHeight = getHeight;
        for (var i = lastLine; i > (lastLine - terminalHeight); i--) {
            var thisLines = 1;
            if ( tools._log[i] ) {
                thisLines = Math.ceil( tools._log[i].length / tools._term.width );
            }
            lines += thisLines;
            if ( lines >= getHeight) {
                return lines;
            }
        }
        return lines;
    },

    setScrollLines: function () {
        var halfScreen = Math.ceil(tools.getHeight() / 2);
        tools._scrollLines = ( halfScreen > 1 ? halfScreen : 1 );
    },

    getHeight: function () {
        return (tools._term.height - 4)
    },

    terminate: function () {
        tools._term.moveTo(1, tools._term.height);
        tools._term('Are you sure you want to quit? [Y|n]').eraseLineAfter();
        tools.startInterval();

        tools._term.yesOrNo({yes: ['y', 'ENTER'], no: ['n', 'ESCAPE']}, function (error, result) {
            if (result) {
                setTimeout(function () {
                    tools._term.eraseDisplay();
                    tools._term.moveTo(1, 1);
                    tools._term.reset();
                    process.exit();
                }, 100);
            }
            else {
                tools.redraw();
                tools._term.moveTo(1, tools._term.height);
                tools._term(tools._input.getInput()).eraseLineAfter();
            }
        });
    },

    setLog: function (rows) {
        tools._log = [];
        for (var rowIndex = 0, rowLength = rows.length; rowIndex < rowLength; rowIndex++) {
            var row = rows[rowIndex];
            tools.addRowToLog(row);
        }
        var newScroll = (tools._log.length - tools.getHeight());
        if (newScroll < 0) {
            newScroll = 0;
        }
        tools._currentScroll = newScroll;
        tools.redrawLog();
        tools.redraw();
    },

    addRowToLog: function (row) {
        var lines = 1;
        if (row && row.Message) {
            lines = row.Message.split("\n");
            for (var lineIndex = 0, lineLength = lines.length; lineIndex < lineLength; lineIndex++) {
                if (lineIndex == 0) {
                    var thisTime = row.Time;
                    if (!thisTime) {
                        thisTime = new Date;
                    }
                    else {
                        thisTime = new Date(row.Time * 1000);
                    }
                }

                thisTime = thisTime.toString().split(' ').slice(1, 5).join(' ');

                var logRow = '[' + thisTime + '] - ' + lines[lineIndex];
                if (lineIndex > 0) {
                    logRow = lines[lineIndex];
                }

                tools._log.push(logRow);
            }
        }
    },

    addLogRow: function (row) {
        if (tools._currentScroll == (tools._log.length - tools.getHeight())) {
            var lastLine = true;
        }
        tools.addRowToLog(row);

        if ( lastLine ) {
            tools._currentScroll = (tools._log.length - tools.getHeight());
        }

        if (tools._log.length > 10000) {
            tools._log.shift();
        }
        tools.redrawLog();
        tools.redraw();
    },

    header: function () {
        tools._term.moveTo.bgBlack.white(1, 1).eraseLine();
        var statusTitle = 'Status:';
        tools._term(statusTitle);
        tools._term.moveTo((statusTitle.length + 2), 1);
        if (websocket._state.connected) {
            var title = 'Connected';
            tools._term.bgBlack.brightGreen.eraseLineAfter();
        }
        else if (websocket._state.connecting) {
            var title = 'Connecting...';
            tools._term.bgBlack.brightYellow.eraseLineAfter();
        }
        else {
            var title = 'Disconnected';
            tools._term.bgBlack.brightRed.eraseLineAfter();
        }
        tools._term(title);
        tools._term.white.bgBlack();

        var maxScroll = (tools._currentScroll + tools._visibleLines);
        if (maxScroll > tools._log.length) {
            maxScroll = tools._log.length;
        }
        var scrollText = "Lines: " + (tools._currentScroll + 1) + ' - ' + maxScroll + ' / ' + tools._log.length;
        tools._term.moveTo.bgBlack.white((tools._term.width / 2) - (scrollText.length / 2), 1);
        tools._term(scrollText);

        var realTime = ''+new Date;
        tools._term.moveTo.bgBlack.white((tools._term.width - realTime.length +1), 1);
        tools._term(realTime);


        if (websocket._serverInfo.Hostname) {
            var title = "Rust Server: " + websocket._serverInfo.Hostname;
            tools._term.moveTo.bgBlue.white(1, 2).eraseLine(title + Array(tools._term.width - title.length +1).join(' '));

            var networkText = "Network in: " + websocket._serverInfo.NetworkIn + ', out: ' + websocket._serverInfo.NetworkOut;
            tools._term.moveTo((tools._term.width / 2) - (networkText.length / 2), 2);
            tools._term(networkText);

            var gameTime = 'Game time: ' + websocket._serverInfo.GameTime;
            tools._term.moveTo((tools._term.width - gameTime.length +1), 2);
            tools._term(gameTime);

            var players = "Players: ";
            players = players+websocket._serverInfo.Players + '/' + websocket._serverInfo.MaxPlayers + ' (';
            players = players+websocket._serverInfo.Joining + ' joining, ';
            players = players+websocket._serverInfo.Queued+' queued)';

            tools._term.moveTo.bgBlue.white(1, 3).eraseLine(players + Array(tools._term.width - players.length +1).join(' '));

            var serverInfo = "Memory: " + websocket._serverInfo.Memory + ', FPS: ' + websocket._serverInfo.Framerate + ', Entities: ' + websocket._serverInfo.EntityCount;
            tools._term.moveTo((tools._term.width / 2) - (serverInfo.length / 2), 3);
            tools._term(serverInfo);

            var uptime = "Uptime: " + tools.humanizeDuration(websocket._serverInfo.Uptime);
            tools._term.moveTo((tools._term.width - uptime.length +1), 3);
            tools._term(uptime);
        }
        else {
            tools._term.moveTo(1, 2).eraseLine();
            tools._term.moveTo(1, 3).eraseLine();
        }

        tools._term.styleReset();
    },

    footer: function () {
        tools._input = tools._term.inputField(
            {
                history: tools._history,
                autoComplete: tools._autoComplete,
                autoCompleteMenu: {
                    y: tools._term.height
                }
            },
            function (error, input) {
                var length = 0;
                if (input && input.length && input.length > 0) {
                    length = input.length;
                }

                if (input) {
                    var logLength = input.match(/^getlog (\d+)$/);
                    if (logLength && logLength.length > 1) {
                        tools._log = [];
                    }

                    tools._term.left(length).green(input + "\n");
                    tools.redraw();
                    tools._history.push(input);

                    const macro = (tools._server.macros || {})[input];
                    if (Array.isArray(macro)) {
                        macro.forEach((cmd) => websocket.Request(cmd, tools.logResponse));
                    } else if (logLength && logLength.length > 1) {
                        websocket.getLogHistory(logLength[1]);
                    } else {
                        websocket.Request(input, tools.logResponse);
                    }

                    tools._term.moveTo(1, tools._term.height);
                    tools.footer();
                }
            }
        );

        var input = tools._input.getInput();
        var length = 0;
        if (input.length && input.length > 0) {
            length = input.length;
        }
        tools._term.moveTo(length, tools._term.height).eraseLine();
    },

    redrawFooter: function () {
        if (tools._input && websocket._serverInfo.Hostname) {
            var input = tools._input.getInput();
            var length = 0;
            if (input.length && input.length > 0) {
                length = input.length;
            }
            tools._term.moveTo(length, tools._term.height);
        }
    },

    redraw: function () {
        tools._term.saveCursor();
        tools.header();
        tools.redrawFooter();
        tools._term.restoreCursor();
    },

    redrawLog: function () {
        tools._visibleLines = 0;
        tools._term.moveTo(1, 4).eraseDisplayBelow();
        for (var i = tools._currentScroll, len = (tools._currentScroll + tools.getHeight()); i < len; i++) {
            var row = tools._log[i];
            tools.log(row);
            tools._visibleLines++;
            if ( row && row.length > tools._term.width ) {
                var lines = Math.ceil( row.length / tools._term.width)-1;
                len -= lines;
            }
        }
    },

    start: function () {
        tools._term.moveTo(1, tools._term.height);
        tools._term.saveCursor();
        tools.footer();
        tools.header();
    },

    startInterval: function () {
        tools._interval = setInterval(function () {
            tools.redraw();
        }, 500);
    },

    stop: function () {
        if (tools._input) {
            tools._input.abort();
            tools._input = null;
            tools._term.moveTo(1, tools._term.height).eraseLine();
        }
    },

    stopInterval: function () {
        clearInterval(tools._interval);
    },

    logResponse: function (row) {
        if (row && row.Message && !tools.ignoreRow(row.Message)) {

        }
    },

    ignoreRow: function (message) {
        if (
           message.match(/^(\[Manifest\]|Saving complete|Resetting|NullReferenceException)/)
		|| message.match(/Invalid Position: (?!servergibs(_patrolhelicopter|_bradley)).*\(destroying\)/)
		|| message.match(/Invalid NavAgent Position: .*\(destroying\)/)
		|| message.match(/\d{3,7}\[\d{3,7}\] (died|was killed by) \(Generic\)/)
		|| message.match(/\d{3,7}\[\d{3,7}\] was killed by sentry\.(bandit|scientist)\.static \(entity\)/)
		|| message.match(/Bone error in SkeletonProperties/)
		|| message.match(/changed its network group to null$/)
		|| message.match(/failed to sample navmesh at position/)
//		|| message.match(/Look rotation viewing vector is zero/)
		|| message.match(/(Dungeon|DoGeneration|Navmesh|100%)/)
        ) {
            return true;
        }
        else {
            return false;
        }
    },

    dontLogToFile: function (message) {
        if (
           message.match(/^(\[Manifest\]|\[Oxide\]|Saving complete|Resetting|NullReferenceException)/)
		|| message.match(/Invalid Position: (?!servergibs(_patrolhelicopter|_bradley)).*\(destroying\)/)
		|| message.match(/Invalid NavAgent Position: .*\(destroying\)/)
		|| message.match(/\d{3,7}\[\d{3,7}\] (died|was killed by) \(Generic\)/)
		|| message.match(/\d{3,7}\[\d{3,7}\] was killed by sentry\.(bandit|scientist)\.static \(entity\)/)
		|| message.match(/Checking for new Steam Item Definitions/)
		|| message.match(/Saved .* ents/)
		|| message.match(/no valid dismount$/)
		|| message.match(/Found null entries in the RF listener list/)
		|| message.match(/Bone error in SkeletonProperties/)
		|| message.match(/changed its network group to null$/)
		|| message.match(/failed to sample navmesh at position/)
		|| message.match(/Look rotation viewing vector is zero/)
		|| message.match(/(dungeon|DoGeneration|Navmesh|100%)/i)
        ) {
            return true;
        }
        else {
            return false;
        }
    },
    
    log: function (row) {
        if ( row ) {
            if (
                row.match(/^(\[.*\] - \[CHAT\])/i)
                || row.match(/^(\[.*\] - \[CONNECTION\] Connected)$/i)
            ) {
                tools._term.colorRgb(51, 255, 51); // green
            }
            else if (row.match(/^(\[.*\] - \[RCON Command\])/i)) {
                tools._term.colorRgb(255, 102, 178); // pink
            }
            else if (
                row.match(/^(\[.*\] - \[EAC\])/i)
                || row.match(/^(\[.*\] - \[CONNECTION\] (Closed, retrying in (.*?) sec|Error))$/i)
            ) {
                tools._term.colorRgb(255, 0, 0); // red
            }
            else if (row.match(/^(\[.*\] - \[event\])/i)) {
                tools._term.colorRgb(51, 153, 255); // blueish
            }
            else if (row.match(/( has auth level \d)$/i)) {
                tools._term.colorRgb(255, 153, 51); // orangeish
            }
            else if (
                row.match(/( joined \[(.*)\])$/i)
                || row.match(/( disconnecting: (.*?))$/i)
                || row.match(/( was killed by )/i)
                || row.match(/( died )/i)
                || row.match(/^(\[CONNECTION\] Connecting...)$/i)
            ) {
                tools._term.colorRgb(255, 255, 51); // yellowish
            }
        }

        tools._term((row ? row : '') + "\n");
        tools._term.defaultColor();
    },

    humanizeDuration: function (t) {
        return parseInt(t / 86400) + 'd ' + (new Date(t % 86400 * 1000)).toUTCString().replace(/.*(\d{2}):(\d{2}):(\d{2}).*/, "$1h $2m $3s");
    },


    parseArguments: function (arguments) {
        var newArguments = {};
        arguments.forEach(function (argument) {
            var split = argument.split('=');

            if (!split[1]) {
                split[1] = split[0];
                split[0] = 'command';
            }

            newArguments[split[0]] = split[1];
        });

        return newArguments;
    }
};


module.exports = tools;
