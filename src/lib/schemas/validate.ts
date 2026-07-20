export function firstErrorMessage(result: { error?: { issues: { message: string }[] } }): string {
  return result.error?.issues[0]?.message ?? 'Invalid request body';
}
