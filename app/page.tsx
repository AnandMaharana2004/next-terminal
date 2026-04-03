import { isAuthenticated } from "@/lib/auth";
import { TerminalPage } from "@/components/terminal-page";

export default async function Home() {
  const authenticated = await isAuthenticated();

  return <TerminalPage initialAuthenticated={authenticated} />;
}
