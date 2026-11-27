import Link from "next/link";

import { PublishTenderForm } from "@/components/tenders/publish-tender-form";
import { Card, PageShell } from "@/components/ui/page-shell";
import { requireUser } from "@/lib/auth/require-user";
import { getTenderFormDataService } from "@/lib/services/tenders";

const linkClass = "font-semibold text-brand-green-700 underline";

// Publish a tender (RN-01 to RN-05), or save it as a draft to publish later.
export default async function NewTenderPage() {
  const user = await requireUser();
  const data = await getTenderFormDataService(user.id);
  const links = [{ href: "/licitaciones", label: "Volver a licitaciones" }];

  if (data.supplies.length === 0) {
    return (
      <PageShell title="Nueva licitación" links={links}>
        <Card>
          <p className="text-sm text-fg">
            Solo se licitan insumos de tu catálogo.{" "}
            <Link href="/supplies" className={linkClass}>
              Cargá tus insumos
            </Link>{" "}
            primero.
          </p>
        </Card>
      </PageShell>
    );
  }

  // The form is always available to load and save a draft; publishing waits
  // for the active tender to end (RN-03). Every registered supplier may
  // participate, so there is no supplier selection (#309).
  const publishBlocked = data.activeTender ? (
    <p>
      Ya tenés en curso la{" "}
      <Link href={`/licitaciones/${data.activeTender.id}`} className={linkClass}>
        licitación N° {data.activeTender.number}
      </Link>
      . Por ahora puede haber una sola por vez: guardá el borrador y publicalo cuando cierre o la canceles.
    </p>
  ) : null;

  return (
    <PageShell
      eyebrow="Licitaciones"
      title="Nueva licitación"
      description="Elegí los insumos, cuánto necesitás y el precio máximo. Los proveedores registrados ofertan por rondas sin ver los precios de los demás."
      links={links}
    >
      <PublishTenderForm supplies={data.supplies} draft={data.draft} publishBlocked={publishBlocked} />
    </PageShell>
  );
}
