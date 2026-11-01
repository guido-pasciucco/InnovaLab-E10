import Link from "next/link";

import { emailField } from "@/lib/schemas/auth/fields";

import SignupForm from "./signup-form";

type SignupPageProps = {
  searchParams: Promise<{
    email?: string | string[];
  }>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const parsedEmail = emailField.safeParse(firstParam(params.email));

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-center text-2xl font-bold text-gray-900">Create account</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign up to get started
        </p>
        <div className="mt-6">
          <SignupForm defaultEmail={parsedEmail.success ? parsedEmail.data : undefined} />
        </div>
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
