import LoginForm from "./login-form";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const notice = (await searchParams).notice;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-center text-2xl font-bold text-gray-900">Iniciar sesión</h1>
        {notice === "signed-out" && (
          <p role="status" className="mt-2 text-center text-sm text-gray-600">Sesión cerrada</p>
        )}
        <p className="mt-2 text-center text-sm text-gray-600">
          Ingrese sus credenciales para continuar
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
