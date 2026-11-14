import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { summarizeHar } from './analyze-supabase-har.mjs';

const require = createRequire(import.meta.url);
function loadTs(file, stubs = {}, modules = new Map()) {
  const absolute = resolve(file);
  if (modules.has(absolute)) return modules.get(absolute).exports;
  const module = { exports: {} };
  modules.set(absolute, module);
  const source = ts.transpileModule(readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const load = (name) => name in stubs ? stubs[name] : name.startsWith('@/')
    ? loadTs(`src/${name.slice(2)}.ts`, stubs, modules) : require(name);
  new Function('require', 'module', 'exports', source)(load, module, module.exports);
  return module.exports;
}

const { SignedUrlCache } = loadTs('src/lib/signed-url-cache.ts');
const { createRefreshQueue } = loadTs('src/lib/refresh-queue.ts');
const { createAcademyDataLoader } = loadTs('src/lib/academy-data-loader.ts');
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

test('private URLs: concurrent opens reuse one signature and renew before expiry', async () => {
  let now = 1000;
  let calls = 0;
  const cache = new SignedUrlCache(() => now);
  const sign = async () => `private-url-${++calls}`;
  const open = () => cache.get('academy-media', 'file.pdf', 600, sign);
  assert.deepEqual(await Promise.all([open(), open(), open()]), Array(3).fill('private-url-1'));
  now += 569_999;
  assert.equal(await open(), 'private-url-1');
  now += 1;
  assert.equal(await open(), 'private-url-2');
  cache.clear();
  assert.equal(await open(), 'private-url-3');
});

test('private URLs: account instances, buckets and replacement paths remain separate', async () => {
  const first = new SignedUrlCache();
  const second = new SignedUrlCache();
  const open = (cache, bucket, path, value) => cache.get(bucket, path, 600, async () => value);
  assert.equal(await open(first, 'one', 'file', 'account-one'), 'account-one');
  assert.equal(await open(second, 'one', 'file', 'account-two'), 'account-two');
  assert.equal(await open(first, 'two', 'file', 'bucket-two'), 'bucket-two');
  assert.equal(await open(first, 'one', 'replacement', 'new-file'), 'new-file');
});

test('private URLs: failed signing retries and clearing discards in-flight cache entries', async () => {
  const cache = new SignedUrlCache();
  const request = deferred();
  const old = cache.get('bucket', 'path', 600, () => request.promise);
  await Promise.resolve();
  cache.clear();
  assert.equal(await cache.get('bucket', 'path', 600, async () => 'new'), 'new');
  request.resolve('old');
  await old;
  assert.equal(await cache.get('bucket', 'path', 600, async () => 'unexpected'), 'new');
  cache.clear();
  await assert.rejects(cache.get('bucket', 'path', 600, async () => { throw Error('denied'); }));
  assert.equal(await cache.get('bucket', 'path', 600, async () => 'allowed'), 'allowed');
});

test('refresh: simultaneous requests merge, explicit refresh reloads all', async () => {
  const calls = [];
  const refresh = createRefreshQueue(async (keys) => { calls.push(keys); });
  await Promise.all([refresh(['quizzes']), refresh(['lessons', 'quizzes'])]);
  assert.deepEqual(calls, [['quizzes', 'lessons']]);
  await Promise.all([refresh(['quizzes']), refresh()]);
  assert.equal(calls.at(-1), undefined);
});

test('refresh: a completed mutation during a read gets fresh data afterwards', async () => {
  const gate = deferred();
  const calls = [];
  const refresh = createRefreshQueue(async (keys) => {
    calls.push(keys);
    if (calls.length === 1) await gate.promise;
  });
  const initial = refresh();
  await Promise.resolve();
  const mutation = refresh(['quizAttempts', 'lessonProgress']);
  assert.equal(calls.length, 1);
  gate.resolve();
  await Promise.all([initial, mutation]);
  assert.deepEqual(calls, [undefined, ['quizAttempts', 'lessonProgress']]);
});

test('refresh: a failed read rejects its caller without poisoning the next refresh', async () => {
  let calls = 0;
  const refresh = createRefreshQueue(async () => { if (++calls === 1) throw Error('offline'); });
  await assert.rejects(refresh());
  await refresh(['lessons']);
  assert.equal(calls, 2);
});

test('deferred data: dashboard skips quiz options; repeat screen visits reuse loaded data', async () => {
  const calls = [];
  const loader = createAcademyDataLoader(['lessons', 'quizQuestions'], async (keys, full) => {
    calls.push({ keys, full });
  });
  await loader.refresh();
  assert.deepEqual(calls, [{ keys: ['lessons', 'quizQuestions'], full: true }]);
  await Promise.all([loader.ensure(['quizOptions']), loader.ensure(['quizOptions'])]);
  await loader.ensure(['quizOptions']);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1], { keys: ['quizOptions'], full: false });
  await loader.refresh();
  assert.deepEqual(calls.at(-1), { keys: ['lessons', 'quizQuestions', 'quizOptions'], full: true });
});

test('deferred data: requested editor data survives a full refresh after permission changes', async () => {
  const calls = [];
  const gate = deferred();
  const loader = createAcademyDataLoader(['lessons'], async (keys, full) => {
    calls.push({ keys, full });
    if (calls.length === 1) await gate.promise;
  });
  const initial = loader.refresh();
  await Promise.resolve();
  const editor = loader.ensure(['quizOptions', 'quizAnswerKeys']);
  gate.resolve();
  await Promise.all([initial, editor]);
  assert.deepEqual(calls[1], { keys: ['quizOptions', 'quizAnswerKeys'], full: false });
  await loader.refresh();
  assert.deepEqual(calls.at(-1).keys, ['lessons', 'quizOptions', 'quizAnswerKeys']);
});

