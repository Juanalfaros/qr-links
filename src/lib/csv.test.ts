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
});
