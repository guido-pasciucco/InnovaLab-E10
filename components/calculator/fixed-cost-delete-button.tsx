import { Trash2 } from "lucide-react";

type FixedCostDeleteButtonProps = {
  // Names the row it removes, so a screen reader can tell the buttons apart.
  label: string;
  onClick: () => void;
};

// 44px square: the touch target stays comfortable on the mobile layout.
export function FixedCostDeleteButton({ label, onClick }: FixedCostDeleteButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-danger-subtle hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-600"
    >
      <Trash2 aria-hidden="true" className="size-5" />
    </button>
  );
}