test('deferred data: errors allow a retry and account instances never share loaded status', async () => {
  let attempts = 0;
  const loader = createAcademyDataLoader([], async () => { if (++attempts === 1) throw Error('offline'); });
  await assert.rejects(loader.ensure(['quizOptions']));
  await loader.ensure(['quizOptions']);
  assert.equal(attempts, 2);
  const other = createAcademyDataLoader([], async () => { attempts += 1; });
  await other.ensure(['quizOptions']);
  assert.equal(attempts, 3);
});

test('deferred data: new options refresh their questions together and remain in full refreshes', async () => {
  const calls = [];
  const loader = createAcademyDataLoader(['quizzes', 'quizQuestions'], async (keys) => {
    calls.push(keys);
  }, new Map([
    ['quizAnswerKeys', ['quizzes', 'quizQuestions', 'quizOptions']],
  ]));
  await loader.refresh();
  await loader.ensure(['quizAnswerKeys']);
  assert.deepEqual(calls.at(-1), ['quizAnswerKeys', 'quizzes', 'quizQuestions', 'quizOptions']);
  await loader.refresh();
  assert.deepEqual(calls.at(-1), ['quizzes', 'quizQuestions', 'quizAnswerKeys', 'quizOptions']);
});

function apiFixture() {
  const calls = [];
  const portraits = [{ profile_id: 7, portrait_path: '7/portrait.jpg', age_group_id: 3 }];
  const supabase = {
    from(table) {
      let columns;
      return { select(value) { columns = value; return this; }, async order() {
        calls.push({ table, columns });
        return { data: table === 'age_groups' ? [{ id: 3 }, { id: 4 }] : [{ id: 1 }], error: null };
      } };
    },
    async rpc(name) { calls.push({ rpc: name }); return { data: portraits, error: null }; },
    storage: { from(bucket) { return {
      async createSignedUrl(path) { calls.push({ sign: path, bucket }); return { data: { signedUrl: 'private-pdf' }, error: null }; },
      async createSignedUrls(paths) { calls.push({ signs: paths, bucket }); return { data: paths.map(path => ({ path, signedUrl: 'private-portrait' })), error: null }; },
    }; } },
  };
  const api = loadTs('src/lib/academy-api.ts', { '@/lib/supabase': { supabase } });
  return { calls, api };
}

test('academy reads: quiz submission refresh loads exactly the two affected tables', async () => {
  const { api, calls } = apiFixture();
  const result = await api.loadAcademyData({ id: 1, role: 'parent' }, { keys: ['quizAttempts', 'lessonProgress', 'quizAttempts'] });
  assert.deepEqual(Object.keys(result), ['quizAttempts', 'lessonProgress']);
  assert.deepEqual(calls.map(call => call.table), ['quiz_attempts', 'child_lesson_progress']);
  assert.ok(calls.every(call => call.columns && call.columns !== '*'));
});

test('academy reads: preserve teacher filtering, skip unused answers and parent answer keys', async () => {
  const { api, calls } = apiFixture();
  const teacher = await api.loadAcademyData({ id: 7, role: 'teacher' });
  assert.deepEqual(teacher.ageGroups, [{ id: 3 }]);
  assert.ok(!calls.some(call => call.table === 'quiz_attempt_answers'));
  assert.ok(!calls.find(call => call.table === 'lesson_steps').columns.split(',').includes('content'));
  calls.length = 0;
  await api.loadAcademyData({ id: 1, role: 'parent' });
  assert.ok(!calls.some(call => call.table === 'quiz_answer_keys'));
  assert.ok(!calls.some(call => call.table === 'quiz_options'));
  assert.equal(calls.filter(call => call.table).length, 23);
  calls.length = 0;
  await api.loadAcademyData({ id: 7, role: 'admin' }, { keys: ['quizOptions', 'quizAnswerKeys'] });
  assert.deepEqual(calls.map(call => call.table), ['quiz_options', 'quiz_answer_keys']);
});

test('academy reads: portrait signing is shared across contacts/accounts, PDF opens reuse URLs', async () => {
  const { api, calls } = apiFixture();
  const signedUrls = new SignedUrlCache();
  await api.loadAcademyData({ id: 1, role: 'admin' }, { keys: ['teachingContacts'], signedUrls });
  await api.listAdminAccounts(signedUrls);
  assert.equal(calls.filter(call => call.signs).length, 1);
  const asset = { bucket_name: 'academy-media', storage_path: '1/document.pdf' };
  await Promise.all([api.getMediaSignedUrl(asset, signedUrls), api.getMediaSignedUrl(asset, signedUrls)]);
  await api.getMediaSignedUrl(asset, signedUrls);
  assert.equal(calls.filter(call => call.sign).length, 1);
});

test('HAR analysis: count compressed/range bytes without outputting tokens or object names', () => {
  const secret = 'secret-query-token';
  const summary = summarizeHar({ log: { entries: [
    { request: { method: 'GET', url: `https://project.supabase.co/storage/v1/object/sign/academy-media/private-child.pdf?token=${secret}` }, response: { status: 206, bodySize: 512, content: { size: 1024 }, _transferSize: 600 } },
    { request: { method: 'GET', url: 'https://project.supabase.co/rest/v1/lessons?select=*' }, response: { status: 200, bodySize: -1, content: { size: 2048 } } },
  ] } });
  assert.equal(summary[0].encodedBodyBytes, 512);
  assert.equal(summary[0].partialResponses, 1);
  assert.equal(summary[1].unknownBodySizes, 1);
  assert.ok(!JSON.stringify(summary).includes(secret));
  assert.ok(!JSON.stringify(summary).includes('private-child'));
});
