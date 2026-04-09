declare module "better-sqlite3" {
  type Row = Record<string, unknown>;

  interface Statement {
    get(...params: unknown[]): Row | undefined;
    all(...params: unknown[]): Row[];
  }

  interface Database {
    prepare(sql: string): Statement;
    exec(sql: string): this;
    pragma(source: string): unknown;
    close(): void;
  }

  interface DatabaseConstructor {
    new (filename: string): Database;
  }

  const Database: DatabaseConstructor;
  export default Database;
}
