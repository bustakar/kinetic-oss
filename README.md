# Kinetic

Open-source strength training building blocks for exercises, routines, workouts, and programs.

## Workspace

- `apps/*` contains deployable applications.
- `packages/*` contains backend and shared packages.

Install dependencies and run every package check with:

```sh
pnpm install
pnpm check
```

Run the Web app with:

```sh
pnpm dev
```

## Catalog

The versioned source catalog lives in `data/`. Change it together, increment
the manifest revision, and commit and push the result before publishing it to
your linked Convex development deployment:

```sh
pnpm catalog:publish
```

The publisher loads all four files from the exact current Git commit and
applies them in one mutation. Published slugs stay stable; deprecate entries
instead of removing or renaming them.
