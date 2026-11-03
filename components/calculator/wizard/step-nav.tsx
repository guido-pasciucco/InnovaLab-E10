import Link from "next/link";

// "Siguiente" is either a link (`next`) or a form submit that runs a Server
// Action (`nextAction`): the step saves its progress, then the action
// redirects. Never both.
type StepNavProps = {
  previous?: string;
} & (
  | { next?: string; nextAction?: never }
  | { next?: never; nextAction: () => Promise<void> }
);

const BASE =
  "inline-flex min-h-11 w-full items-center justify-center rounded-[14px] px-4 py-2 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:w-auto sm:min-w-36";

const PREVIOUS = `${BASE} text-brand-green-700 hover:bg-brand-green-50`;

const NEXT = `${BASE} sm:flex-1 bg-action-primary text-on-action-primary hover:bg-action-primary-hover`;

// Links, not buttons: moving between steps is navigation, except when the
// step must save progress first (`nextAction`, a form submit). The missing side is
// left out, so the first and last screens show a single button.
export function StepNav({ previous, next, nextAction }: StepNavProps) {
  return (
    <nav
      aria-label="Navegación entre pasos"
      className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:gap-4"
    >
      {previous ? (
        <Link href={previous} className={PREVIOUS}>
          Anterior
        </Link>
      ) : (
        <span />
      )}
      {nextAction ? (
        <form action={nextAction} className="contents">
          <button type="submit" className={NEXT}>
            Siguiente
          </button>
        </form>
      ) : (
        next && (
          <Link href={next} className={NEXT}>
            Siguiente
          </Link>
        )
      )}
    </nav>
  );
}
