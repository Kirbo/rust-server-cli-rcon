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
    _autoComplete: [
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

    init: function (term) {
        tools._term = term;
        websocket.setTerminal(tools._term);
        tools._term.grabInput(true);
        tools._websocket = websocket.Connect({
            addr: config.server.address,
            port: config.rcon.port,
            passwd: config.rcon.password
        }, {
            start: tools.start,
            stop: tools.stop,
            log: tools.logResponse,
            ignore: tools.ignoreRow,
            setLog: tools.setLog,
            redraw: tools.redraw,
            addLogRow: tools.addLogRow
        });

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
                if (newScroll > (tools._log.length - tools.getHeight())) {
                    newScroll = tools._log.length - tools.getHeight();
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
            tools.redrawLog();
            tools.redraw();
            tools.setScrollLines();
        });
        tools.startInterval();
    },

    setScrollLines: function() {
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
        var newLog = rows;
        for (var i = 0, len = tools._log.length; i < len; i ++) {
            newLog.push(tools._log[i]);
        }
        tools._log = newLog;
        tools._currentScroll = (rows.length - tools.getHeight());
        tools.redrawLog();
        tools.redraw();
    },

    addLogRow: function (row) {
        if (tools._currentScroll == (tools._log.length - tools.getHeight())) {
            tools._currentScroll = ((tools._log.length + 1) - tools.getHeight());
        }
        tools._log.push(row);
        if ( tools._log.length > 10000 ) {
            tools._log.shift();
        }
        tools.redrawLog();
        tools.redraw();
    },

    header: function () {
        tools._term.moveTo.bgBlack.white(1, 1).eraseLine();
        tools._term('Connection status:');
        if (websocket._state.connected) {
            var title = 'Connected';
            tools._term.moveTo.bgBlack.brightGreen(20, 1).eraseLineAfter();
            tools._term(title);
            tools._term.white.bgBlack();
        }
        else if (websocket._state.connecting) {
            var title = 'Connecting...';
            tools._term.moveTo.bgBlack.brightYellow(20, 1).eraseLineAfter();
            tools._term(title);
            tools._term.white.bgBlack();
        }
        else {
            var title = 'Closed';
            tools._term.moveTo.bgBlack.brightRed(20, 1).eraseLineAfter();
            tools._term(title);
            tools._term.white.bgBlack();
        }

        var maxScroll = (tools._currentScroll + tools.getHeight());
        if (maxScroll > tools._log.length) {
            maxScroll = tools._log.length;
        }
        var scrollText = "Lines: " + (tools._currentScroll+1) + ' - ' + maxScroll + ' / ' + tools._log.length;
        tools._term.moveTo.bgBlack.white((tools._term.width / 2) - (scrollText.length / 2), 1);
        tools._term(scrollText);

        var realTime = 'Server time: ' + new Date;
        tools._term.moveTo.bgBlack.white((tools._term.width - realTime.length), 1);
        tools._term(realTime);


        if (websocket._serverInfo.Hostname) {
            var title = "Rust Server: " + websocket._serverInfo.Hostname;
            tools._term.moveTo.bgBlue.white(1, 2).eraseLine();
            tools._term(title);
            tools._term.styleReset();

            var networkText = "Network in: " + websocket._serverInfo.NetworkIn+', out: '+websocket._serverInfo.NetworkOut;
            tools._term.moveTo.bgBlue.white((tools._term.width / 2) - (networkText.length / 2), 2);
            tools._term(networkText);

            var gameTime = 'Game time: ' + websocket._serverInfo.GameTime;
            tools._term.moveTo.bgBlue.white((tools._term.width - gameTime.length), 2);
            tools._term(gameTime);

            tools._term.moveTo.bgBlue.white(1, 3).eraseLine();
            tools._term("Players: ");
            tools._term(websocket._serverInfo.Players + '/' + websocket._serverInfo.MaxPlayers + ', ');
            tools._term("joining: " + websocket._serverInfo.Joining + ', ');
            tools._term("queued: " + websocket._serverInfo.Queued);

            var serverInfo = "Memory: " + websocket._serverInfo.Memory + ', FPS: ' + websocket._serverInfo.Framerate + ', Entities: ' + websocket._serverInfo.EntityCount;
            tools._term.moveTo.bgBlue.white((tools._term.width / 2) - (serverInfo.length / 2), 3);
            tools._term(serverInfo);

            var uptime = "Uptime: " + tools.humanizeDuration(websocket._serverInfo.Uptime);
            tools._term.moveTo.bgBlue.white((tools._term.width - uptime.length), 3);
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
                    tools._term.left(length).green(input + "\n");
                    tools.redraw();
                    tools._history.push(input);
                    websocket.Request(input, tools.logResponse);
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
        if (tools._input) {
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
        if ( websocket._serverInfo.Hostname ) {
            tools.redrawFooter();
        }
        tools._term.restoreCursor();
    },

    redrawLog: function () {
        tools._term.moveTo(1, 4).eraseDisplayBelow();
        for (var i = 0, len = tools.getHeight(); i < len; i++) {
            tools.logResponse(tools._log[tools._currentScroll + i]);
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
        if ( tools._input ) {
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
            tools.log(row.Message, row.Time);
        }
    },

    ignoreRow: function (message) {
        if (
            message.match(/^(Saving complete)/i)
            || message.match(/^(Saved .* ents, serialization.*, write.*, disk.* totalstall)/i)
            || message.match(/^(NullReferenceException)/i)
        ) {
            return true;
        }
        else {
            return false;
        }
    },

    log: function (row, time) {
        var thisTime = time;
        if (!thisTime) {
            thisTime = new Date;
        }
        else {
            thisTime = new Date(time * 1000);
        }

        /*
         0 = black
         1 = dark red
         2 = dark green
         3 = dark yellow
         4 = dark blue
         5 = dark pink / purple
         6 = dark teal
         7 = light gray
         8 = dark gray
         9 = red
         10 = green
         11 = yellow
         12 = blue
         13 = pink/purple
         14 = light blue
         15 = white
         */

        if (
            row.match(/^(\[CHAT\])/i)
            || row.match(/^(\[CONNECTION\] Connected)$/i)
        ) {
            tools._term.colorRgb(51, 255, 51); // green
            //tools._term.color(2);
        }
        else if (row.match(/^(\[RCON Command\])/i)) {
            tools._term.colorRgb(255, 102, 178); // pink
            //tools._term.color(5);
        }
        else if (
            row.match(/^(\[EAC\])/i)
            || row.match(/^(\[CONNECTION\] (Closed, retrying in (.*?) sec|Error))$/i)
        ) {
            tools._term.colorRgb(255, 0, 0); // red
            //tools._term.color(9);
        }
        else if (row.match(/^(\[event\])/i)) {
            tools._term.colorRgb(51, 153, 255); // blueish
            //tools._term.color(6);
        }
        else if (row.match(/( has auth level \d)$/i)) {
            tools._term.colorRgb(255, 153, 51); // orangeish
            //tools._term.color(13);
        }
        else if (
            row.match(/( joined \[(.*)\])$/i)
            || row.match(/( disconnecting: (.*?))$/i)
            || row.match(/( was killed by )/i)
            || row.match(/( died )/i)
            || row.match(/^(\[CONNECTION\] Connecting...)$/i)
        ) {
            tools._term.colorRgb(255, 255, 51); // yellowish
            //tools._term.color(5);
        }

        tools._term('[' + thisTime + '] - ' + row + "\n");
        tools._term.defaultColor();
    },

    humanizeDuration: function (t) {
        return parseInt(t / 86400) + 'd ' + (new Date(t % 86400 * 1000)).toUTCString().replace(/.*(\d{2}):(\d{2}):(\d{2}).*/, "$1h $2m $3s");
    }
};


module.exports = tools;
