export type ColumnInfo = {
  cid: number | null;
  name: string;
  type: string | null;
  notnull: number | null;
  dflt_value: string | null;
  pk: number | null;
};

export type IndexInfo = {
  seq: number | null;
  name: string;
  unique: number | null;
  origin: string | null;
  partial: number | null;
};

export type ForeignKeyInfo = {
  id: number | null;
  seq: number | null;
  table: string | null;
  from: string | null;
  to: string | null;
  on_update: string | null;
  on_delete: string | null;
  match: string | null;
};
