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
    <main className="px-4 py-10 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-fg sm:text-4xl">Chateá con tus datos</h1>
          <p className="mt-2 max-w-xl text-base text-fg-muted">
            Hacé preguntas en tus palabras y recibí la respuesta con los números de tu negocio.
          </p>
        </header>

        <ChatDatosChat />
      </div>
    </main>
  );
}
