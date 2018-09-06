import * as swaggerOfficial from 'swagger-schema-official';
export * from 'swagger-schema-official';

type HTTPMethodFilter<
  T extends keyof swaggerOfficial.Path
> = T extends 'parameters' ? never : T extends '$ref' ? never : T;
type Method = HTTPMethodFilter<keyof swaggerOfficial.Path>;

type SchemaDict = { [id: string]: swaggerOfficial.Schema };

export { HTTPMethodFilter, Method, SchemaDict };
