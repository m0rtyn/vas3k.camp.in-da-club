import {
  pgTable,
  text,
  boolean,
  integer,
  uuid,
  timestamp,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const meetingStatusEnum = pgEnum('meeting_status', [
  'pending',
  'unconfirmed',
  'confirmed',
  'cancelled',
]);

export const users = pgTable('users', {
  username: text('username').primaryKey(),
  display_name: text('display_name').notNull(),
  avatar_url: text('avatar_url').notNull().default(''),
  bio: text('bio'),
  approvals_available: integer('approvals_available').notNull().default(3),
  confirmed_contacts_count: integer('confirmed_contacts_count').notNull().default(0),
  is_admin: boolean('is_admin').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

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
  ],
);

export const approvalGrants = pgTable('approval_grants', {
  id: uuid('id').primaryKey().defaultRandom(),
  granted_by: text('granted_by')
    .notNull()
    .references(() => users.username),
  granted_to: text('granted_to').notNull(), // username or '__all__'
  amount: integer('amount').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
