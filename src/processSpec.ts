import { Signale } from 'signale';
import { Spec, Path } from './schema';
import { getOperationName } from './getOperationName';
import { getOperationExecutorFunction } from './getOperationExecutorFunction';
import { getOperationExecutorComponent } from './getOperationExecutorComponent';

export  function* processSpec(swagger: Spec, signale: Signale) {
  signale.scope(swagger.basePath).start();

  for (const dir of Object.keys(swagger.paths)) {
    signale.scope(swagger.basePath, dir).start();
    for (const method of Object.keys(swagger.paths[dir]) as Array<keyof Path>) {
      try {
        if (
          method === 'get' ||
          method === 'put' ||
          method === 'post' ||
          method === 'delete' ||
          method === 'head' ||
          method === 'options'
        ) {
          const operation = swagger.paths[dir][method];
          if (!operation) {
            signale
              .scope(swagger.basePath, dir, method)
              .warn('is not an operation');
            return;
          }
          const opName = getOperationName(operation);

          const fetcher = getOperationExecutorFunction(swagger, dir, method);
          const component = getOperationExecutorComponent(swagger, dir, method);

          const file = ['// tslint:disable', ...fetcher, ...component]
            .map(l => (/^\s*$/.test(l) ? '' : l))
            .join('\n\n');

          yield {
            opName,
            file,
          };

          signale.scope(swagger.basePath, dir, method).complete(opName);
        }
      } catch (e) {
        signale.scope(swagger.basePath, dir, method).fatal(e);
        process.exitCode = 1;
      }
    }
  }

  signale.scope(swagger.basePath).complete(``);
}
