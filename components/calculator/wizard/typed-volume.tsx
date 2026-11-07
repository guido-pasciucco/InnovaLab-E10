"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

// The volume being typed in step 1, shared with the live cost card that the
// wizard shell renders for every step. `null` means no step is reporting one,
// so the card falls back to the persisted volume; `undefined` means the field
// is empty or invalid and the card shows a dash.
type TypedVolume = number | undefined | null;

const TypedVolumeContext = createContext<TypedVolume>(null);
const SetTypedVolumeContext = createContext<Dispatch<
  SetStateAction<TypedVolume>
> | null>(null);

export function TypedVolumeProvider({ children }: { children: ReactNode }) {
  const [typedVolume, setTypedVolume] = useState<TypedVolume>(null);

  return (
    <SetTypedVolumeContext.Provider value={setTypedVolume}>
      <TypedVolumeContext.Provider value={typedVolume}>
        {children}
      </TypedVolumeContext.Provider>
    </SetTypedVolumeContext.Provider>
  );
}

export function useTypedVolume(): TypedVolume {
  return useContext(TypedVolumeContext);
}

// Called by the step that owns a volume field. Stops reporting on unmount, so
// the other steps show the persisted volume again.
export function useReportTypedVolume(volume: number | undefined): void {
  const setTypedVolume = useContext(SetTypedVolumeContext);

  useEffect(() => {
    setTypedVolume?.(volume);
  }, [setTypedVolume, volume]);

  useEffect(() => {
    return () => setTypedVolume?.(null);
  }, [setTypedVolume]);
}
