import { resolveLang, t, tOrNull } from '../lang';

describe('resolveLang', () => {
  it('prefers the query, then Accept-Language, then English', () => {
    expect(resolveLang('hi', 'en-US')).toBe('hi');
    expect(resolveLang(undefined, 'hi-IN,en;q=0.8')).toBe('hi');
    expect(resolveLang('fr', 'de-DE')).toBe('en');
    expect(resolveLang(undefined, undefined)).toBe('en');
  });
});

describe('t', () => {
  it('picks the language with English fallback', () => {
    expect(t({ en: 'Temple', hi: 'मंदिर' }, 'hi')).toBe('मंदिर');
    expect(t({ en: 'Temple' }, 'hi')).toBe('Temple');
    expect(t('plain', 'hi')).toBe('plain');
    expect(t(null, 'en')).toBe('');
    expect(tOrNull(undefined, 'en')).toBeNull();
  });
});
