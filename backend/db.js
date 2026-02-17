import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "one_geo",
  password: "delta@123",
  port: 5432,
});

export default pool;
