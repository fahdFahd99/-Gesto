export interface SqlResult<T = Record<string, any>> { success: boolean; results: T[]; meta: { changes: number } }
export interface SqlStatement {
  bind(...values: unknown[]): SqlStatement;
  all<T = Record<string, any>>(): Promise<SqlResult<T>>;
  first<T = Record<string, any>>(column?: string): Promise<T | null>;
  run(): Promise<SqlResult>;
}
export interface SqlDatabase {
  prepare(sql: string): SqlStatement;
  batch(statements: SqlStatement[]): Promise<SqlResult[]>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}
