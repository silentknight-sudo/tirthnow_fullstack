import { pickRule, splitSale } from '../services/split';

const rule = (
  over: Partial<{
    id: string;
    percentBps: number;
    flatPaise: number;
    minPaise: number | null;
    maxPaise: number | null;
  }> = {},
) => ({
  id: 'r1',
  percentBps: 1000,
  flatPaise: 0,
  minPaise: null,
  maxPaise: null,
  ...over,
});

describe('splitSale', () => {
  it('takes commission and GST on commission; parts add up', () => {
    const s = splitSale(400_000, rule(), 1800);
    expect(s).toEqual({
      grossPaise: 400_000,
      commissionPaise: 40_000,
      gstPaise: 7_200,
      vendorPaise: 352_800,
      ruleId: 'r1',
    });
  });

  it('applies flat fees and min/max clamps', () => {
    expect(splitSale(10_000, rule({ flatPaise: 500 }), 0).commissionPaise).toBe(1_500);
    expect(splitSale(10_000, rule({ minPaise: 2_000 }), 0).commissionPaise).toBe(2_000);
    expect(splitSale(10_000_000, rule({ maxPaise: 50_000 }), 0).commissionPaise).toBe(50_000);
  });

  it('never leaves the vendor negative', () => {
    const s = splitSale(100, rule({ flatPaise: 1_000 }), 1800);
    expect(s.vendorPaise).toBe(0);
    expect(s.commissionPaise + s.gstPaise).toBe(100);
  });

  it('handles no rule and zero gross', () => {
    expect(splitSale(5_000, null, 1800)).toMatchObject({
      commissionPaise: 0,
      vendorPaise: 5_000,
      ruleId: null,
    });
    expect(splitSale(0, rule(), 1800)).toMatchObject({ vendorPaise: 0 });
  });

  it('always sums exactly for awkward amounts', () => {
    for (const gross of [1, 7, 99, 101, 12_345, 999_999, 1_234_567]) {
      const s = splitSale(gross, rule({ percentBps: 1234, flatPaise: 3 }), 1800);
      expect(s.commissionPaise + s.gstPaise + s.vendorPaise).toBe(gross);
      expect(
        Object.values(s)
          .filter((v) => typeof v === 'number')
          .every((v) => Number.isInteger(v) && v >= 0),
      ).toBe(true);
    }
  });
});

describe('pickRule', () => {
  const at = (n: number) => new Date(Date.UTC(2026, 0, n));
  const rules = [
    { id: 'global', vendorId: null, cityId: null, orderType: null, priority: 0, createdAt: at(1) },
    { id: 'food', vendorId: null, cityId: null, orderType: 'food', priority: 0, createdAt: at(1) },
    {
      id: 'vrindavan-food',
      vendorId: null,
      cityId: 'c1',
      orderType: 'food',
      priority: 0,
      createdAt: at(1),
    },
    { id: 'vendor', vendorId: 'v1', cityId: null, orderType: null, priority: 0, createdAt: at(1) },
    {
      id: 'other-vendor',
      vendorId: 'v2',
      cityId: null,
      orderType: null,
      priority: 9,
      createdAt: at(1),
    },
  ];

  it('prefers the most specific matching rule', () => {
    expect(pickRule(rules, { vendorId: 'v9', cityId: null, orderType: 'hotel' })?.id).toBe(
      'global',
    );
    expect(pickRule(rules, { vendorId: 'v9', cityId: null, orderType: 'food' })?.id).toBe('food');
    expect(pickRule(rules, { vendorId: 'v9', cityId: 'c1', orderType: 'food' })?.id).toBe(
      'vrindavan-food',
    );
    expect(pickRule(rules, { vendorId: 'v1', cityId: 'c1', orderType: 'food' })?.id).toBe('vendor');
  });

  it('breaks ties by priority then recency', () => {
    const tied = [
      { id: 'a', vendorId: null, cityId: null, orderType: null, priority: 1, createdAt: at(1) },
      { id: 'b', vendorId: null, cityId: null, orderType: null, priority: 1, createdAt: at(2) },
      { id: 'c', vendorId: null, cityId: null, orderType: null, priority: 0, createdAt: at(3) },
    ];
    expect(pickRule(tied, { vendorId: 'v', cityId: null, orderType: 'cab' })?.id).toBe('b');
    expect(pickRule([], { vendorId: 'v', cityId: null, orderType: 'cab' })).toBeNull();
  });
});
