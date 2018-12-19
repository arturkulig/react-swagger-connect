import { Spec, Method, Parameter } from './schema';
import { getOperationName } from './getOperationName';
import { capitalize } from './capitalize';
import { getOperationTypes } from './getOperationTypes';
import { getParameters } from './getParameters';
import { getRequestMIMEType } from './getMIMEType';

export function getOperationExecutorFunction(
  swagger: Spec,
  dir: string,
  method: Method,
) {
  const operation = swagger.paths[dir][method];
  if (!operation) {
    throw new Error('createFetcher: operation is empty');
  }
  const parameters = getParameters(swagger, dir, method);

  const opName = getOperationName(operation);
  const OpName = capitalize(opName);
  const reqName = `${OpName}Request`;
  const hasQueryParams =
    parameters.filter(param => param.in === 'query').length > 0;

  return [
    ...getOperationTypes(swagger, dir, method),

    `

    export const ${opName} = Object.assign(${opName}Executor, { debug: false });

    ${(operation.description || '')
      .split('\n')
      .filter(l => !!l)
      .map(l => `// ${l}`)
      .join('\n')}
    function ${opName}Executor(
      request: ${reqName},
      userInit?:
        { 
          [id in Exclude<keyof RequestInit, 'headers'>]?:
            Exclude<RequestInit[id], undefined>
        } &
        { headers?: string[][] }
    ): Promise<${OpName}Responses> {

      ${createFetcherPath(swagger, dir, method, parameters)}

      ${createFetcherQuery(swagger, dir, method, parameters)}

      ${createFetcherHeaders(swagger, dir, method, parameters)}

      ${createFetcherBody(swagger, dir, method, parameters)}

      const urlWithQuery = ${
        hasQueryParams ? `url + '?' + query.join('&')` : 'url'
      };

      const init = Object.assign({
        method: '${method}',
        body,
        headers,
        credentials: 'include' as 'include'
      }, body === undefined ? {} : { body });

      const allInit =
        userInit
          ? Object.assign(
            init,
            userInit, 
            (init.headers && init.headers.length) ||
            (userInit.headers && userInit.headers.length)
              ? {
                headers: [
                  ...(init.headers||[]),
                  ...(userInit.headers||[]),
                ]
              }
              : {}
            )
          : init;

      ${opName}.debug && console.log(
        [
          '🌍 ${opName}',
          ['HTTP', allInit.method.toUpperCase(), urlWithQuery].join(' '),
          ...(allInit.headers || new Array<[string,string]>()).map(
            ([header, value]) => ['\t', header,':',value].join(' ')
          ),
        ].map(l => l + '\\n').join(''),
        allInit.body === undefined ? "[No body]" : allInit.body
      );

      return fetch(urlWithQuery, allInit).then(result => {
        return result.text().then(text => {
          try {
            const json = JSON.parse(text);

            ${opName}.debug && console.log([
              '🌍 ${opName}',
              ['HTTP', result.status, urlWithQuery].join(' '),
              ...Array.from(result.headers.entries() || new Array<[string,string]>()).map(
                ([header, value]) => ['\t', header,':',value].join(' ')
              ),
            ].map(l => l + '\\n').join(''),
            json);

            return {
              status: result.status, text, json
            } as ${OpName}Responses;

          } catch (e) {
            ${opName}.debug && console.log([
              '🌍 ${opName}',
              ['HTTP', result.status, urlWithQuery].join(' '),
              ...Array.from(result.headers.entries() || new Array<[string,string]>()).map(
                ([header, value]) => ['\t', header,':',value].join(' ')
              ),
              text,
            ].map(l => l + '\\n').join(''));
            
            return { status: result.status, text } as ${OpName}Responses;
          }
        });
      });
    }`,
  ];
}

function createFetcherPath(
  swagger: Spec,
  dir: string,
  method: Method,
  parameters: Parameter[],
) {
  const operation = swagger.paths[dir][method];
  if (!operation) {
    throw new Error('createFetcherPath: operation is empty');
  }
  const pathParameters = parameters.filter(param => param.in === 'path');
  const host = swagger.host ? `https://${swagger.host}` : '';
  const basePath = swagger.basePath
    ? dir[0] === '/' && (swagger.basePath === '/' || swagger.basePath === './')
      ? ''
      : swagger.basePath
    : '';
  return pathParameters.length
    ? [
        `
        let url = '${host}${basePath}${dir}';`,
        ...pathParameters.map(
          ({ name, required }) =>
            required
              ? `
                url = url.replace(
                  '{${name}}',
                  request['${name}'].toString()
                );`
              : `
                if (request['${name}'] != null) {
                  url = url.replace(
                    '{${name}}',
                    request['${name}'].toString()
                  );
                }`,
        ),
      ].join('')
    : `const url = '${host}${basePath}${dir}';`;
}

