import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import { Spec } from './schema';
import { ServerConfig } from './readConfig';
import { Signale } from 'signale';

type Result<T> = { ok: false } | { ok: true; value: T };

export async function* getSwaggerFiles(
  configs: Iterable<ServerConfig>,
  baseDirname: string,
  signale: Signale,
) {
  for (const config of configs) {
    const localFileName = path.resolve(baseDirname, config.file);
    const localFileOp = await loadFile(localFileName);
    const remoteFileOp = localFileOp.ok
      ? localFileOp
      : await fetchFile(config.url);
    const fileContent = localFileOp.ok
      ? localFileOp.value
      : remoteFileOp.ok
        ? remoteFileOp.value
        : null;

    if (remoteFileOp.ok) {
      const writeOp = await writeFile(localFileName, remoteFileOp.value);
      if (!writeOp.ok) {
        signale.scope(config.name).error(`swagger file couldn't be saved`);
      }
    }

    if (!fileContent) {
      signale.scope(config.name).fatal(`swagger file is not available`);
      process.exitCode = 1;
      continue;
    }

    let parsed: object;

    try {
      parsed = JSON.parse(fileContent);
    } catch {
      signale
        .scope(config.name)
        .fatal(`file @ ${config.url} is not a JSON file`);
      process.exitCode = 1;
      continue;
    }

    if (!isSpec(parsed)) {
      signale
        .scope(config.name)
        .fatal(`file @ ${config.url} is not a swagger file`);
      process.exitCode = 1;
      continue;
    }

    yield {
      ...config,
      spec: config.overrides ? Object.assign(parsed, config.overrides) : parsed,
    };
  }
}

function isSpec(subject): subject is Spec {
  return subject && typeof subject === 'object' && 'swagger' in subject;
}

function loadFile(filename: string) {
  return new Promise<Result<string>>((resolve, reject) => {
    fs.readFile(filename, { encoding: 'utf-8' }, (err, data) => {
      if (err) {
        resolve({ ok: false });
      }
      resolve({ ok: true, value: data });
    });
  });
}

function fetchFile(url: string) {
  return new Promise<Result<string>>((resolve, reject) => {
    const fetcher: { get: Function } =
      url.slice(0, 5) === 'https' ? https : http;
    if (fetcher.get == null || typeof fetcher.get !== 'function') {
      resolve({ ok: false });
      return;
    }
    fetcher
      .get(url, res => {
        let result = '';
        res.on('data', chunk => {
          result += chunk;
        });
        res.on('end', () => {
          resolve({ ok: true, value: result });
        });
      })
      .on('error', err => resolve({ ok: false }));
  });
}

function writeFile(filename: string, data: string): Promise<Result<null>> {
  return new Promise<Result<null>>((resolve, reject) =>
    fs.writeFile(filename, data, { encoding: 'utf-8' }, err => {
      if (err) {
        reject(err);
      }
      resolve({ ok: true, value: null });
    }),
  );
}
