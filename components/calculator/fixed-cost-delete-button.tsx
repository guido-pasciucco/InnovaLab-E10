import { Trash2 } from "lucide-react";

type FixedCostDeleteButtonProps = {
  // Names the row it removes, so a screen reader can tell the buttons apart.
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

// 44px square: the touch target stays comfortable on the mobile layout.
export function FixedCostDeleteButton({
  label,
  onClick,
  disabled,
}: FixedCostDeleteButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-11 items-center justify-center rounded-md text-gray-500 transition-colors disabled:pointer-events-none disabled:opacity-40 hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green-600"
    >
      <Trash2 aria-hidden="true" className="size-5" />
    </button>
  );
}
