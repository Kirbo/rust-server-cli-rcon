var W3CWebSocket = require('websocket').w3cwebsocket;
const fs = require('fs');

var client = {
    _client: null,
    _init: true,
    _lastIndex: 1001,
    _toolsCallbacks: {},
    _callbacks: {},
    _state: {
        connected: false,
        connecting: true,
    },
    _serverInfo: {},
    _term: null,
    _retryTime: 5,
    _retryTimeDefault: 5,
    _retryTimeMax: 60,
    _connectionCount: 0,
    _interval: null,

    Connect: function (config, callbacks) {
        client._state.connecting = true;
        client._state.connected = false;
        client._connectionCount = client._connectionCount + 1;
        client._toolsCallbacks = callbacks
        client._toolsCallbacks['addLogRow']({Message:'[CONNECTION] Connecting...',Time: (new Date/1000)});
        client._client = new W3CWebSocket('ws://' + config.addr + ':' + config.port + '/' + config.passwd);

        client._client.onerror = function () {
            var retryTime = (client._connectionCount * client._retryTime);
            if ( retryTime > client._retryTimeMax) {
                retryTime = client._retryTimeMax;
            }
            client._retryTime = retryTime;
        };

        client._client.onopen = function () {
            client._init = false;
            client._connectionCount = 0;
            client._retryTime = client._retryTimeDefault;
            client._state.connecting = false;
            client._state.connected = true;
            client._toolsCallbacks['addLogRow']({Message:'[CONNECTION] Connected',Time: (new Date/1000)});
            client.Request('serverinfo', function (data) {
                client._term.grabInput(false);
                client.setServerInfo(data);
                client._toolsCallbacks['start']();
                client._interval = setInterval(function () {
                    client.Request('serverinfo', client.setServerInfo, true);
                }, 500);

                client.getLogHistory(1000, true);
            }, true);
        };

        client._client.onclose = function () {
            client._toolsCallbacks['stop']();
            client._serverInfo = {};
            client._term.grabInput(true);
            clearInterval(client._interval);
            client._state.connecting = false;
            client._state.connected = false;
            var retryTime = client._retryTime;
            if ( client._init == true ) {
                retryTime = 1;
            }
            client._toolsCallbacks['addLogRow']({Message:'[CONNECTION] Closed, retrying in ' + retryTime + ' sec',Time: (new Date/1000)});

            setTimeout(function () {
                client.Connect(config, callbacks);
            }, (retryTime * 1000));

        };

        client._client.onmessage = function (e) {
            var data = JSON.parse(e.data);

            if (!data.Time) {
                data.Time = (new Date / 1000);
            }

            if (data.Identifier > 1000) {
                var cb = client._callbacks[data.Identifier];
                if (cb && cb.callback) {
                    cb.callback(data);
                }
                if (cb && cb.ignore !== true) {
                    if (data.Message) {
                        client._toolsCallbacks['addLogRow'](data);
                    }
                }
                client._callbacks[data.Identifier] = null;
            }
            else if (data.Identifier == 0) {
				if (!client._toolsCallbacks['dontLogToFile'](data.Message) && config.logfile.length > 0) {
    					let dateString = new Date().toString().split(' ').slice(1, 5).join(' ');
    					let fileDate = new Date().toISOString().substr(0, 7);

                        if (data.Message.match(/^((\[CHAT\]|\[TEAM CHAT\]) .+)/)) {
    						fs.appendFile('clientLogs/chat' + config.logfile + '.' + fileDate + '.log', dateString + ' - ' + data.Message + '\n',
    							function (err) { if (err) { } else { } });
    					} else {
    						fs.appendFile('clientLogs/rcon' + config.logfile + '.' + fileDate + '.log', dateString + ' - ' + data.Message + '\n',
    							function (err) { if (err) { } else { } });
    				}
                }

                if (data.Message && !client._toolsCallbacks['ignore'](data.Message)) {
                    client._toolsCallbacks['addLogRow'](data);
                    client._toolsCallbacks['redraw']();
                }
            }
        };
    },

    getLogHistory: function(length, limit) {
        client.Request('console.tail '+length, function (data) {
            var rows = JSON.parse(data.Message);
            var newRows = [];
            var terminalHeightTwice = false;
            for (var i = rows.length, len = 0; i >= len; i--) {
                if (rows[i] && rows[i].Message && !client._toolsCallbacks['ignore'](rows[i].Message)) {
                    newRows.push(rows[i]);
                    var lines = (client._term.height * 2);
                    if (limit && newRows.length == (lines > 100 ? lines : 100)) {
                        terminalHeightTwice = true;
                        newRows.reverse();
                        client._toolsCallbacks['setLog'](newRows);
                        return;
                    }
                }
            }
            if (terminalHeightTwice == false) {
                newRows.reverse();
                client._toolsCallbacks['setLog'](newRows);
            }
        }, true);
    },

    Request: function (message, callback, ignore) {
        var ignore = (ignore !== undefined ? ignore : false);

        if (ignore === false) {
            client._toolsCallbacks['addLogRow']({Message: '[RCON Command]: ' + message, Time: (new Date / 1000)});
        }

        if (client._state.connecting == true && client._state.connected == false) {
            setTimeout(function () {
                console.log('settimeout');
                client.Request(message, callback);
            }, 1000)
        }
        else {
            client._lastIndex++;
            client._callbacks[client._lastIndex] = {};
            client._callbacks[client._lastIndex]['ignore'] = ignore;
            if (callback) {
                client._callbacks[client._lastIndex]['callback'] = callback;
            }
            client.Command(message, client._lastIndex);
        }
    },

    Command: function (message, identifier) {
        if (identifier == null) {
            identifier = -1;
        }

        client._client.send(JSON.stringify({
            Identifier: identifier,
            Message: message,
            Name: "WebRcon"
        }));
    },

    setServerInfo: function (data) {
        if ( data && data.Message && !data.Message.match(/^NullReferenceException/i) && JSON.parse(data.Message) ) {
            client._serverInfo = JSON.parse(data.Message);
        }
    },

    setTerminal: function (term) {
        client._term = term;
    }
};


module.exports = client;
