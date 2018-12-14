import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as https from 'https';
import { Spec } from './schema';
import {
  SwaggerFileDescriptor,
  SwaggerRemoteFileDescriptor,
} from './readConfig';
import { Signale } from 'signale';

type Result<T> = { ok: false } | { ok: true; value: T };

export async function* getSwaggerFiles(
  configs: Iterable<SwaggerFileDescriptor>,
  baseDirname: string,
  signale: Signale,
) {
  for (const config of configs) {
    const localFileName = path.resolve(baseDirname, config.file);
    const localFileOp = await loadFile(localFileName);
    const remoteFileOp = localFileOp.ok
      ? localFileOp
      : await fetchFile(config.remote);
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
      if (!localFileOp.ok) {
        signale.scope(config.name).fatal(`local file is not available`);
      }
      if (!remoteFileOp.ok) {
        signale.scope(config.name).fatal(`remote file is not available`);
      }
      process.exitCode = 1;
      continue;
    }

    let parsed: object;

    try {
      parsed = JSON.parse(fileContent);
    } catch {
      signale
        .scope(config.name)
        .fatal(`file @ ${config.remote.url} is not a JSON file`);
      process.exitCode = 1;
      continue;
    }

    if (!isSpec(parsed)) {
      signale
        .scope(config.name)
        .fatal(`file @ ${config.remote.url} is not a swagger file`);
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

function fetchFile(remote: SwaggerRemoteFileDescriptor) {
  return new Promise<Result<string>>((resolve, reject) => {
    const target = new URL(remote.url);
    const grab = (
      options: {
        protocol?: string;
        host?: string;
        port?: number | string;
        method?: string;
        path?: string;
        headers?: http.OutgoingHttpHeaders;
      },
      callback?: (res: http.IncomingMessage) => void,
    ) => {
      return target.protocol === 'https:'
        ? https.get(options, callback)
        : http.get(options, callback);
    };
    const cr = grab(
      {
        protocol: target.protocol,
        host: target.host,
        // port: target.port || (target.host === 'https:' ? 443 : 80),
        method: 'GET',
        path: target.pathname + target.search,
        headers: remote.username
          ? {
              Authorization: [
                'Basic',
                Buffer.from(
                  [remote.username, remote.password].join(':'),
                ).toString('base64'),
              ].join(' '),
            }
          : {},
      },
      res => {
        let result = '';
        res.on('data', chunk => {
          result += chunk;
        });
        res.on('end', () => {
          resolve({ ok: true, value: result });
        });
      },
    );
    cr.on('error', err => {
      console.error({ err });
      resolve({ ok: false });
    });
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
