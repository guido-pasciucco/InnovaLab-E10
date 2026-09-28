import ResetPasswordForm from "./reset-password-form";
import Link from "next/link";
import { linkErrorMessage } from "./link-error";

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// /auth/confirm sends users back here with `?error=<code>` when the email
// link could not be exchanged for a session.
export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const linkError = linkErrorMessage((await searchParams).error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-center text-2xl font-bold text-gray-900">Reset password</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your email to receive a password reset link
        </p>
        {linkError && (
          <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-center text-sm text-red-700">
            {linkError}
          </p>
        )}
        <div className="mt-6">
          <ResetPasswordForm />
        </div>
        <p className="mt-6 text-center text-sm text-gray-600">
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
