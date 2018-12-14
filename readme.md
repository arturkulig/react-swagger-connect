# React Swagger 2 Connect

CLI tool powered by node.js that (fetches and/or) transforms swagger definition files that you can easily incorporate into your React application.

## install

```
npm i react-swagger-connect
```

## configure

Config file is a json file that is expressed with this interface - `ConfigFile`.

```typescript
interface ConfigFile {
  // path relative to the config file
  output: string;
  swaggers: SwaggerFileDescriptor[];
}

interface SwaggerFileDescriptor {
  // your custom name (will be visible in logs)
  name: string;
  // swagger definition file path relative to config file
  file: string;
  // swagger definition remote location information
  remote: SwaggerRemoteFileDescriptor;
  // Object here will override (overshadow)
  // contents of the swagger definition file
  overrides?: Partial<Spec>;
}

interface SwaggerRemoteFileDescriptor {
  url: string;
  username?: string;
  password?: string;
}
```

## run

```
  npx rsc ./rsc.json
//^ this will run it including node_modules in PATH
//    ^ this is a name of the CLI tool
//        ^ this is the path to your config file
```