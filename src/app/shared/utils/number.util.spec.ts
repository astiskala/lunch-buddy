import { toPercent } from './number.util';

describe('toPercent', () => {
  it('rounds ratios to whole percents', () => {
    expect(toPercent(0.256)).toBe(26);
    expect(toPercent(0.5)).toBe(50);
  });

  it('clamps values when bounds are provided', () => {
    expect(toPercent(1.5, { max: 100 })).toBe(100);
    expect(toPercent(-0.2, { min: 0 })).toBe(0);
  });
});
