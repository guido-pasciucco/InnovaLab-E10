import { Trash2 } from "lucide-react";

type CostLineDeleteButtonProps = {
  // Names the row it removes, so a screen reader can tell the buttons apart.
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

// 44px square: the touch target stays comfortable on the mobile layout.
export function CostLineDeleteButton({
  label,
  onClick,
  disabled,
}: CostLineDeleteButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-11 items-center justify-center rounded-md text-fg-muted transition-colors disabled:pointer-events-none disabled:opacity-40 hover:bg-danger-subtle hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <Trash2 aria-hidden="true" className="size-5" />
    </button>
  );
}
