import { hash } from 'bcryptjs';
import postgres from 'postgres';

async function main() {
  try {
    const sql = postgres('postgres://postgres.ixmuvazbuepcedguvbpx:T94iOQBezhLb24P2@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require');
    
    const hashedPassword = await hash('Jhonjds11#', 12);
    
    await sql`
      UPDATE users 
      SET password = ${hashedPassword}, role = 'admin', name = 'Admin', status = 'verified'
      WHERE email = 'admin@creandooportunidades.com'
    `;
    
    console.log('✅ Contraseña actualizada para admin@creandooportunidades.com');
    
    // Verify
    const rows = await sql`SELECT id, email, name, role, status FROM users WHERE email = 'admin@creandooportunidades.com'`;
    console.log(JSON.stringify(rows, null, 2));
    
    await sql.end();
  } catch(e: any) {
    console.error('Error:', e.message);
  }
}

main();
