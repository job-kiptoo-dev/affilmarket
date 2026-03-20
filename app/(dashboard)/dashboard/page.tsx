// import { getAuthUser } from '@/lib/healpers/auth-server';
// import { redirect }    from 'next/navigation';
//
// export default async function DashboardPage() {
//   const auth = await getAuthUser();
//
//   if (!auth) redirect('/login');
//
//   if (auth.role === 'ADMIN')                        redirect('/admin');
//   if (auth.role === 'AFFILIATE')                    redirect('/affiliate');
//   if (auth.role === 'VENDOR' || auth.role === 'BOTH') redirect('/vendor');
//
//   redirect('/login');
// }
//
//
import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // Middleware handles role routing before this runs
  // This is just a fallback
  redirect('/login');
}
