import Link from "next/link";

import type { SupplierNotice, TenderNotice } from "@/lib/services/tenders";

// Panel notices (RN-24): the only channel for tender notices. The app sends no
// email, WhatsApp or SMS for them.

const itemClass = "rounded-2xl border border-border-default bg-surface p-4 text-sm text-fg";
const linkClass = "font-semibold text-brand-green-700 underline";

function NoticeList({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby="avisos" className="space-y-3">
      <h2 id="avisos" className="text-lg font-bold text-fg">
        {title}
      </h2>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

export function TenderNotices({ notices }: { notices: TenderNotice[] }) {
  if (notices.length === 0) return null;
  return (
    <NoticeList title="Avisos de tus licitaciones">
      {notices.map((notice) => (
        <li key={`${notice.kind}-${notice.tenderId}`} className={itemClass}>
          {notice.kind === "no_offers" ? (
            <>
              <strong>Licitación N° {notice.number}:</strong> terminó la primera ronda y no hubo ofertas para{" "}
              {notice.items.join(", ")}.{" "}
            </>
          ) : notice.isVoid ? (
            <>
              <strong>Licitación N° {notice.number}:</strong> cerró sin ofertas y quedó desierta.{" "}
            </>
          ) : (
            <>
              <strong>Licitación N° {notice.number}:</strong> cerró y el cuadro comparativo está listo.{" "}
            </>
          )}
          <Link href={`/licitaciones/${notice.tenderId}`} className={linkClass}>
            Ver licitación
          </Link>
        </li>
      ))}
    </NoticeList>
  );
}

function supplierText(notice: SupplierNotice): React.ReactNode {
  switch (notice.kind) {
    case "round":
      return `empezó la ronda ${notice.round} de ${notice.roundCount} de la licitación N° ${notice.number}, con un nuevo precio objetivo.`;
    case "negotiation":
      return (
        <>
          quiere negociar con vos por la licitación N° {notice.number}. Contacto: <strong>{notice.contact}</strong>
        </>
      );
    case "thank_you":
      return `te agradece por participar en la licitación N° ${notice.number}.`;
    case "closed":
      return `cerró la licitación N° ${notice.number}.`;
    case "cancelled":
      return `canceló la licitación N° ${notice.number}.`;
  }
}

export function SupplierNotices({ notices }: { notices: SupplierNotice[] }) {
  if (notices.length === 0) return null;
  return (
    <NoticeList title="Avisos">
      {notices.map((notice) => (
        <li key={`${notice.kind}-${notice.tenderId}`} className={itemClass}>
          <strong>{notice.ownerName}</strong> {supplierText(notice)}{" "}
          <Link href={`/proveedor/licitaciones/${notice.tenderId}`} className={linkClass}>
            Ver licitación
          </Link>
        </li>
      ))}
    </NoticeList>
  );
}
