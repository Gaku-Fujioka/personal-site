import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareJournal } from './prepare-journal.mjs';

export default function journalIntegration() {
  let root;
  return {
    name: 'published-journal',
    hooks: {
      'astro:config:setup': async ({ config, command, logger }) => {
        root = config.root;
        const count = await prepareJournal();
        logger.info(`公開記事 ${count}件を準備しました。`);
      },
      'astro:server:setup': ({ server, logger }) => {
        const input = process.env.JOURNAL_LOCAL_DIR ? path.resolve(fileURLToPath(root), process.env.JOURNAL_LOCAL_DIR) : fileURLToPath(new URL('.journal/source/', root));
        server.watcher.add(input);
        let timer;
        server.watcher.on('all', (_event, file) => {
          if (!file.startsWith(input + path.sep) || process.env.JOURNAL_SOURCE !== 'local') return;
          clearTimeout(timer);
          timer = setTimeout(() => prepareJournal().then(() => server.ws.send({ type: 'full-reload' })).catch(error => logger.error(error.message)), 200);
        });
      },
    },
  };
}
