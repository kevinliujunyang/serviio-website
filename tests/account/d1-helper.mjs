import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

export function createD1() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../../migrations/0001_accounts.sql', import.meta.url), 'utf8'));
  class Query {
    constructor(text, values = []) { this.text = text; this.values = values; }
    bind(...values) { return new Query(this.text, values); }
    async first() { return sql.prepare(this.text).get(...this.values) || null; }
    async all() { return { results: sql.prepare(this.text).all(...this.values) }; }
    async run() {
      const result = sql.prepare(this.text).run(...this.values);
      return { success: true, meta: { changes: Number(result.changes) } };
    }
  }
  return {
    sql,
    prepare(text) { return new Query(text); },
    async batch(queries) {
      sql.exec('BEGIN');
      try { const result = []; for (const query of queries) result.push(await query.run()); sql.exec('COMMIT'); return result; }
      catch (error) { sql.exec('ROLLBACK'); throw error; }
    }
  };
}
