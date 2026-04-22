// house.js のテスト: ハウス幾何ユーティリティ (M1v2.2-A)。

import { test, assertEqual, assertClose } from '../assert.js';
import { HOUSE, distanceToButton, ringIndexAt, isInHouse } from '../../src/game/house.js';

test('house: HOUSE 定数が cx=0.25, cy=0.20, radii=[0.020,0.040,0.070,0.100]', () => {
    assertEqual(HOUSE.cx, 0.25, 'cx');
    assertEqual(HOUSE.cy, 0.20, 'cy');
    assertEqual(HOUSE.radii.length, 4, 'radii.length');
    assertEqual(HOUSE.radii[0], 0.020, 'radii[0]');
    assertEqual(HOUSE.radii[1], 0.040, 'radii[1]');
    assertEqual(HOUSE.radii[2], 0.070, 'radii[2]');
    assertEqual(HOUSE.radii[3], 0.100, 'radii[3]');
});

test('house: distanceToButton(中心) ≈ 0', () => {
    assertClose(distanceToButton({ x: 0.25, y: 0.20 }), 0, 1e-9, 'center');
});

test('house: distanceToButton({0.30,0.20}) ≈ 0.05', () => {
    assertClose(distanceToButton({ x: 0.30, y: 0.20 }), 0.05, 1e-9, 'offset 0.05');
});

test('house: ringIndexAt(中心) === 0 (ボタン)', () => {
    assertEqual(ringIndexAt({ x: 0.25, y: 0.20 }), 0);
});

test('house: ringIndexAt(中心+0.090) === 3 (12ft 内)', () => {
    assertEqual(ringIndexAt({ x: 0.25 + 0.090, y: 0.20 }), 3);
});

test('house: isInHouse(中心+0.150) === false (ハウス外)', () => {
    assertEqual(isInHouse({ x: 0.25 + 0.150, y: 0.20 }), false);
});
