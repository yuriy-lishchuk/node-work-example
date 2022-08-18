# Multiple Nodes with Forever
To help balance backend load as a way to alleviate event loop delay issues, multiple nodes can be run in parallel with nginx as a load balancer.

## Forever Configs
Instead of directly launching a node application, forever can be given a json config file that allows you to define multiple node apps and different arguments. Each application can receive a name, file to launch, and arguments. Below is an example 
```json
[
  {
    "uid": "backend-#", // application name
    "append": true, // adds logs to existing files instead of replacing
    "script": "dist/www.js", // js entry file
    "sourceDir": "/root/virtual-conferences/backend", // directory to run from
    "args": ["30##"] // arguments that can be sent into running app
  },
  { ... }
]
```
This config can be used by running `forever start <config-name>`, which will create a process for each app in the config. They can then be closed by running `forever stopall` (Note: this stops _all_ running processes, not just the config's).

## NodeJS Args
In order to pass the port to use for each app through forever's config, the node app will need to be able to read from the arguments. With the currently set up forever config, the port is the second arguments in `process.argv` (The first argument is always the entry js file). If the port argument is present, then use that as the port, otherwise fall back to the existing methods.
```js
// in www.ts
const args = process.argv.slice(2);
let argPort;
if (args.length > 0) {
  argPort = args[0]; 
}
var port = normalizePort(argPort || process.env.PORT || '3000');
app.set('port', port);
```

## Nginx Upstream
Nginx can be specified to balance requests between several different endpoints by specifying an upstream with those endpoints; This upstream can then be used in the proxy_pass. By default the upstream operates in a round-robin fashion, but can be switched to balance based off least connections.
```nginx
upstream backend {
  least_conn;
  server localhost:3000;
  server localhost:3001;
  server localhost:3002;
  # repeat for each node
}

server {
  location /api/ {
    proxy_pass http://backend;
  }
}
```