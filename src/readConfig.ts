import * as fs from 'fs';
import { Spec } from './schema';

export interface ConfigFile {
  swaggers: ServerConfig[];
  output: string;
}

export interface ServerConfig {
  name: string;
  file: string;
  url: string;
  overrides?: Partial<Spec>;
}

export async function readConfig(configFilename: string) {
  return new Promise<ConfigFile>((resolve, reject) => {
    fs.readFile(configFilename, { encoding: 'utf-8' }, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(JSON.parse(data));
    });
  });
}
