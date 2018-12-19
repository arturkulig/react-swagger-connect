import { Operation } from './schema';
import { decapitalize } from './decapitalize';

export function getOperationName(operation: Operation) {
  const { operationId = '' } = operation;
  const [, opName, , postFix = ''] = /(.*?)Using([A-Z]+)(.*?)$/.exec(
    operationId,
  ) || [null, operationId];
  return decapitalize(`${opName}${postFix}`);
}
