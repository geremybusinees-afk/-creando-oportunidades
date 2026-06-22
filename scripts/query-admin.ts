import postgres from 'postgres';

async function main() {
  try {
    const sql = postgres('postgres://postgres.ixmuvazbuepcedguvbpx:T94iOQBezhLb24P2@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require');
    
    const rows = await sql`SELECT id, email, name, role, status FROM users WHERE role = 'admin'`;
    console.log(JSON.stringify(rows, null, 2));
    
    if (rows.length === 0) {
      console.log('No admin users found. Checking all users...');
      const allUsers = await sql`SELECT id, email, name, role, status FROM users LIMIT 20`;
      console.log('All users:', JSON.stringify(allUsers, null, 2));
    }
    
    await sql.end();
  } catch(e: any) {
    console.error('Error:', e.message);
  }
}

main();
