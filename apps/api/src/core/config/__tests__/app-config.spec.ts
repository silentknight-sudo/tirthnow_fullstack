import { ConfigValidationError, loadConfig } from '../app-config';
import { parseDurationSeconds } from '../duration';

const base = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'a'.repeat(40),
};

describe('loadConfig', () => {
  it('applies defaults for a minimal local env', () => {
    const c = loadConfig(base);
    expect(c.env).toBe('development');
    expect(c.jwt.accessTtlSeconds).toBe(900);
    expect(c.jwt.refreshTtlDays).toBe(30);
    expect(c.firebase.provider).toBe('mock');
    expect(c.swaggerEnabled).toBe(true);
    expect(c.corsOrigins).toEqual([]);
  });

  it('parses lists and durations', () => {
    const c = loadConfig({ ...base, CORS_ORIGINS: 'http://a, http://b ,', JWT_ACCESS_TTL: '10m' });
    expect(c.corsOrigins).toEqual(['http://a', 'http://b']);
    expect(c.jwt.accessTtlSeconds).toBe(600);
  });

  it('reports every invalid variable', () => {
    expect(() => loadConfig({ REDIS_URL: 'nope', JWT_ACCESS_SECRET: 'short' })).toThrow(
      ConfigValidationError,
    );
    try {
      loadConfig({ REDIS_URL: 'nope', JWT_ACCESS_SECRET: 'short' });
    } catch (e) {
      const issues = (e as ConfigValidationError).issues.join('\n');
      expect(issues).toMatch(/DATABASE_URL/);
      expect(issues).toMatch(/REDIS_URL/);
      expect(issues).toMatch(/JWT_ACCESS_SECRET/);
    }
  });

  it('rejects mock providers and the local JWT secret in production', () => {
    const prod = {
      ...base,
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'change-me-local-access-secret-min-32-chars',
    };
    expect(() => loadConfig(prod)).toThrow(
      /JWT_ACCESS_SECRET[\s\S]*FIREBASE_AUTH_PROVIDER[\s\S]*EMAIL_PROVIDER/,
    );
  });

  it('allows explicitly whitelisted mocks in production', () => {
    const c = loadConfig({
      ...base,
      NODE_ENV: 'production',
      ALLOW_MOCK_PROVIDERS: 'firebase_auth,email',
    });
    expect(c.isProduction).toBe(true);
    expect(c.swaggerEnabled).toBe(false);
  });

  it('requires Firebase credentials when the real adapter is selected', () => {
    expect(() =>
      loadConfig({
        ...base,
        NODE_ENV: 'production',
        FIREBASE_AUTH_PROVIDER: 'firebase',
        ALLOW_MOCK_PROVIDERS: 'email',
      }),
    ).toThrow(/FIREBASE_PROJECT_ID/);
  });

  it('unescapes newlines in the Firebase private key', () => {
    const c = loadConfig({ ...base, FIREBASE_PRIVATE_KEY: 'line1\\nline2' });
    expect(c.firebase.privateKey).toBe('line1\nline2');
  });
});

describe('parseDurationSeconds', () => {
  it.each([
    ['900', 900],
    ['45s', 45],
    ['15m', 900],
    ['12h', 43_200],
    ['30d', 2_592_000],
  ])('%s → %d', (input, expected) => {
    expect(parseDurationSeconds(input)).toBe(expected);
  });

  it('rejects garbage', () => {
    expect(() => parseDurationSeconds('15 minutes')).toThrow();
  });
});
