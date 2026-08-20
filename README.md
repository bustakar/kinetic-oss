# Kinetic

Kinetic is an open-source strength-training workspace built from four composable concepts:
Exercises, Routines, Workouts, and Programs. Catalog Exercises supply a shared foundation while
every user can create and share their own training.

## Stack

- TanStack Start on Vercel
- Convex
- WorkOS AuthKit
- shadcn/ui

## Local development

Requirements: Node.js 24+ and pnpm 11+.

```sh
cp .env.example .env.local
pnpm install
pnpm dev
```

The Convex CLI will prompt you to select a development deployment when one is not already
configured. Use WorkOS staging credentials for local development.

## Catalog

The source-controlled catalog contains only Muscle Groups, Muscles, and Exercises:

```text
data/catalog-manifest.json
data/muscles.json
data/exercises.json
```

Validate it with `pnpm test` and publish it to the selected Convex deployment with:

```sh
pnpm catalog:publish
```

Catalog slugs are permanent identities. Published slugs may be deprecated but never renamed,
removed, or reused.

## Checks

```sh
pnpm check
```

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the development
workflow and [SECURITY.md](SECURITY.md) for reporting vulnerabilities privately.
Open-source strength training building blocks for exercises, routines, workouts, and programs.
