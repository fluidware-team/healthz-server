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

import * as assert from 'node:assert';
import { HealthzServer } from '../src/index';
import { setTimeout } from 'node:timers/promises';

const fetchOptions = { keepalive: false, headers: { connection: 'close' } };

describe('HealthServer', () => {
  afterEach(async () => {
    await HealthzServer.stop();
  });

  it('should start HealthServer only once', async () => {
    const addressInfo = await HealthzServer.start({ port: 0 });
    assert.ok(addressInfo);
    const d = await HealthzServer.start({ port: 0 });
    assert.equal(d, undefined);
  });

  it('should start HealthServer without check', async () => {
    const addressInfo = await HealthzServer.start({ port: 0 });
    assert.ok(addressInfo);
    const { port } = addressInfo;
    const f = await fetch(`http://localhost:${port}/healthz`, fetchOptions);
    assert.equal(f.status, 200);
    assert.equal(await f.text(), 'OK');
    const e = await fetch(`http://localhost:${port}/xxxx`);
    assert.equal(e.status, 404);
    assert.equal(await e.text(), 'Not Found');
  });

  it('should start HealthServer with check', async () => {
    let cbCalled = false;
    const addressInfo = await HealthzServer.start({ port: 0 }, () => {
      cbCalled = true;
    });
    assert.ok(addressInfo);
    const { port } = addressInfo;
    const f = await fetch(`http://localhost:${port}/healthz`, fetchOptions);
    assert.equal(f.status, 200);
    assert.equal(await f.text(), 'OK');
    assert.ok(cbCalled);
  });

  it('should start HealthServer with check Error', async () => {
    let cbCalled = false;
    const addressInfo = await HealthzServer.start({ port: 0 }, () => {
      cbCalled = true;
      throw new Error('Error');
    });
    assert.ok(addressInfo);
    const { port } = addressInfo;
    const f = await fetch(`http://localhost:${port}/healthz`, fetchOptions);
    assert.equal(f.status, 500);
    assert.equal(await f.text(), 'KO');
    assert.ok(cbCalled);
  });

  it('should start HealthServer with check (promise)', async () => {
    let checkCalled = false;
    const addressInfo = await HealthzServer.start({ port: 0 }, async () => {
      await setTimeout(100);
      checkCalled = true;
    });
    assert.ok(addressInfo);
    const { port } = addressInfo;
    const f = await fetch(`http://localhost:${port}/healthz`, fetchOptions);
    assert.equal(f.status, 200);
    assert.equal(await f.text(), 'OK');
    assert.ok(checkCalled);
  });

  it('should start HealthServer with check Error (promise)', async () => {
    let checkCalled = false;
    const addressInfo = await HealthzServer.start({ port: 0 }, async () => {
      await setTimeout(100);
      checkCalled = true;
      throw new Error('Error');
    });
    assert.ok(addressInfo);
    const { port } = addressInfo;
    const f = await fetch(`http://localhost:${port}/healthz`, fetchOptions);
    assert.equal(f.status, 500);
    assert.equal(await f.text(), 'KO');
    assert.ok(checkCalled);
  });

  it('should start HealthServer with options', async () => {
    const addressInfo = await HealthzServer.start({ port: 0, path: '/healthz2' });
    assert.ok(addressInfo);
    const { port } = addressInfo;
    const f = await fetch(`http://localhost:${port}/healthz2`, fetchOptions);
    assert.equal(f.status, 200);
    assert.equal(await f.text(), 'OK');
    const e = await fetch(`http://localhost:${port}/healthz`);
    assert.equal(e.status, 404);
    assert.equal(await e.text(), 'Not Found');
  });
});
