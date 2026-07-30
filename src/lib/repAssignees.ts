// Rep assignee names.
export const REP_ASSIGNEES = [
  'Marcus Centeno',
] as const;

export type RepAssignee = typeof REP_ASSIGNEES[number];

// Best-effort auto-assign based on the signed-in user's email/display name.
// Falls back to empty string so the UI still asks the user to pick.
export function guessAssigneeFromUser(email?: string | null, displayName?: string | null): string {
  const hay = `${email ?? ''} ${displayName ?? ''}`.toLowerCase();
  const match = REP_ASSIGNEES.find((name) => {
    const first = name.split(' ')[0].toLowerCase();
    const last = name.split(' ').slice(-1)[0].toLowerCase();
    return hay.includes(first) || hay.includes(last);
  });
  return match ?? '';
}
