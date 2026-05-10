// packages/utils/converter.ts

type UnitType = 'kg' | 'ton' | 'lb' | 'celsius' | 'fahrenheit' | 'meters' | 'km';

interface ConversionRule {
  from: UnitType;
  to: UnitType;
  factor: number;
  offset?: number; // Para temperaturas como C a F
}

const CONVERSION_RULES: ConversionRule[] = [
  { from: 'ton', to: 'kg', factor: 1000 },
  { from: 'lb', to: 'kg', factor: 0.453592 },
  { from: 'fahrenheit', to: 'celsius', factor: 5/9, offset: -32 },
  { from: 'km', to: 'meters', factor: 1000 }
];

export const standardize = (value: number, fromUnit: string): { value: number, unit: string } => {
  const rule = CONVERSION_RULES.find(r => r.from === fromUnit.toLowerCase());
  
  if (!rule) return { value, unit: fromUnit }; // Si no hay regla, se guarda como viene

  const standardizedValue = rule.offset 
    ? (value + rule.offset) * rule.factor 
    : value * rule.factor;

  return { value: standardizedValue, unit: rule.to };
};

export const formatForDisplay = (value: number, toUnit: string, precision: number = 2): string => {
  // Aquí harías el proceso inverso si fuera necesario
  // Por ahora, solo formateamos el número para que se vea limpio
  return `${value.toFixed(precision)} ${toUnit}`;
};