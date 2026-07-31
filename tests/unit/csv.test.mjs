import { describe, it, expect } from 'vitest';
import { parseCSV } from '../../src/lib/csv.js';

/* ==========================================================================
   Unit Tests: src/lib/csv.js — RFC 4180 CSV Parser
   --------------------------------------------------------------------------
   Covers the parser extracted from ExporterModal's CSV import:
     • Basic rows and fields
     • Quoted fields containing commas
     • Escaped quotes ("") inside quoted fields
     • Multiline fields (newlines inside quotes)
     • BOM stripping
     • CRLF and bare-CR row terminators
     • Trailing-newline flush behavior (no phantom empty row)
     • Edge cases (empty input, empty fields, blank lines)
   ========================================================================== */

describe('parseCSV — RFC 4180 parsing', () => {
  it('parses simple rows into arrays of fields', () => {
    expect(parseCSV('a,b,c\nd,e,f')).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
    ]);
  });

  it('handles quoted fields containing commas', () => {
    expect(parseCSV('"Pizza, Margherita",2,foo\n"Burger, Cheeseburger",1,bar')).toEqual([
      ['Pizza, Margherita', '2', 'foo'],
      ['Burger, Cheeseburger', '1', 'bar'],
    ]);
  });

  it('handles escaped quotes (double "") inside quoted fields', () => {
    expect(parseCSV('"He said ""hello""",1')).toEqual([['He said "hello"', '1']]);
  });

  it('handles multiline fields (newlines inside quotes)', () => {
    expect(parseCSV('"line1\nline2",x')).toEqual([['line1\nline2', 'x']]);
  });

  it('strips a UTF-8 BOM prefix', () => {
    expect(parseCSV('\uFEFFa,b\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('handles CRLF line endings as a single row terminator', () => {
    expect(parseCSV('a,b\r\nc,d\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('handles bare CR line endings', () => {
    expect(parseCSV('a,b\rc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('does not emit a phantom empty row after a trailing newline', () => {
    expect(parseCSV('a,b\nc,d\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('returns an empty array for empty input', () => {
    expect(parseCSV('')).toEqual([]);
  });

  it('returns a single empty-field row for newline-only input', () => {
    // Verbatim parser behavior: the newline terminates one empty row.
    // The component's import handler tolerates this (blank labels are skipped).
    expect(parseCSV('\n')).toEqual([['']]);
  });

  it('preserves empty fields between commas', () => {
    expect(parseCSV('a,,c\n,,')).toEqual([
      ['a', '', 'c'],
      ['', '', ''],
    ]);
  });

  it('keeps whitespace inside quoted fields intact', () => {
    expect(parseCSV('"  spaced  ",1')).toEqual([['  spaced  ', '1']]);
  });

  it('combines quoting, escaping, and multiline in a realistic import', () => {
    const csv = [
      'Label,Description,Weight,Color',
      '"Movie Night ""Oscar""",Rent "the" film,3,#ff0000',
      '"BBQ,\n""smoky"" ribs",Cook slow,2,#00ff00',
    ].join('\n');

    expect(parseCSV(csv)).toEqual([
      ['Label', 'Description', 'Weight', 'Color'],
      ['Movie Night "Oscar"', 'Rent the film', '3', '#ff0000'],
      ['BBQ,\n"smoky" ribs', 'Cook slow', '2', '#00ff00'],
    ]);
  });
});
