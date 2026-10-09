import { callWithPolicy, isTransientError, ProviderTimeoutError } from '../call-policy';

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
