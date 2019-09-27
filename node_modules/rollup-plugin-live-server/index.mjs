import server from 'live-server';

function liveServer(options = {}) {
  const directories = options.directories || [];
  const params = {
  file: options.file || 'index.html',
  host: options.host || '0.0.0.0',
  logLevel: options.logLevel || 2,
  open: options.open || false,
  port: options.port ||8080,
  root: options.root || '.',
  wait: options.wait || 200,
};
if (options.mount) params.mount = options.mount;
if (options.ignore) params.ignore = options.ignore;
if (options.middleware) params.middleware = options.middleware;
if (options.cert) params.cert = options.cert;
if (options.key) params.key = options.key;
if (options.passphrase) params.passphrase = options.passphrase;

server.start(params);
  return {
    name: 'liveServer',
    generateBundle() {
      console.log(`live-server running on ${params.port}`);
    }
  };
}

export default liveServer;
