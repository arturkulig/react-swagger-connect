import { Spec, Method } from './schema';
import { getOperationName } from './getOperationName';
import { getParameters } from './getParameters';
import { capitalize } from './capitalize';

export function getOperationExecutorComponent(
  swagger: Spec,
  dir: string,
  method: Method,
): string[] {
  const operation = swagger.paths[dir][method];
  if (!operation) {
    throw new Error('createFetcherComponent: operation is empty');
  }
  const opName = getOperationName(operation);

  const componentName = capitalize(opName);
  const propsName = `${componentName}Props`;
  const stateName = `${componentName}State`;
  const requestName = `${componentName}Request`;
  const responsesName = `${componentName}Responses`;
  const renderPropArgName = `${componentName}RenderPropArg`;

  return [
    `import * as React from 'react'`,

    `export interface ${propsName} extends ${requestName} {
      children?: (result: ${renderPropArgName}) => React.ReactNode
    }`,

    `export interface ${stateName} {
      result: ${responsesName} | null
      loading: object | null
    }`,

    `export interface ${renderPropArgName} {
      result: ${responsesName} | null
      loading: boolean
      refresh: () => void
    }`,

    `export class ${componentName} extends React.PureComponent<
      ${propsName},
      ${stateName}
    > {
      state = { result: null, loading: null }
      dead = false
      
      componentDidMount() { this.fetch() }
      
      componentDidUpdate(prevProps: ${propsName}) { this.props !== prevProps && this.fetch() }
      
      componentWillUnmount() { this.dead = true }
      
      fetch = () => {
        const downloadToken = {}
        this.setState({ loading: downloadToken }, () => {
          const request = {
          ${getParameters(swagger, dir, method)
            .map(({ name }) => `'${name}': this.props['${name}'],`)
            .join('\r\n')}
          };
          ${opName}(request).then(result => {
            if (this.dead) { return }
            if (this.state.loading === downloadToken) { this.setState({ result, loading: null }) }
          }, e => console.error(e));
        })
      }
      
      render() {
        const { children } = this.props
        const { result, loading } = this.state
        if (!children) { return null }
        if (typeof children === 'function') {
          return children({ result, loading: loading != null, refresh: this.fetch })
        }
        return children
      }
    }`,
  ];
}
