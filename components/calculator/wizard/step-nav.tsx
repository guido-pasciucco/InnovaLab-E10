import Link from "next/link";

type StepNavProps = {
  previous?: string;
  next?: string;
};

const BASE =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[14px] px-4 py-2 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:w-auto sm:min-w-36";

const PREVIOUS = `${BASE} border border-brand-green-600 bg-surface text-brand-green-700 hover:bg-brand-green-50`;

const NEXT = `${BASE} bg-action-primary text-on-action-primary hover:bg-action-primary-hover`;

// Links, not buttons: moving between steps is navigation. The missing side is
// left out, so the first and last screens show a single button.
export function StepNav({ previous, next }: StepNavProps) {
  return (
    <nav
      aria-label="Navegación entre pasos"
      className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between"
    >
      {previous ? (
        <Link href={previous} className={PREVIOUS}>
          Anterior
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link href={next} className={NEXT}>
          Siguiente
        </Link>
      )}
    </nav>
  );
}
