import {
  callWithPolicy,
  isTransientError,
  ProviderTimeoutError,
  ProviderUnavailableError,
  resetCircuits,
} from '../call-policy';

beforeEach(() => {
  resetCircuits();
});

describe('callWithPolicy', () => {
  it('retries transient failures then succeeds', async () => {
    let calls = 0;
    const result = await callWithPolicy(
      'test',
      () => {
        calls++;
        return calls < 3
          ? Promise.reject(Object.assign(new Error('reset'), { code: 'ECONNRESET' }))
          : Promise.resolve('ok');
      },
      { baseDelayMs: 1 },
    );
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('does not retry non-transient errors', async () => {
    let calls = 0;
    await expect(
      callWithPolicy('test', () => {
        calls++;
        return Promise.reject(Object.assign(new Error('bad request'), { status: 400 }));
      }),
    ).rejects.toThrow('bad request');
    expect(calls).toBe(1);
  });

  it('gives up after the retry budget', async () => {
    let calls = 0;
    await expect(
      callWithPolicy(
        'test',
        () => {
          calls++;
          return Promise.reject(Object.assign(new Error('unavailable'), { status: 503 }));
        },
        { retries: 2, baseDelayMs: 1 },
      ),
    ).rejects.toThrow('unavailable');
    expect(calls).toBe(3);
  });

  it('times out slow calls', async () => {
    await expect(
      callWithPolicy('slow', () => new Promise((resolve) => setTimeout(resolve, 200)), {
        timeoutMs: 20,
        retries: 0,
      }),
    ).rejects.toBeInstanceOf(ProviderTimeoutError);
  });
});

describe('circuit breaker', () => {
  it('opens after repeated transient failures and fails fast', async () => {
    const failing = () => Promise.reject(Object.assign(new Error('down'), { status: 503 }));
    await expect(
      callWithPolicy('flaky', failing, { retries: 10, baseDelayMs: 1 }),
    ).rejects.toBeInstanceOf(ProviderUnavailableError);
    let called = false;
    await expect(
      callWithPolicy('flaky', () => {
        called = true;
        return Promise.resolve('ok');
      }),
    ).rejects.toBeInstanceOf(ProviderUnavailableError);
    expect(called).toBe(false);
  });

  it('does not count client errors', async () => {
    for (let i = 0; i < 10; i++) {
      await expect(
        callWithPolicy('strict', () =>
          Promise.reject(Object.assign(new Error('bad'), { status: 400 })),
        ),
      ).rejects.toThrow('bad');
    }
    await expect(callWithPolicy('strict', () => Promise.resolve('ok'))).resolves.toBe('ok');
  });
});

describe('isTransientError', () => {
  it.each([
    [{ code: 'ETIMEDOUT' }, true],
    [{ status: 429 }, true],
    [{ statusCode: 502 }, true],
    [{ status: 401 }, false],
    ['string', false],
    [null, false],
  ])('%j → %s', (err, expected) => {
    expect(isTransientError(err)).toBe(expected);
  });
});
