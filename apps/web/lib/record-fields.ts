/** Read a row field by snake_case key, matching Go JSON (PascalCase) and camelCase payloads. */
export function pickRowField(row: Record<string, unknown>, key: string): unknown {
  const direct = row[key];
  if (direct !== undefined && direct !== null) return direct;

  const camel = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  const pascal = camel.charAt(0).toUpperCase() + camel.slice(1);
  const fromCamel = row[camel];
  if (fromCamel !== undefined && fromCamel !== null) return fromCamel;
  const fromPascal = row[pascal];
  if (fromPascal !== undefined && fromPascal !== null) return fromPascal;

  // Go struct fields with acronym suffixes (e.g. PriceKES, AmountKES).
  const acronymPascal = pascal.replace(/Kes$/i, "KES").replace(/Id$/i, "ID");
  const fromAcronym = row[acronymPascal];
  if (fromAcronym !== undefined && fromAcronym !== null) return fromAcronym;

  return undefined;
}
