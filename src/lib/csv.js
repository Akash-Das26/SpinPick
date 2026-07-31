/**
 * Proper RFC 4180 CSV parser.
 * Handles: quoted fields, escaped quotes (""), commas/newlines inside quotes,
 * and BOM-prefixed files. Returns an array of rows (arrays of strings).
 *
 * @param {string} text - Raw CSV file contents.
 * @returns {string[][]} Array of rows, each an array of field strings.
 */
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  // Strip UTF-8 BOM
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        // Escaped quote ("") inside a quoted field → literal quote
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      // Handle CRLF and bare CR as row terminators
      if (ch === '\r' && input[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  // Flush the final field/row (if any)
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}
