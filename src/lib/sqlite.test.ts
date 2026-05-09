import assert from "node:assert/strict";
import test from "node:test";

import type { QueryResult } from "$lib/client/types";
import {
  buildExplorerPreviewQuery,
  quoteSqliteIdentifier,
  readResultRowsToObjects,
  sqliteValueToDisplay,
  sqliteValueToPrimitive,
} from "./sqlite.ts";

test("quoteSqliteIdentifier escapes double quotes", () => {
  assert.equal(quoteSqliteIdentifier('users"archive'), '"users""archive"');
});

test("buildExplorerPreviewQuery orders by primary keys and clamps pagination", () => {
  assert.equal(
    buildExplorerPreviewQuery({
      objectName: 'users"archive',
      columnNames: ["id", "email"],
      primaryKeyColumns: ["tenant_id", "id"],
      limit: 1000,
      offset: -15,
    }),
    'SELECT * FROM "users""archive" ORDER BY "tenant_id", "id" LIMIT 200 OFFSET 0;',
  );
});

test("buildExplorerPreviewQuery falls back to first column when there is no primary key", () => {
  assert.equal(
    buildExplorerPreviewQuery({
      objectName: "audit_log",
      columnNames: ["created_at", "payload"],
      primaryKeyColumns: [],
      limit: 25,
      offset: 50,
    }),
    'SELECT * FROM "audit_log" ORDER BY "created_at" LIMIT 25 OFFSET 50;',
  );
});

test("sqliteValue helpers normalize sqlite values for UI rendering", () => {
  assert.equal(sqliteValueToPrimitive({ null: true }), null);
  assert.equal(sqliteValueToPrimitive({ integer: 42 }), 42);
  assert.equal(sqliteValueToPrimitive({ real: 3.14 }), 3.14);
  assert.equal(sqliteValueToPrimitive({ text: "hello" }), "hello");
  assert.equal(sqliteValueToPrimitive({ blob: "YWJj" }), "YWJj");

  assert.equal(sqliteValueToDisplay({ null: true }), "NULL");
  assert.equal(sqliteValueToDisplay({ integer: 42 }), "42");
  assert.equal(sqliteValueToDisplay({ real: 3.14 }), "3.14");
  assert.equal(sqliteValueToDisplay({ text: "hello" }), "hello");
  assert.equal(sqliteValueToDisplay({ blob: "YWJj" }), "[BLOB: 4 chars]");
});

test("readResultRowsToObjects maps read results to keyed records", () => {
  const result: QueryResult = {
    type: "read",
    time: 0.001,
    columns: ["name", "pk", "default_value"],
    rows: [
      [{ text: "id" }, { integer: 1 }, { null: true }],
      [{ text: "email" }, { integer: 0 }, { text: "unknown" }],
    ],
  };

  assert.deepEqual(readResultRowsToObjects(result), [
    { name: "id", pk: 1, default_value: null },
    { name: "email", pk: 0, default_value: "unknown" },
  ]);
});
