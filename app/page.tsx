import { getCurrentDirectory, isAuthenticated } from "@/lib/auth";
import { TerminalPage } from "@/components/terminal-page";

export default async function Home() {
  const authenticated = await isAuthenticated();
  const currentDirectory = await getCurrentDirectory();

  return (
    <TerminalPage
      initialAuthenticated={authenticated}
      initialDirectory={currentDirectory}
    />
  );
}