function createFetcherQuery(
  swagger: Spec,
  dir: string,
  method: Method,
  parameters: Parameter[],
): string {
  const operation = swagger.paths[dir][method];
  if (!operation) {
    throw new Error('createFetcherQuery: operation is empty');
  }
  const queryParameters = parameters.filter(param => param.in === 'query');
  return queryParameters.length
    ? [
        `
        const query = new Array<string>();`,
        ...queryParameters.map(
          param =>
            'type' in param && param.type === 'array'
              ? `
              if (request['${param.name}'] != null) {
                (request['${param.name}']!).forEach(v =>
                  query.push(
                    '${param.name}=' + encodeURIComponent(String(v))
                  )
                );
              }`
              : `
              if (request['${param.name}'] != null) {
                query.push(
                  '${param.name}=' +
                  encodeURIComponent(String(request['${param.name}']))
                );
              }`,
        ),
      ].join('')
    : '';
}

function createFetcherHeaders(
  swagger: Spec,
  dir: string,
  method: Method,
  parameters: Parameter[],
): string {
  const operation = swagger.paths[dir][method];
  if (!operation) {
    throw new Error('createFetcherHeaders: operation is empty');
  }

  const headersParameters = parameters.filter(param => param.in === 'header');
  return `
    const headers = [] as string[][];
    ${headersParameters
      .map(
        ({ name, required }) =>
          required
            ? `
            headers.push(['${name}', request['${name}']]);`
            : `
            if (request['${name}'] != null) {
              headers.push(['${name}', request['${name}']]);
            }`,
      )
      .join('\r\n')}
    `;
}

function createFetcherBody(
  swagger: Spec,
  dir: string,
  method: Method,
  parameters: Parameter[],
): string {
  const operation = swagger.paths[dir][method];
  if (!operation) {
    throw new Error('createFetcherBody: operation is empty');
  }

  if (
    parameters.filter(param => param.in === 'formData').length === 0 &&
    parameters.filter(param => param.in === 'body').length === 0
  ) {
    return 'const body = undefined';
  }

  const consumes = getRequestMIMEType(operation);

  if (consumes.indexOf('multipart/form-data') >= 0) {
    return createFormDataBody(
      parameters.filter(param => param.in === 'formData'),
    );
  }

  if (consumes.indexOf('application/x-www-form-urlencoded') >= 0) {
    return createURLEncodedBody(
      parameters.filter(param => param.in === 'formData'),
    );
  }

  if (
    consumes.indexOf('application/json') >= 0 ||
    consumes.indexOf('application/json-patch+json') >= 0
  ) {
    return createJSONBody(parameters.filter(param => param.in === 'body'));
  }

  if (consumes.indexOf('text/plain') >= 0) {
    return createTextBody(parameters.filter(param => param.in === 'body'));
  }

  throw new Error(
    `${swagger.basePath} ${dir} ${method}\n\t⚠️ Unrecognized "${JSON.stringify(
      consumes,
    )}"`,
  );
}

function createFormDataBody(parameters: Parameter[]): string {
  return parameters.length > 0
    ? `
      const form = new FormData();
      let formFilled = false;
      ${parameters
        .map(
          formParam => `
            if (request['${formParam.name}']) {
              formFilled = true;
              form.append('${formParam.name}', request['${formParam.name}']!);
            }`,
        )
        .join('\n')}
      const body = formFilled
        ? (
          headers.push([ 'Content-Type', 'multipart/form-data' ]),
          form
        )
        : undefined;
      `
    : `
      const body = undefined;`;
}

function createURLEncodedBody(parameters: Parameter[]): string {
  return parameters.length > 0
    ? `
      const form = new URLSearchParams() as any as FormData // workaround TS defs;
      let formFilled = false;
      ${parameters
        .map(
          formParam => `
            if (request['${formParam.name}']) {
              formFilled = true;
              body.append('${formParam.name}', request['${formParam.name}']!);
            }`,
        )
        .join('\n')}
      const body = formFilled
        ? (
          headers.push([ 'Content-Type', 'application/x-www-form-urlencoded' ]),
          form
        )
        : undefined;
      `
    : `
      const body = undefined;`;
}

function createJSONBody(parameters: Parameter[]): string {
  return `
    headers.push([ 'Content-Type', 'application/json' ]);
    const body = JSON.stringify(request['${parameters[0].name}'])`;
}

function createTextBody(parameters: Parameter[]): string {
  return `
    headers.push([ 'Content-Type', 'text/plain' ]);
    const body = request['${parameters[0].name}']`;
}
