// Node 用テスト実行ヘルパ (CI/手動検証用、任意)。
// ブラウザ runner.html とは別経路で全テストを実行し結果を stdout に出す。
import { runAll } from './assert.js';
import './unit/_smoke.test.js';
import './unit/rng.test.js';
import './unit/collision.test.js';
import './unit/engine.test.js';
import './unit/gravity.test.js';
import './unit/determinism.test.js';
import './unit/pointer.test.js';

const results = await runAll();
let passed = 0, failed = 0;
for (const r of results) {
    if (r.ok) {
        passed++;
        console.log(`PASS  ${r.name}`);
    } else {
        failed++;
        console.log(`FAIL  ${r.name}\n      ${r.error}`);
    }
}
console.log(`---\n${passed} passed / ${failed} failed / total ${results.length}`);
if (failed > 0) process.exit(1);
