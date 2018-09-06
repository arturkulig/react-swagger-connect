import { Operation } from './schema';

export function getOperationName(operation: Operation) {
  const { operationId = '' } = operation;
  const [, opName] = /(.*?)Using([A-Z]+)/.exec(operationId) || [
    null,
    operationId,
  ];
  return opName!;
}
