import { SchemaDict } from './schema';
import { swaggerSchemaToTypeScript } from './swaggerSchemaToTypeScript';

export function swaggerSchemaDictToTypeScript(dict: SchemaDict): string[] {
  const tsDefs = [] as string[];

  for (const typeName of Object.keys(dict)) {
    const def = swaggerSchemaToTypeScript(dict[typeName], typeName);

    const symbol =
      def[0] === '{' ? `interface ${typeName} ` : `type ${typeName} = `;

    tsDefs.push(`export ${symbol} ${def}`);
  }

  return tsDefs;
}
