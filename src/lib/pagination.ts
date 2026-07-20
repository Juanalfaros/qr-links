export const PAGE_SIZE = 20;

export function getPageFromSearchParams(searchParams: URLSearchParams): number {
  const page = Number(searchParams.get('page'));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function getRange(page: number, pageSize: number = PAGE_SIZE): [number, number] {
  const from = (page - 1) * pageSize;
  return [from, from + pageSize - 1];
}
