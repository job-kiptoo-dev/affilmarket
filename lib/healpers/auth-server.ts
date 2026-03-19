import 'server-only';
import { auth } from '@/lib/utils/auth';
import { headers } from 'next/headers';
import { db } from '@/lib/utils/db';
import { users } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';


export async function getAuthUser() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      console.warn('[getAuthUser] No session or user in session');
      return null;
    }

    const dbUser = await db
      .select({
        id:     users.id,
        email:  users.email,
        name:   users.name,
        role:   users.role,
        status: users.status,
        phone:  users.phone,
      })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!dbUser.length) {
      console.warn('[getAuthUser] Session valid but user not found in DB:', session.user.id);
      return null;
    }

    return {
      sub:    dbUser[0].id,
      email:  dbUser[0].email,
      name:   dbUser[0].name,
      role:   dbUser[0].role,
      status: dbUser[0].status,
      phone:  dbUser[0].phone,
    };
  } catch (err) {
    console.error('[getAuthUser] Exception:', err);
    return null;
  }
}
