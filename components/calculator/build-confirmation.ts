type ConfirmationData = {
  name: string;
  unit: string;
  volume: number;
};

export function buildConfirmation({ name, unit, volume }: ConfirmationData) {
  return `Vamos a calcular el costo de ${name} en ${unit}, con un volumen de ${volume} por mes.`;
}
