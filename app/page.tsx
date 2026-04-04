import { ChatRoom } from "@/components/chat-room";
import { listMessages, listUsers } from "@/lib/chat";
import { getChatSession } from "@/lib/chat-session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [messages, currentUser, users] = await Promise.all([
    listMessages(),
    getChatSession(),
    listUsers(),
  ]);

  return <ChatRoom initialMessages={messages} initialUser={currentUser} initialUsers={users} />;
}
