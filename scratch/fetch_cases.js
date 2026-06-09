import sqlite3 from 'better-sqlite3';

const db = new sqlite3('data.sqlite');

const rows = db.prepare(`
  SELECT owner_name, property_id, reported_value, property_type, holder_name
  FROM properties
  WHERE owner_name LIKE '%BELLEVUE%' 
     OR owner_name LIKE '%BRAUN WILLIAM%'
     OR owner_name LIKE '%GAO HONGXIA%'
     OR owner_name LIKE '%VELADOR MATILDE%'
  ORDER BY owner_name, reported_value DESC
`).all();

console.log(JSON.stringify(rows, null, 2));
