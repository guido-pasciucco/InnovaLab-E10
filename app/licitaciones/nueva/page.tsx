import Link from "next/link";

import { PublishTenderForm } from "@/components/tenders/publish-tender-form";
import { Card, PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";
import { getTenderFormDataService } from "@/lib/services/tenders";

const linkClass = "font-semibold text-brand-green-700 underline";

// Publish a tender (RN-01 to RN-05).
export default async function NewTenderPage() {
  const user = await requireUser();
  const data = await getTenderFormDataService(user.id);
  const links = [{ href: "/licitaciones", label: "Volver a licitaciones" }];

  if (data.activeTender) {
    return (
      <PageShell title="Nueva licitación" links={links}>
        <Card>
          <p className="text-sm text-fg">
            Ya tenés en curso la{" "}
            <Link href={`/licitaciones/${data.activeTender.id}`} className={linkClass}>
              licitación N° {data.activeTender.number}
            </Link>
            . Por ahora puede haber una sola por vez: esperá a que cierre o cancelala para publicar otra.
          </p>
        </Card>
      </PageShell>
    );
  }

  if (data.supplies.length === 0 || data.suppliers.length === 0) {
    return (
      <PageShell title="Nueva licitación" links={links}>
        <Card>
          {data.supplies.length === 0 && (
            <p className="text-sm text-fg">
              Solo se licitan insumos de tu catálogo.{" "}
              <Link href="/insumos" className={linkClass}>
                Cargá tus insumos
              </Link>{" "}
              primero.
            </p>
          )}
          {data.suppliers.length === 0 && (
            <p className="text-sm text-fg">
              Solo participan proveedores registrados con vos.{" "}
              <Link href="/proveedores" className={linkClass}>
                Invitá a tus proveedores
              </Link>{" "}
              primero.
            </p>
          )}
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      eyebrow="Licitaciones"
      title="Nueva licitación"
      description="Elegí los insumos, cuánto necesitás y el precio máximo. Tus proveedores ofertan por rondas sin ver los precios de los demás."
      links={links}
    >
      <PublishTenderForm supplies={data.supplies} suppliers={data.suppliers} />
    </PageShell>
  );
}
