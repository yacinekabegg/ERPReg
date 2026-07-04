import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getAppUser } from '@/lib/appUser';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAppUser();
  if (!user) redirect('/login');

  return (
    <div className="app">
      <Sidebar nom={user.nom} roles={user.roles} />
      <main className="main">{children}</main>
    </div>
  );
}
