#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
// import * as ts from 'typescript';
import * as prettier from 'prettier';
import * as commander from 'commander';
import { Signale } from 'signale';
import { readConfig } from './readConfig';
import { getSwaggerFiles } from './getSwaggerFiles';
import { processSpec } from './processSpec';

const signale = new Signale({
  types: {
    correct: {
      badge: '✔️',
      color: 'green',
      label: 'correct',
    },
  },
});

commander
  .version(require('../package.json').version)
  .arguments('<file>')
  .action(async configFilename => {
    const configDirname: string = path.dirname(configFilename);
    const config = await readConfig(configFilename);

    try {
      process.umask(0);
      fs.mkdirSync(path.resolve(configDirname, config.output), 0o777);
    } catch (e) {
      null;
    }

    const swaggers = getSwaggerFiles(
      config.swaggers,
      configDirname,
      signale.scope('config'),
    );
    for await (const { name: specName, spec } of swaggers) {
      const outputDir = path.resolve(
        configDirname,
        config.output ? config.output : '',
      );
      const specSignale = signale.scope(specName);

      const files = processSpec(spec, specSignale);

      for (const { opName, file } of files) {
        saveEndpoint({ outputDir, specName, opName, file });
      }
    }
  });

commander.parse(process.argv);

async function saveEndpoint({ outputDir, specName, opName, file }) {
  const fileName = path.resolve(outputDir, `${opName}.tsx`);
  const fileSignale = signale.scope(specName, fileName);

  try {
    const prettierConfig = await prettier.resolveConfig(fileName);
    file = prettier.format(file, {
      parser: 'typescript',
      ...prettierConfig,
    });
  } catch (e) {
    fileSignale.error('Failed formatting');
    console.error(e.message);
    console.error('----------------------------------------');
    console.error(file);
    console.error('------------------EOF-------------------');
    process.exitCode = 1;
    return;
  }
  fileSignale.complete('formatted');

  await save(fileName, file, fileSignale);
  fileSignale.complete('stored');
}

let lastSave = Promise.resolve();

function save(name: string, contents: string, signale: Signale) {
  return (lastSave = lastSave.then(
    () =>
      new Promise<void>((resolve, reject) => {
        fs.writeFile(
          name,
          contents,
          {
            encoding: 'utf-8',
          },
          err => {
            if (err) {
              process.exitCode = 1;
              signale.fatal(`Unable to save ${name}`);
              reject();
            }
            resolve();
          },
        );
      }),
  ));
}
