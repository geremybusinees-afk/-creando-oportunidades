import postgres from 'postgres';

const sql = postgres('postgres://postgres.ixmuvazbuepcedguvbpx:T94iOQBezhLb24P2@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require', { prepare: false });

async function main() {
  try {
    const result = await sql`DELETE FROM public.users WHERE email = 'test-video-fix@debug.com'`;
    console.log('Cleanup OK, deleted rows:', result.count);
    await sql.end();
  } catch (e: any) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}

main();
