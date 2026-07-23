import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';

describe('toCsv', () => {
  it('joins headers and rows with CRLF', () => {
    expect(toCsv(['a', 'b'], [['1', '2']])).toBe('a,b\r\n1,2');
  });

  it('quotes values containing commas, quotes, or newlines', () => {
    expect(toCsv(['x'], [['hello, "world"'], ['line\nbreak']])).toBe('x\r\n"hello, ""world"""\r\n"line\nbreak"');
  });

  it('renders null as an empty cell', () => {
    expect(toCsv(['x'], [[null]])).toBe('x\r\n');
  });

  it('neutralizes values that look like spreadsheet formulas', () => {
    expect(toCsv(['x'], [['=HYPERLINK("http://evil.test")']])).toBe('x\r\n"\'=HYPERLINK(""http://evil.test"")"');
    expect(toCsv(['x'], [['+1234'], ['-1234']])).toBe("x\r\n'+1234\r\n'-1234");
  });

  it('leaves values that merely contain formula characters mid-string alone', () => {
    expect(toCsv(['x'], [['5+3=8']])).toBe('x\r\n5+3=8');
  });
});
