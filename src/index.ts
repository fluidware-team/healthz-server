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

import { createServer, Server, ServerResponse } from 'http';
import { AddressInfo, healthCheckFunction, HealthzServerOptions, readinessCheckFunction } from './types';

const healthServerSymbol = Symbol.for('Fw.HealthzServer');

type FWGlobal = {
  [healthServerSymbol]?: Server;
};

const _global = global as unknown as FWGlobal;

const defaultOptions: HealthzServerOptions = {
  healthzPath: '/healthz',
  readinessPath: '/',
  address: '0.0.0.0',
  port: 8282
};

export class HealthzServer {
  private static ready = false;

  private static _healthCheck(res: ServerResponse, healthCheck?: healthCheckFunction): void {
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
  }

  private static _readinessCheck(res: ServerResponse, readinessCheck?: readinessCheckFunction): void {
    function reply(ready: boolean) {
      if (ready) {
        res.end('OK');
      } else {
        res.writeHead(503, { 'x-error': 'Not ready' });
        res.end('KO');
      }
    }
    if (!readinessCheck) {
      reply(HealthzServer.ready);
      return;
    }
    try {
      const check = readinessCheck();
      if (check instanceof Promise) {
        check
          .then(ready => {
            reply(ready);
          })
          .catch(e => {
            res.writeHead(500, { 'x-error': e.message });
            res.end('KO');
          });
      } else {
        reply(check);
      }
    } catch (e) {
      res.writeHead(500, { 'x-error': e.message });
      res.end('KO');
    }
  }

  static async start(
    opts?: HealthzServerOptions,
    healthCheck?: healthCheckFunction,
    readinessCheck?: readinessCheckFunction
  ): Promise<AddressInfo | null> {
    if (healthCheck) {
      if (typeof healthCheck !== 'function') {
        throw new Error('healthCheck must be a function');
      }
    }
    if (readinessCheck) {
      if (typeof readinessCheck !== 'function') {
        throw new Error('readinessCheck must be a function');
      }
    }
    // remove all undefined values from opts, so we can use default values
    if (opts) {
      Object.keys(opts).forEach(key => {
        if (key in opts && opts[key as keyof HealthzServerOptions] === undefined) {
          delete opts[key as keyof HealthzServerOptions];
        }
      });
    }
    const {
      path: OLD_PATH,
      healthzPath,
      readinessPath,
      address: ADDRESS,
      port: PORT
    } = Object.assign({}, defaultOptions, opts);
    const HEALTHZ_PATH = OLD_PATH ?? healthzPath;
    if (_global[healthServerSymbol]) {
      return Promise.resolve(null);
    }
    _global[healthServerSymbol] = createServer((req, res) => {
      if (req.url === HEALTHZ_PATH) {
        HealthzServer._healthCheck(res, healthCheck);
      } else if (req.url === readinessPath) {
        HealthzServer._readinessCheck(res, readinessCheck);
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

  static setReady(ready: boolean) {
    HealthzServer.ready = ready;
    if (ready) {
      process.once('SIGUSR1', HealthzServer.unready);
    } else {
      process.off('SIGUSR1', HealthzServer.unready);
    }
  }

  static async stop() {
    process.off('SIGTERM', HealthzServer.stop);
    process.off('SIGINT', HealthzServer.stop);
    if (HealthzServer.ready) {
      process.off('SIGUSR1', HealthzServer.unready);
    }
    HealthzServer.ready = false;
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

  private static unready() {
    HealthzServer.ready = false;
  }
}
