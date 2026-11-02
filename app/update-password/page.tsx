import UpdatePasswordForm from "./update-password-form";

export default function UpdatePasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-tint px-4">
      <div className="w-full max-w-sm rounded-lg bg-surface p-8 shadow-md">
        <h1 className="text-center text-2xl font-bold text-fg">Set new password</h1>
        <p className="mt-2 text-center text-sm text-fg-muted">
          Choose a new password for your account
        </p>
        <div className="mt-6">
          <UpdatePasswordForm />
        </div>
      </div>
    </main>
  );
}
