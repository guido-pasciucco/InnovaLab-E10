import ResetPasswordForm from "./reset-password-form";
import Link from "next/link";

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-center text-2xl font-bold text-gray-900">Reset password</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your email to receive a password reset link
        </p>
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
