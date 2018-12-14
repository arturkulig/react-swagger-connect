# React Swagger 2 Connect

CLI tool powered by node.js that (fetches and/or) transforms swagger definition files that you can easily incorporate into your TypeScript+React application.

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

## transform

```
  npx rsc ./rsc.json
//^ this will run it including node_modules in PATH
//    ^ this is a name of the CLI tool
//        ^ this is the path to your config file
```

## incorporate

### Option 1.
Just a fetch method

```tsx
import { getPetById } from './test/output/getPetById';

async function shoutOutPet(id: number) {
  const response = await getPetById({
    petId: id
  });

  switch (response.status) {
    case 200: return alert(
      `Dog's name ${response.json ? response.json.name : ''}`
    );
    case 400: return alert('Fatal error!');
    case 404: return alert('Not found');
    default: return;
  }
}
```

### Option 2.
A fetcher component.

```tsx
import {
  FindPetsByStatus,
  FindPetsByStatusRenderPropArg
} from './test/output/findPetsByStatus';

function PetsBrowser(props: {}) {
  return (
    <FindPetsByStatus
      status={['available']}
    >
      {
        (ctrl: FindPetsByStatusRenderPropArg) => (
          <>
            <menu>
              <button
                onClick={() => { ctrl.refresh() }}
              >Refresh</button>
            </menu>
            <ul>
              {(() => {
                if (ctrl.loading) {
                  return <Spinner />
                }
                if (ctrl.response === null) {
                  return null;
                }
                switch (ctrl.response.status) {
                  case 200:
                    return (ctrl.response.json || [])
                      .map(pet => <li key={pet.id}>{pet.name}</li>);
                  
                  case 400:
                    return <Error />
                }
              })()}
            </ul>
          </>
        )
      }
    </FindPetsByStatus>
  )
}
```