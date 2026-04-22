// テスト全件を import し、結果を runner.html の DOM に出力する。

import { runAll } from './assert.js';
import './unit/_smoke.test.js';
import './unit/rng.test.js';
import './unit/collision.test.js';
import './unit/engine.test.js';
import './unit/determinism.test.js';
import './unit/pointer.test.js';
import './unit/keyboard.test.js';
import './unit/state.test.js';
import './unit/rules.test.js';
import './unit/effects.test.js';
import './unit/sfx.test.js';
import './unit/loop.test.js';
import './unit/house.test.js';

const summaryEl = document.getElementById('summary');
const resultsEl = document.getElementById('results');

const results = await runAll();

let passed = 0;
let failed = 0;
for (const r of results) {
    const li = document.createElement('li');
    li.classList.add(r.ok ? 'pass' : 'fail');
    li.textContent = `${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`;
    if (!r.ok) {
        const detail = document.createElement('span');
        detail.className = 'error-detail';
        detail.textContent = r.error ?? '';
        li.appendChild(detail);
    }
    resultsEl.appendChild(li);
    if (r.ok) passed++; else failed++;
}

const total = results.length;
summaryEl.textContent = `${passed} passed / ${failed} failed / total ${total}`;
summaryEl.classList.add(failed === 0 ? 'pass' : 'fail');
