import { Operation } from './schema';

export function getRequestMIMEType(operation: Operation) {
  const { consumes: [consumes] = ['application/json'] } = operation;
  return consumes;
}

export function getResponseMIMEType(operation: Operation) {
  const { produces: [produces] = ['application/json'] } = operation;
  return produces;
}
