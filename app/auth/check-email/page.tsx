import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#EAFCF1] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Revisá tu correo
          </h1>

          <p className="mt-3 text-sm text-gray-600">
            Te enviamos un enlace de verificación. Abrí tu correo y hacé clic
            en el enlace para activar tu cuenta.
          </p>
        </div>

        <div className="rounded-lg bg-[#D3F5E1] p-4 text-sm text-gray-700">
          Si no encontrás el correo, revisá la carpeta de spam o correo no
          deseado.
        </div>

        <Link
          href="/login"
          className="mt-6 block w-full rounded-lg bg-[#BDEBCF] py-3 text-center font-medium text-gray-900"
        >
          Volver al inicio de sesión
        </Link>
      </div>
    </main>
  );
}