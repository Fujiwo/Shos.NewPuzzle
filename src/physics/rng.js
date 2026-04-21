/**
 * シードから 0..1 の擬似乱数生成器を返す。
 * 同シード → 同系列を保証 (mulberry32 アルゴリズム)。
 * @param {number} seed - 32-bit 整数 (負数や小数は >>> 0 で丸める)
 * @returns {() => number} 0 以上 1 未満を返す関数
 */
export function createRng(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
