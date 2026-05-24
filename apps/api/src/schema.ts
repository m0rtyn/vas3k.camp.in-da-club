import {
  pgTable,
  text,
  boolean,
  integer,
  uuid,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const meetingStatusEnum = pgEnum('meeting_status', [
  'pending',
  'unconfirmed',
  'confirmed',
  'cancelled',
]);

export const users = pgTable(
  'users',
  {
    username: text('username').primaryKey(),
    // Nullable at the DB level: OIDC `/callback` inserts a new row before it
    // can generate a unique camp_username (which requires the row to exist
    // for the UPDATE-based collision retry). Auth middleware self-heals any
    // remaining NULLs on first authenticated request. All authenticated
    // boundaries (`AuthUser`) treat the value as non-null.
    camp_username: text('camp_username'),
    display_name: text('display_name').notNull(),
    avatar_url: text('avatar_url').notNull().default(''),
    bio: text('bio'),
    approvals_available: integer('approvals_available').notNull().default(3),
    confirmed_contacts_count: integer('confirmed_contacts_count').notNull().default(0),
    is_admin: boolean('is_admin').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('users_camp_username_unique').on(table.camp_username)],
);

export const meetings = pgTable(
  'meetings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    initiator_username: text('initiator_username')
      .notNull()
      .references(() => users.username),
    target_username: text('target_username')
      .notNull()
      .references(() => users.username),
    witness_code: text('witness_code'),
    witness_code_expires_at: timestamp('witness_code_expires_at', { withTimezone: true }),
    witness_username: text('witness_username').references(() => users.username),
    status: meetingStatusEnum('status').notNull().default('unconfirmed'),
    hidden_by: text('hidden_by')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    confirmed_at: timestamp('confirmed_at', { withTimezone: true }),
    cancelled_at: timestamp('cancelled_at', { withTimezone: true }),
    client_created_at: timestamp('client_created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    // Bidirectional unique: only one active meeting per pair
    uniqueIndex('unique_meeting_pair').on(
      sql`LEAST(${table.initiator_username}, ${table.target_username})`,
      sql`GREATEST(${table.initiator_username}, ${table.target_username})`,
    ).where(sql`${table.status} != 'cancelled'`),
    index('idx_meetings_initiator').on(table.initiator_username),
    index('idx_meetings_target').on(table.target_username),
    index('idx_meetings_status').on(table.status),
    index('idx_meetings_created_at').on(sql`${table.created_at} DESC`),
    index('idx_meetings_witness').on(table.witness_username),
  ],
);

export const approvalGrants = pgTable(
  'approval_grants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    granted_by: text('granted_by')
      .notNull()
      .references(() => users.username),
    granted_to: text('granted_to').notNull(), // username or '__all__'
    amount: integer('amount').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('idx_approval_grants_granted_to').on(table.granted_to)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    username: text('username')
      .notNull()
      .references(() => users.username, { onDelete: 'cascade' }),
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_sessions_username').on(table.username),
    index('idx_sessions_expires_at').on(table.expires_at),
  ],
);
