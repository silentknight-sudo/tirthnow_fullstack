# @tirth-now/api-client

Typed HTTP client for the portals, generated from the API's OpenAPI document.

```bash
pnpm --filter @tirth-now/api openapi:export        # API → openapi.json
pnpm --filter @tirth-now/api-client generate       # openapi.json → src/schema.ts
```

`createApiClient({ baseUrl, tokens })` wraps `openapi-fetch`: it adds the bearer
token and `Accept-Language`, shares one refresh across concurrent 401s, and throws
`ApiError { status, code, message }` for every non-2xx response. CI fails if
`src/schema.ts` is stale (`pnpm --filter @tirth-now/api-client check`).
