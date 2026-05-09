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
  cursor,
}: {
  objectName: string;
  columnNames: string[];
  primaryKeyColumns: string[];
  limit: number;
  cursor?: Record<string, SqlitePrimitive>;
}): string {
  const safeLimit = Math.max(1, Math.min(200, Math.floor(limit || 25)));

  // If no PKs are defined, fallback to the first column
  const orderColumns =
    primaryKeyColumns.length > 0 ? primaryKeyColumns : columnNames.slice(0, 1);

  const orderByClause = ` ORDER BY ${orderColumns.map(quoteSqliteIdentifier).join(", ")}`;

  let whereClause = "";
  if (cursor && Object.keys(cursor).length > 0 && orderColumns.length > 0) {
    const cursorKeys = orderColumns.filter((c) => cursor[c] !== undefined);
    if (cursorKeys.length > 0) {
      // For composite keys, SQLite supports row values: (A, B) > (valA, valB)
      const keysStr = cursorKeys.map(quoteSqliteIdentifier).join(", ");
      const valsStr = cursorKeys
        .map((k) => {
          const val = cursor[k];
          if (val === null) return "NULL";
          if (typeof val === "string") return `'${val.replace(/'/g, "''")}'`;
          return val;
        })
        .join(", ");

      if (cursorKeys.length === 1) {
        whereClause = ` WHERE ${keysStr} > ${valsStr}`;
      } else {
        whereClause = ` WHERE (${keysStr}) > (${valsStr})`;
      }
    }
  }

  return `SELECT * FROM ${quoteSqliteIdentifier(objectName)}${whereClause}${orderByClause} LIMIT ${safeLimit};`;
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
