# Separate catalog and user data

Status: accepted, 2026-08-20.

Catalog Muscle Groups, Muscles, and Exercises live in dedicated global tables. Custom Exercises,
Routines, Workouts, and Programs live in separate owner-scoped tables with explicit private or
public visibility. Catalog publication is the only writer for catalog tables; authenticated domain
mutations are the only writers for user tables.

The checked-in JSON catalog is the source of truth. Publishing validates the complete graph and
atomically upserts the normalized catalog tables by frozen slug before advancing `catalogState`.
A published slug may be deprecated but never renamed, removed, or reused. The same revision with
the same content hash is idempotent; changed content requires a higher revision.

Routines reference either a catalog Exercise slug or a Custom Exercise ID and retain their selected
column configuration. Workouts store a resolved Exercise snapshot. Catalog updates therefore
change current discovery metadata without rewriting existing prescriptions or completed history.

Separate tables were chosen over a shared Exercise table because catalog and user records have
different identities, mutation authorities, release boundaries, and deletion rules. The application
layer exposes one discriminated Exercise model to consumers.
