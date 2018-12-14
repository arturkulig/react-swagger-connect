import * as fs from 'fs';
import { Spec } from './schema';

export interface ConfigFile {
  swaggers: SwaggerFileDescriptor[];
  output: string;
}

export interface SwaggerFileDescriptor {
  name: string;
  file: string;
  remote: SwaggerRemoteFileDescriptor;
  overrides?: Partial<Spec>;
}

export interface SwaggerRemoteFileDescriptor {
  url: string;
  username?: string;
  password?: string;
}

export async function readConfig(configFilename: string): Promise<ConfigFile> {
  const content = await new Promise<string | Buffer>((resolve, reject) =>
    fs.readFile(configFilename, { encoding: 'utf-8' }, (err, data) => {
      if (!err) {
        resolve(data);
      } else {
        reject(err);
      }
    }),
  );
  const { swaggers, output } = JSON.parse(
    typeof content === 'string' ? content : '',
  );
  return {
    swaggers,
    output,
  };
}
