import { Schema } from './schema';

export function swaggerSchemaToTypeScript(def: Schema, dir: string): string {
  if ('$ref' in def && typeof def.$ref === 'string') {
    const [, name = null] = /#\/definitions\/([^/]+)/.exec(def.$ref) || [];
    if (name) {
      return `_${name}`;
    }
    throw new Error(`${def.$ref} is unrecognized reference`);
  }
  if ('type' in def) {
    if (def.enum instanceof Array) {
      return def.enum.map(v => JSON.stringify(v)).join(' | ');
    }
    if (def.type === 'boolean') {
      return 'boolean';
    }
    if (def.type === 'number' || def.type === 'integer') {
      return 'number';
    }
    if (def.type === 'string') {
      return 'string';
    }
    if (def.type === 'array') {
      const { items } = def;
      if (!items) {
        return 'any[]';
      }
      if (items instanceof Array) {
        return `Array<
          ${items
            .map((item, i) => swaggerSchemaToTypeScript(item, `${dir}[${i}]`))
            .map(type => (items.length > 1 ? `| ${type}` : type))}
          >`;
      }
      return `Array<${swaggerSchemaToTypeScript(items, `${dir}[]`)}
        >`;
    }
    if (def.type === 'object') {
      const { properties, required } = def;
      if (!properties) {
        return 'any';
      }
      return `{
          ${Object.keys(properties)
            .map(p => {
              const isRequired = required && required.indexOf(p) >= 0;
              return `'${p}'${
                isRequired ? '' : '?'
              }: ${swaggerSchemaToTypeScript(properties[p], `${dir}.${p}`)},`;
            })
            .join('\n')}
        }`;
    }
    if (def.type === 'file') {
      return 'Blob';
    }
  }
  return 'void';
}
