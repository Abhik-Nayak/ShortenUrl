import { app } from './app.js';
import { env } from './config/env.js';
import { store } from './db/jsonStore.js';

await store.load();

app.listen(env.port, () => {
  console.log(`API listening on http://localhost:${env.port}`);
  console.log(`Storage:  ${env.dataFile}`);
});
