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
      //logfile for this server a blank entry '' will not log
      logfile: 'LogFile1',
      // rcon port
      port: '28016',
      // rcon password
      password: 'rcon-password'
    },
    autoCommands: [
      'ownerid 76561197964781654 "shroud" "owner"',
      'moderatorid 76561197961021014 "n0thing" "mod"',
      'say I\'m watching you'
    ],
    macros: {
      day: [ 'env.time 9', 'say Time set to day' ],
      night: [ 'env.time 23', 'say Time set to night' ]
    }
  },

  // another server block
  another: {
    server: {
      address: 'another.rust-server.com'
    },
    rcon: {
      logfile: '',
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
      logfile: '',
      port: '28016',
      password: 'yet another password'
    }
  }
};


module.exports = config;
