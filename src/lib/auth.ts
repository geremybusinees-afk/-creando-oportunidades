import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

/**
 * Crea un CredentialsSignin con un `code` personalizado que el cliente
 * puede leer desde la URL o el resultado de signIn().
 */
function authError(code: string): CredentialsSignin {
  const err = new CredentialsSignin();
  err.code = code;
  return err;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw authError('FALTAN_CAMPOS');
        }

        const email = (credentials.email as string).toLowerCase().trim();
        const password = credentials.password as string;

        let user;
        try {
          const rows = await getDb()
            .select()
            .from(users)
            .where(sql`LOWER(${users.email}) = ${email}`)
            .limit(1);
          user = rows[0];
        } catch {
          throw authError('ERROR_DB');
        }

        if (!user) {
          throw authError('USUARIO_NO_ENCONTRADO');
        }

        let isValid = false;
        try {
          isValid = await compare(password, user.password);
        } catch {
          throw authError('ERROR_BCRYPT');
        }

        if (!isValid) {
          throw authError('CONTRASENA_INCORRECTA');
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.status = (user as any).status;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).status = token.status as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});
