/*
 * Copyright Fluidware srl
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { createServer, Server } from 'http';
import { AddressInfo, checkFunction, HealthzServerOptions } from './types';

const healthServerSymbol = Symbol.for('Fw.HealthzServer');

type FWGlobal = {
  [healthServerSymbol]?: Server;
};

const _global = global as unknown as FWGlobal;

const defaultOptions: HealthzServerOptions = {
  path: '/healthz',
  address: '0.0.0.0',
  port: 8282
};

export class HealthzServer {
  static async start(
    opts?: HealthzServerOptions | checkFunction,
    healthCheck?: checkFunction
  ): Promise<AddressInfo | null> {
    if (typeof opts === 'function') {
      healthCheck = opts;
      opts = {};
    }
    if (healthCheck) {
      if (typeof healthCheck !== 'function') {
        throw new Error('healthCheck must be a function');
      }
    }
    const { path: PATH, address: ADDRESS, port: PORT } = Object.assign({}, defaultOptions, opts);
    if (_global[healthServerSymbol]) {
      return Promise.resolve(null);
    }
    _global[healthServerSymbol] = createServer((req, res) => {
      if (req.url === PATH) {
        if (!healthCheck) {
          res.end('OK');
          return;
        }
        try {
          const check = healthCheck();
          if (check instanceof Promise) {
            check
              .then(() => {
                res.end('OK');
              })
              .catch(e => {
                res.writeHead(500, { 'x-error': e.message });
                res.end('KO');
              });
          } else {
            res.end('OK');
          }
        } catch (e) {
          res.writeHead(500, { 'x-error': e.message });
          res.end('KO');
        }
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });
    process.once('SIGTERM', HealthzServer.stop);
    process.once('SIGINT', HealthzServer.stop);
    return new Promise((resolve, reject) => {
      _global[healthServerSymbol]!.on('error', e => {
        reject(e);
      });
      const opts = {
        address: ADDRESS,
        port: PORT
      };
      _global[healthServerSymbol]!.listen(opts, () => {
        const addr = _global[healthServerSymbol]!.address() as AddressInfo;
        resolve(addr);
      });
    });
  }

  static async stop() {
    process.off('SIGTERM', HealthzServer.stop);
    process.off('SIGINT', HealthzServer.stop);
    return new Promise(resolve => {
      if (_global[healthServerSymbol]) {
        _global[healthServerSymbol].close(() => {
          delete _global[healthServerSymbol];
          resolve(true);
        });
      } else {
        resolve(true);
      }
    });
  }
}
