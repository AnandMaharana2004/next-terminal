import { ProfilePanel } from "@/components/profile-panel";
import { getChatSession } from "@/lib/chat-session";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getChatSession();

  return <ProfilePanel userName={user?.name ?? null} />;
}
