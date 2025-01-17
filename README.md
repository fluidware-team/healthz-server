# healthz-server

Simple library with no dependencies to create a healthz server.

By default, the server will listen on `:8282` and will respond with a `200` status code on `/healthz` path.

## Usage

EMS

```javascript
import { HealthzServer } from '@fluidware-it/healthz-server';

HealthzServer.start().then((info) => {
  console.log('Server started on port', info.port);
});
```

CommonJS

```javascript
const { HealthzServer } = require('@fluidware-it/healthz-server');

HealthzServer.start().then((info) => {
  console.log('Server started on port', info.port);
});
```

## Options

if you want to change the default port, address or path you can pass an object with your desired configuration:

```javascript
import { HealthzServer } from '@fluidware-it/healthz-server';

HealthzServer.start({ port: 8080, address: '127.0.0.1', path: '/check' }).then((info) => {
  console.log('Server started on port', info.port);
});
```

