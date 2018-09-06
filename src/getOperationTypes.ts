import { Spec, Schema, Method, SchemaDict } from './schema';
import { swaggerSchemaDictToTypeScript } from './swaggerSchemaDictToTypeScript';
import { capitalize } from './capitalize';
import { getOperationName } from './getOperationName';
import { getParameters } from './getParameters';
import { gatherSchemas } from './gatherSchemas';

export function getOperationTypes(
  swagger: Spec,
  dir: string,
  method: Method,
): string[] {
  const operation = swagger.paths[dir][method];
  if (!operation) {
    throw new Error('createTypes: operation is empty');
  }

  const parameters = getParameters(swagger, dir, method);
  const opName = getOperationName(operation);
  const OpName = capitalize(opName);

  const fetcherSchemas: SchemaDict = {};
  fetcherSchemas[`${OpName}Request`] = {
    type: 'object',
    required: parameters.filter(p => p.required).map(p => p.name),
    properties: parameters.reduce(
      (properties, parameter) => ({
        ...properties,
        [parameter.name]: `schema` in parameter ? parameter.schema : parameter,
      }),
      {} as Schema['properties'],
    ),
  };

  const { responses = {} } = operation;
  const responsesList = responses
    ? Object.keys(responses).map(kind => {
        const responseCode = parseInt(kind, 10);
        const codeType = isNaN(responseCode) ? 'any' : responseCode.toString();
        const { schema = { type: 'object' }, description } = responses[kind];
        return {
          kind,
          codeType,
          schema,
          description,
        };
      })
    : [];

  responsesList.forEach(response => {
    if (!response.schema) {
      return;
    }
    fetcherSchemas[capitalize(`${opName}${response.kind}ResponseContent`)] =
      response.schema;
  });

  const definitions = gatherSchemas(swagger, fetcherSchemas);

  return [
    ...swaggerSchemaDictToTypeScript(definitions),

    ...responsesList.map(response => {
      return `${
        response.description
          ? `// ${response.description}
`
          : ''
      }export interface ${OpName}${response.kind}Response {
        status: ${response.codeType},
        text: string,
        json?: ${OpName}${response.kind}ResponseContent
      }`;
    }),

    `export type ${OpName}Responses = ${responsesList
      .map(({ kind }) => `${OpName}${kind}Response`)
      .join(' | ')}`,
  ];
}
