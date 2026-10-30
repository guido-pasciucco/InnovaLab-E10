import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function AccountCreatedPage() {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <CheckCircle
            className="mx-auto mb-4 h-16 w-16 text-green-600"
            strokeWidth={1.5}
          />
        </div>

          <h1 className="text-2xl font-bold text-gray-900">
            ¡Cuenta creada!
          </h1>

          <p className="mt-3 text-sm text-gray-600">
            Tu correo fue verificado correctamente y la cuenta ya está activa.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="block w-full rounded-lg bg-[#BDEBCF] py-3 font-medium text-gray-900"
        >
          Ir a configuración inicial
        </Link>
      </div>
    </main>
  );
}