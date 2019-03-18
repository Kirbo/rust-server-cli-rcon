# rust-server-cli-rcon
Command Line Interface RCON Client for Rust Server

## Installation

### Installing Node.js

I suggest using [`nvm`](https://github.com/creationix/nvm).

### Installing the rust-server-cli-rcon

    # Install Yarn
    npm -g install yarn

    # Clone this repository
    git clone https://github.com/kirbo/rust-server-cli-rcon.git

    # Change directory
    cd rust-server-cli-rcon

    # Install dependencies
    yarn install

    # Copy sample config file
    cp example.config.js config.js

    # Edit the file you just copied with your favorite editor, e.g.
    nano config.js

    # Make sure you have "+rcon.web true" in your Rust server,
    # otherwice this wont work (at least for now)..

    # Start the client
    yarn start

## Usage

You can configure multiple servers into `config.js` and connect to any
of them, such as:

    # This connects to the first server in config.js
    yarn start

    # If you specify the "server" argument, you can connect to another
    yarn start server=another

    # And the last one
    yarn start server=someOther

The first 3 rows (Header) contains some information of this client and the Rust
server you connected to.

Last line is the input field you can type the RCON commands to.
The input has autocomplete for some predefined commands, simply tap
Tabulator to access the autocomplete menu, or type a part of the
command you want to use, such as `ser` and press TAB and it will be
autocompleted to a word `server` and if you press TAB again, you will
get a list of all the predefined commands starting by `server`, e.g.:

- serverinfo
- server.writecfg
- server.hostname
- server.clienttimeout "time"
- server.maxplayers "amount"
- server.pvp true/false
- server.steamgroup "steamgroup ID"

You can navigate the autocomplete menu via Left and Right arrow keys and
select the currently hilighted one by pressing Enter, or cancel the
autocomplete by pressing ESC.

You can autocomplete `serverinfo` like this:

* type `se`
* press **TAB** (it will now be `server`)
* type `i`
* press **TAB** (it will now be `serverinfo`)

OR

* type `s`
* press **TAB** once
* press **Enter** twice

The input has history, you can navigate the history of commands you sent
in the current session, via Up and Down arrow keys.

You can scroll the backlog via Page Up and Page Down keys. Currently
default maximum backlog length is set to *10000* rows.

### Exiting the client

Simply press **CTRL + C** and you will be asked
**"Are you sure you want to quit"**,

- press **Y** or **Enter** if you want to close the client, or
- press **N** or **ESC** if you don't want to close the client.

Closing the client wont close the Rust Server you connected to.

## Custom commands
At the moment there is only one custom command, but more will come.

- `getlog length`, e.g. `getlog 1000` which will request last 1000
  lines from Rust Server, parses the log lines and replaces the
  console log with it. This is handy if you want to check the history.

## Motivation
I personally got sick and tired of the current Rust Server tools.
There seemed not to be any out-of-the-box console (at least on Linux,
as far as I know) and [WebRCON provided by Facepunch](http://facepunch.github.io/webrcon/#/home) only works in a
browser (not even on `links`). I wanted a console which could be run on
a server without any desktop GUI and without any modifications done to
the Rust Server (i.e. Oxide), so that one could run a vanilla Rust
Server and still be able to locally manage the server in command line.

One reason also was to improve my Node.js skills and this seemed to be
a good project for that.

## To-do

- List all the commands in autocomplete menu
- Creating separate websocket for this client to connect to.
  This websocket would run on the game server and it could:
  - Run on a separate port,
  - Provide more specific information of the server itself, including:
    - Server load (cpu, memory, network, I/O, etc),
    - Sensor information (e.g. temperatures),
  - Ability to log RCON commands into a logfile(s),
  - Push notifications to all clients when another client connects
    or disconnects,
  - Push RCON commands and responses to every clients backlog,
  - This would also ease the load on the Rust Server itself, since
    only one client would poll the `serverinfo`, instead of every
    client which is open,
  - Provide a range of log, instead of last N number of lines.
    This is useful if you want to see a specific range of log (e.g.
    lines 0 - 100), rather than show all the lines and you need
    to scroll all the way to the first line to see the first 100 lines,
  - Etc...
- Ability to save output into logfile(s)
- Refactoring the code


## Screenshot(s)

![v0.1.1 screenshot](https://raw.githubusercontent.com/kirbo/rust-server-cli-rcon/master/screenshots/v0.1.1_1.png)
![v0.1.0 screenshot](https://raw.githubusercontent.com/kirbo/rust-server-cli-rcon/master/screenshots/v0.1.0_1.png)
