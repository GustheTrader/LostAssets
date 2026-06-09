import Database from 'better-sqlite3';
const db = new Database('data.sqlite');
const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all() as any[];
for (const table of tables) {
  console.log('Table:', table.name);
  const info = db.prepare(`PRAGMA table_info(${table.name})`).all();
  console.log(info.map((c: any) => c.name).join(', '));
  console.log('---');
}
