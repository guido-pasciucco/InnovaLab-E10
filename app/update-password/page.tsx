import { requireUser } from "@/lib/auth/require-user";
import UpdatePasswordForm from "./update-password-form";

// The form only makes sense inside a recovery session, which /auth/confirm
// creates. Without one the page sends the user back to request a new link
// instead of rendering a form whose submission is doomed to fail.
export default async function UpdatePasswordPage() {
  await requireUser({ redirectTo: "/reset-password?error=AUTH_SESSION_MISSING" });

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-center text-2xl font-bold text-gray-900">Set new password</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Choose a new password for your account
        </p>
        <div className="mt-6">
          <UpdatePasswordForm />
        </div>
      </div>
    </main>
  );
}
