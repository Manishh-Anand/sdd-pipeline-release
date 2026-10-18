# Default layouts (greenfield only)
Use these only when the repo has no application code. An existing repo's structure always wins.
Offer them as the item 7 options in the intake. Once the developer picks one, record the choice as
an ADR in `.agent/memory/decisions/`.

## A. React SPA: Vite + TypeScript
```
web/
  src/
    api/          # typed API client + contract types
    components/   # reusable presentational components
    hooks/        # data/state hooks (useX)
    pages/        # route-level components
    test-setup.ts
  index.html  vite.config.ts  tsconfig.json  eslint.config.js  .env.example
```
- **Scaffold**: `npm create vite@<ver> web -- --template react-ts --eslint --no-interactive --no-immediate`.
- **Version**: run `node --version` first. If Node is ≥ 22.12 (or 20.19), use the latest
  `create-vite` that is more than 2 weeks old. Otherwise pin `create-vite@6.5.0` (Vite 6 supports
  Node 18, 20 and 22.0+); it has no `--eslint`/`--no-interactive` flags, so pass only `--template react-ts`.
- **Then add** Vitest + Testing Library + jsdom, plus these package scripts:
  `typecheck` (`tsc --noEmit`), `lint`, `test` (`vitest run`), `build`.

## B. API: ASP.NET Core + EF Core + SQL Server
```
api/
  <App>.sln
  <App>.Api/
    Program.cs
    Endpoints/    # minimal-API route groups (thin)
    Services/     # application logic
    Data/         # DbContext + configuration
    Entities/     # EF entities
    Contracts/    # request/response DTO records
    Migrations/
  <App>.Api.Tests/  # xUnit + WebApplicationFactory + SQLite in-memory
  dotnet-tools.json # dotnet-ef pinned as a local tool
```
- **Scaffold**: `dotnet new sln`, `dotnet new web` (minimal API), `dotnet new xunit`.
- **Packages**: add EF Core SqlServer/Design, plus Mvc.Testing and EF Sqlite for the tests. Pin
  versions more than 2 weeks old.
- **Check**: `TreatWarningsAsErrors` on. `dotnet build` also surfaces NuGet vulnerability
  warnings (NU1903). Fix them, don't suppress them.

## C. Full stack: A + B side by side
```
web/   (layout A)
api/   (layout B)
```
The Vite dev proxy forwards `/api` to the API. API keys and tokens are added server-side, never
in the bundle.

## D. Python service
```
service/
  src/<pkg>/   # app code
  tests/
  pyproject.toml  # deps + ruff + mypy + pytest config
```
Use the project tool the team prefers (uv by default) and lock the versions.

## Greenfield plan requirements
- **Step 1 scaffolds** the chosen layout **and its tooling** (typecheck, lint, test, build), so
  validation has real commands to run.
- **Feature work starts after** the scaffold builds and tests pass.
- **Afterwards**, record the stack decision (ADR) and any setup gotchas through `project-memory`.
