import { formatInr, render, TEMPLATES } from '../templates';

describe('notification templates', () => {
  it('renders variables and drops unknown ones', () => {
    expect(render('{{a}} and {{b}} {{missing}} end', { a: 'x', b: 'y' })).toBe('x and y end');
  });

  it('formats paise as Indian rupees', () => {
    expect(formatInr(123_456_789)).toBe('₹12,34,567.89');
    expect(formatInr(50_000)).toBe('₹500');
    expect(formatInr(5)).toBe('₹0.05');
  });

  it('declares every variable each template uses, in both languages', () => {
    for (const [key, tpl] of Object.entries(TEMPLATES)) {
      for (const text of [tpl.title.en, tpl.title.hi, tpl.body.en, tpl.body.hi]) {
        for (const m of text.matchAll(/\{\{(\w+)\}\}/g)) {
          expect([key, tpl.variables.includes(m[1] ?? '')]).toEqual([key, true]);
        }
      }
    }
  });
});
