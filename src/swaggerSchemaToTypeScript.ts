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
    if (def.type === 'boolean') {
      return 'boolean';
    }
    if (def.type === 'number' || def.type === 'integer') {
      // if (def.enum instanceof Array) {
      //   return def.enum
      //     .map(v => {
      //       if (typeof v === 'string') {
      //         return parseFloat(v).toString();
      //       }
      //       if (typeof v === 'number') {
      //         return v.toString();
      //       }
      //       return null;
      //     })
      //     .filter(<T>(item: T | null | undefined): item is T => item != null)
      //     .join(' | ');
      // }
      return 'number';
    }
    if (def.type === 'string') {
      if (def.enum instanceof Array) {
        return def.enum
          .map(v => {
            if (typeof v === 'string') {
              return JSON.stringify(v);
            }
            if (typeof v === 'number') {
              return JSON.stringify(v.toString());
            }
            return null;
          })
          .filter(<T>(item: T | null | undefined): item is T => item != null)
          .join(' | ');
      }
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
