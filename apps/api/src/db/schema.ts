/**
 * Aggregates the Drizzle schemas of every domain module — for drizzle-kit
 * (migration generation) and for typing the client. The scaffolder appends the re-export of
 * a module's schema at the anchor. The first table is `users`.
 *
 * The pattern:
 *   export * from "../modules/products/products.schema.js";
 */

export * from "../modules/auth/auth.schema.js";
export * from "../modules/projects/projects.schema.js";
export * from "../modules/tasks/tasks.schema.js";
export * from "../modules/comments/comments.schema.js";
export * from "../modules/venues/venues.schema.js";
export * from "../modules/speakers/speakers.schema.js";
export * from "../modules/rooms/rooms.schema.js";
export * from "../modules/events/events.schema.js";
export * from "../modules/talks/talks.schema.js";
export * from "../modules/registrations/registrations.schema.js";
export * from "../modules/talk-speakers/talk-speakers.schema.js";
// scaffolder:schema-export — do not remove
