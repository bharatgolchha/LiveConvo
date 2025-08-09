# Repository Guidelines

## Project Structure & Module Organization
- Root app lives in `frontend/` (Next.js + TypeScript). Key folders: `src/app` (routes & API), `src/components`, `src/lib`, `src/hooks`, `src/types`, `src/test`.
- Chrome extension in `chrome-extension/` (use `build.sh`).
- Supabase SQL and misc assets in `supabase/`, `sql/`, `docs/`. Additional tests may exist under `frontend/tests` and root `tests/`.

## Build, Test, and Development Commands
- Dev server: `cd frontend && npm run dev` (Next + Turbopack).
- Build: `cd frontend && npm run build`; Start prod: `npm run start`.
- Lint: `cd frontend && npm run lint`.
- Tests: `cd frontend && npm test` (watch: `npm run test:watch`, coverage: `npm run test:coverage`).
- Chrome extension: `cd chrome-extension && ./build.sh`.

## Coding Style & Naming Conventions
- Language: TypeScript, React 19, Next.js App Router. Tailwind CSS utilities for styling.
- Linting: ESLint (Next core-web-vitals, TypeScript). Fix warnings before PR.
- Indentation: 2 spaces; keep lines focused and self-documenting.
- Naming: Components `PascalCase` (e.g., `MeetingCard.tsx`), hooks `useX.ts`, utilities `camelCase.ts`. Place collocated tests as `Component.test.tsx`.

## Testing Guidelines
- Framework: Jest + React Testing Library (`frontend/jest.config.js`).
- Where: Collocate next to code (e.g., `src/components/Foo.test.tsx`) or use `src/test` for integration helpers.
- Practices: Mock Supabase and network I/O; test critical flows (transcription, guidance, dashboard interactions). Use `test:coverage` locally before PRs.

## Commit & Pull Request Guidelines
- Commit style: Conventional Commits with scopes seen in history (e.g., `feat(dashboard): ...`, `chore: ...`). Squash trivial fixups.
- PRs must include: clear description, linked issues, setup/repro steps, and screenshots/video for UI.
- Keep PRs focused; add tests and run lint/build before opening.

## Security & Configuration Tips
- Never commit secrets. Use `frontend/.env.local` for local dev. Stripe keys live in Supabase Vault (see CLAUDE.md, Stripe section).
- Required envs: `OPENROUTER_API_KEY`, `DEEPGRAM_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `frontend/.env.local.example`).

## Agent-Specific Notes
- When using AI assistants, follow `CLAUDE.md`. Use Supabase MCP for database-aware tasks and Context7 for API docs as noted there.
