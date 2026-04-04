import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { checkRateLimit } from './ratelimit';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Usuario', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error('Ingresá usuario y contraseña');
        }

        // Rate limiting por IP
        const forwarded = req?.headers?.['x-forwarded-for'];
        const ip =
          typeof forwarded === 'string'
            ? forwarded.split(',')[0].trim()
            : '127.0.0.1';

        const rateLimitResult = await checkRateLimit(ip);
        if (!rateLimitResult.success) {
          if (rateLimitResult.locked) {
            throw new Error(
              'Demasiados intentos fallidos. Tu acceso está bloqueado por 1 hora.'
            );
          }
          throw new Error(
            `Demasiados intentos. Esperá ${rateLimitResult.retryAfter} segundos.`
          );
        }

        const validUsername = process.env.APP_USERNAME;
        const passwordHash = process.env.APP_PASSWORD_HASH;

        if (!validUsername || !passwordHash) {
          console.error(
            '[auth] APP_USERNAME o APP_PASSWORD_HASH no configurados'
          );
          throw new Error('Error de configuración del servidor');
        }

        if (credentials.username !== validUsername) {
          throw new Error('Usuario o contraseña incorrectos');
        }

        const isValid = await compare(credentials.password, passwordHash);
        if (!isValid) {
          throw new Error('Usuario o contraseña incorrectos');
        }

        return { id: '1', name: validUsername };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 días
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
      }
      return session;
    },
  },
};
