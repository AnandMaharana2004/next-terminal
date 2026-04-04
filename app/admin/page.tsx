import { AdminPanel } from "@/components/admin-panel";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listUsers } from "@/lib/chat";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();
  const users = authenticated ? await listUsers() : [];

  return <AdminPanel authenticated={authenticated} initialUsers={users} />;
}
