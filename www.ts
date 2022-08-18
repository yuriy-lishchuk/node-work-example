#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

var app = require('./app');
var debug = require('debug')('server:server');
var http = require('http');

/**
 * Startup tasks
 */

// Google Cloud - Write Service Account Key File - Uploader
console.log(`Startup Task >> Google Cloud - Write Service Account Key File - Uploader ...`);
fs.writeFileSync(path.join(__dirname, 'routes', 'google_cloud_sa_uploader_keys.json'), process.env.GOOGLE_CLOUD_SA_UPLOADER_CREDS);
console.log("...DONE\n");
console.log(`Startup Task >> Google Cloud - Write Service Account Key File - Downloader ...`);
fs.writeFileSync(path.join(__dirname, 'routes', 'google_cloud_sa_downloader_keys.json'), process.env.GOOGLE_CLOUD_SA_DOWNLOADER_CREDS);
console.log("...DONE\n");

/**
 * Get port from environment and store in Express.
 */

const args = process.argv.slice(2);
let argPort;
if (args.length > 0 && !isNaN(args[0] as any)) {
  argPort = args[0]; 
}
var port = normalizePort(argPort || process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
