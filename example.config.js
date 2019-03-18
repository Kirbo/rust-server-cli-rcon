var config = {
    // name of this server block, used when using "server" argument
    localhost: {
        // configurations for server
        server: {
            // hostname or ip address
            address: 'localhost'
        },
        // configurations for rcon
        rcon: {
            // rcon port
            port: '28016',
            // rcon password
            password: 'your password'
        }
    },

    // another server block
    another: {
        server: {
            address: 'another.rust-server.com'
        },
        rcon: {
            port: '28016',
            password: 'another password'
        }
    },

    // yet another server block
    someOther: {
        server: {
            address: '1.2.3.4'
        },
        rcon: {
            port: '28016',
            password: 'yet another password'
        }
    },
};


module.exports = config;
