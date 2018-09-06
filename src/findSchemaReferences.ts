import { Schema } from './schema';
import { flatten } from './flatten';

export function findSchemaReferences(
  def: Schema | { schema: Schema },
  path: string[],
): string[] {
  try {
    if ('type' in def) {
      if (def.type === 'object') {
        if (!('properties' in def) || !def.properties) {
          return [];
        }
        const { properties } = def;
        return properties
          ? flatten(
              Object.keys(properties).map(p =>
                findSchemaReferences(properties[p], path.concat(`.${p}`)),
              ),
            )
          : [];
      }
      if (def.type === 'array') {
        return def.items
          ? def.items instanceof Array
            ? flatten(
                def.items.map((_, idx) =>
                  findSchemaReferences(_, path.concat(`[${idx.toString()}]`)),
                ),
              )
            : findSchemaReferences(def.items, path.concat('[]'))
          : [];
      }
    }
    if ('schema' in def && typeof def.schema === 'object') {
      return findSchemaReferences(def.schema, path.concat('[schema]'));
    }
    if ('$ref' in def && typeof def.$ref === 'string') {
      return [def.$ref];
    }
    return [];
  } catch (e) {
    throw {
      message: `Error retrieving references from:\r\n${path
        .map(l => `\t${l}`)
        .join('\r\n')}`,
    };
  }
}
