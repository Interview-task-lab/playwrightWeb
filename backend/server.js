/**
 * Backend Entry Point
 *
 * Only responsibility: start the HTTP server and initialize the database.
 * All application setup is delegated to src/app.js.
 */

const app = require('./src/app');
const { initDatabase } = require('./src/config/database');
const config = require('./src/config/app.config');

const PORT = config.server.port;

app.listen(PORT, async () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║       🎭 Playwright Codegen Studio — Backend        ║');
  console.log('║       API running on http://localhost:' + PORT + '          ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  await initDatabase();
});
