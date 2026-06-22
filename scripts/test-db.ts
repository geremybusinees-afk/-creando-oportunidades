import postgres from 'postgres';

const sql = postgres('postgres://postgres.ixmuvazbuepcedguvbpx:T94iOQBezhLb24P2@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require', { prepare: false });

async function main() {
  try {
    // Check which schemas have users table
    const schemas = await sql`SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'users'`;
    console.log('Users tables by schema:', JSON.stringify(schemas));

    // Check public.users columns specifically
    const publicCols = await sql`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' ORDER BY ordinal_position`;
    console.log('Public users columns:', JSON.stringify(publicCols, null, 2));

    // Try inserting a test user
    console.log('\n--- Testing INSERT ---');
    try {
      const insertResult = await sql`INSERT INTO public.users (email, password, name, role, status, max_attempts, created_at, updated_at) VALUES ('test-insert@debug.com', 'hash_test', 'Test', 'user', 'pending', 3, NOW(), NOW()) RETURNING id, email`;
      console.log('Insert OK:', JSON.stringify(insertResult));
      // Clean up
      await sql`DELETE FROM public.users WHERE email = 'test-insert@debug.com'`;
      console.log('Cleanup OK');
    } catch (e: any) {
      console.error('Insert ERROR:', e.message);
      console.error('Detail:', e.detail || '');
      console.error('Code:', e.code || '');
    }

    // Check if there are any NOT NULL columns we might be missing
    const notNullCols = await sql`SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND is_nullable = 'NO' ORDER BY ordinal_position`;
    console.log('\nNOT NULL columns:', JSON.stringify(notNullCols, null, 2));

    await sql.end();
  } catch (e: any) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}

main();
