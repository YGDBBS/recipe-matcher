// Unit conversion utilities for the enhanced pantry system

export type UnitType = 'weight' | 'volume' | 'count' | 'length';

export interface Unit {
  name: string;
  symbol: string;
  type: UnitType;
  baseMultiplier: number; // Multiplier to convert to base unit
  baseUnit: string; // The base unit for this type
}

// Base units: g (grams), ml (milliliters), piece (count), cm (centimeters)
export const UNITS: Record<string, Unit> = {
  // Weight units (base: grams)
  'mg': { name: 'milligram', symbol: 'mg', type: 'weight', baseMultiplier: 0.001, baseUnit: 'g' },
  'g': { name: 'gram', symbol: 'g', type: 'weight', baseMultiplier: 1, baseUnit: 'g' },
  'kg': { name: 'kilogram', symbol: 'kg', type: 'weight', baseMultiplier: 1000, baseUnit: 'g' },
  'oz': { name: 'ounce', symbol: 'oz', type: 'weight', baseMultiplier: 28.3495, baseUnit: 'g' },
  'lb': { name: 'pound', symbol: 'lb', type: 'weight', baseMultiplier: 453.592, baseUnit: 'g' },
  'ton': { name: 'ton', symbol: 'ton', type: 'weight', baseMultiplier: 1000000, baseUnit: 'g' },

  // Volume units (base: milliliters)
  'ml': { name: 'milliliter', symbol: 'ml', type: 'volume', baseMultiplier: 1, baseUnit: 'ml' },
  'l': { name: 'liter', symbol: 'l', type: 'volume', baseMultiplier: 1000, baseUnit: 'ml' },
  'dl': { name: 'deciliter', symbol: 'dl', type: 'volume', baseMultiplier: 100, baseUnit: 'ml' },
  'fl oz': { name: 'fluid ounce', symbol: 'fl oz', type: 'volume', baseMultiplier: 29.5735, baseUnit: 'ml' },
  'cup': { name: 'cup', symbol: 'cup', type: 'volume', baseMultiplier: 236.588, baseUnit: 'ml' },
  'pint': { name: 'pint', symbol: 'pint', type: 'volume', baseMultiplier: 473.176, baseUnit: 'ml' },
  'quart': { name: 'quart', symbol: 'quart', type: 'volume', baseMultiplier: 946.353, baseUnit: 'ml' },
  'gallon': { name: 'gallon', symbol: 'gallon', type: 'volume', baseMultiplier: 3785.41, baseUnit: 'ml' },

  // Count units (base: piece)
  'piece': { name: 'piece', symbol: 'piece', type: 'count', baseMultiplier: 1, baseUnit: 'piece' },
  'each': { name: 'each', symbol: 'each', type: 'count', baseMultiplier: 1, baseUnit: 'piece' },
  'item': { name: 'item', symbol: 'item', type: 'count', baseMultiplier: 1, baseUnit: 'piece' },

  // Length units (base: centimeters)
  'mm': { name: 'millimeter', symbol: 'mm', type: 'length', baseMultiplier: 0.1, baseUnit: 'cm' },
  'cm': { name: 'centimeter', symbol: 'cm', type: 'length', baseMultiplier: 1, baseUnit: 'cm' },
  'm': { name: 'meter', symbol: 'm', type: 'length', baseMultiplier: 100, baseUnit: 'cm' },
  'in': { name: 'inch', symbol: 'in', type: 'length', baseMultiplier: 2.54, baseUnit: 'cm' },
  'ft': { name: 'foot', symbol: 'ft', type: 'length', baseMultiplier: 30.48, baseUnit: 'cm' },
  'yd': { name: 'yard', symbol: 'yd', type: 'length', baseMultiplier: 91.44, baseUnit: 'cm' },
};

// Get all units by type
export function getUnitsByType(type: UnitType): Unit[] {
  return Object.values(UNITS).filter(unit => unit.type === type);
}

// Get unit by symbol
export function getUnit(symbol: string): Unit | undefined {
  return UNITS[symbol.toLowerCase()];
}

// Convert between units of the same type
export function convertUnit(value: number, fromUnit: string, toUnit: string): number | null {
  const from = getUnit(fromUnit);
  const to = getUnit(toUnit);

  if (!from || !to || from.type !== to.type) {
    return null; // Cannot convert between different types or invalid units
  }

  // Convert to base unit, then to target unit
  const baseValue = value * from.baseMultiplier;
  return baseValue / to.baseMultiplier;
}

// Check if two units are compatible (same type)
export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  const u1 = getUnit(unit1);
  const u2 = getUnit(unit2);
  return !!(u1 && u2 && u1.type === u2.type);
}

// Get common units for ingredient suggestions
export function getCommonUnitsForIngredient(ingredientName: string): Unit[] {
  const name = ingredientName.toLowerCase();
  
  // Weight-based ingredients
  if (name.includes('flour') || name.includes('sugar') || name.includes('salt') || 
      name.includes('butter') || name.includes('cheese') || name.includes('meat') ||
      name.includes('chicken') || name.includes('beef') || name.includes('pork')) {
    return getUnitsByType('weight');
  }
  
  // Volume-based ingredients
  if (name.includes('milk') || name.includes('oil') || name.includes('vinegar') ||
      name.includes('juice') || name.includes('broth') || name.includes('sauce')) {
    return getUnitsByType('volume');
  }
  
  // Count-based ingredients
  if (name.includes('egg') || name.includes('onion') || name.includes('tomato') ||
      name.includes('potato') || name.includes('apple') || name.includes('banana') ||
      name.includes('garlic') || name.includes('lemon') || name.includes('lime')) {
    return getUnitsByType('count');
  }
  
  // Default to count for unknown ingredients
  return getUnitsByType('count');
}

// Validate unit for ingredient
export function validateUnitForIngredient(ingredientName: string, unit: string): boolean {
  const commonUnits = getCommonUnitsForIngredient(ingredientName);
  return commonUnits.some(u => u.symbol === unit);
}

// Get unit type from unit symbol
export function getUnitType(unit: string): UnitType | null {
  const unitObj = getUnit(unit);
  return unitObj ? unitObj.type : null;
}
