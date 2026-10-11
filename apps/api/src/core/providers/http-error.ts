/** Non-2xx response from a provider's HTTP API; `status` drives isTransientError(). */
export class ProviderHttpError extends Error {
  constructor(
    public readonly provider: string,
    public readonly status: number,
    message: string,
  ) {
    super(`${provider} ${String(status)}: ${message}`);
    this.name = 'ProviderHttpError';
  }
}

export async function readJsonOrThrow<T>(provider: string, res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ProviderHttpError(provider, res.status, text.slice(0, 300));
  }
  return (await res.json()) as T;
}
