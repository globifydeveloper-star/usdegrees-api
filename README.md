| Branch | Purpose |
|--------|---------|
| `develop` | Active development — all feature work happens here |
| `test`    | Staging environment — merged from develop. |
| `main`    | Production — merged from test only after passing QA. |

**Rules:**
- Never push directly to `test` or `main`
- `test → main` merge only after QA sign-off

---

## Scripts

```bash
npm run dev      # Start dev server with hot reload (ts-node + nodemon)
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled output (production)
```

## Key Technical Decisions

- **Service layer** separates all business logic from route handlers
- **Repository pattern** keeps all SQL in typed repository classes
- **Calculator functions** are pure and independently unit-testable
- **Zod schemas** validate all incoming requests at the route level
- **Response shape** is standardized across all endpoints — `{ data, meta, error }`
- **Heavy endpoints** (listing page, compare) use Redis-compatible caching
