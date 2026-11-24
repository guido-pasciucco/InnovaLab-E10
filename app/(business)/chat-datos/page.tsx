import { notFound } from "next/navigation";

import { ChatDatosChat } from "@/components/chat-datos/chat-datos-chat";
import { requireUser } from "@/lib/auth/require-user";
import { isChatDatosEnabled } from "@/lib/chat-datos/config";

// Protected page. With CHAT_DATOS_ENABLED off it does not exist (404), like
// the endpoint behind it. Which data the chat reads is decided by the server
// from the session, never by this page.
export default async function ChatDatosPage() {
  if (!isChatDatosEnabled()) notFound();
  await requireUser();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 sm:px-6">
      <h1 className="sr-only">Chateá con tus datos</h1>
      <ChatDatosChat />
    </main>
  );
}
