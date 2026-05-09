import type { QueryResult, SqliteValue } from "$lib/client/types";

type SqlitePrimitive = number | string | null;

function sqliteValueToPrimitive(value: SqliteValue): SqlitePrimitive {
  if (value.null === true) return null;
  if (value.integer !== undefined) return value.integer;
  if (value.real !== undefined) return value.real;
  if (value.text !== undefined) return value.text;
  if (value.blob !== undefined) return value.blob;
  return null;
}

function sqliteValueToDisplay(value: SqliteValue): string {
  const normalized = sqliteValueToPrimitive(value);

  if (normalized === null) return "NULL";
  if (value.blob !== undefined) return `[BLOB: ${value.blob.length} chars]`;

  return String(normalized);
}

function quoteSqliteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function buildExplorerPreviewQuery({
  objectName,
  columnNames,
  primaryKeyColumns,
  limit,
  offset,
}: {
  objectName: string;
  columnNames: string[];
  primaryKeyColumns: string[];
  limit: number;
  offset: number;
}): string {
  const safeLimit = Math.max(1, Math.min(200, Math.floor(limit || 25)));
  const safeOffset = Math.max(0, Math.floor(offset || 0));
  const orderColumns =
    primaryKeyColumns.length > 0 ? primaryKeyColumns : columnNames.slice(0, 1);
  const orderByClause =
    orderColumns.length > 0
      ? ` ORDER BY ${orderColumns.map(quoteSqliteIdentifier).join(", ")}`
      : "";

  return `SELECT * FROM ${quoteSqliteIdentifier(objectName)}${orderByClause} LIMIT ${safeLimit} OFFSET ${safeOffset};`;
}

function readResultRowsToObjects(
  result: QueryResult,
): Record<string, SqlitePrimitive>[] {
  if (!result.columns || !result.rows) {
    return [];
  }

  const columns = result.columns;

  return result.rows.map((row) => {
    const record: Record<string, SqlitePrimitive> = {};

    for (const [index, columnName] of columns.entries()) {
      record[columnName] = sqliteValueToPrimitive(row[index] ?? { null: true });
    }

    return record;
  });
}

export type { SqlitePrimitive };
export {
  buildExplorerPreviewQuery,
  quoteSqliteIdentifier,
  readResultRowsToObjects,
  sqliteValueToDisplay,
  sqliteValueToPrimitive,
};
