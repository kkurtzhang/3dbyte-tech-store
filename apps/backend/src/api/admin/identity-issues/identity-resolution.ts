export type MergeCandidate = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  created_at?: Date | string | null;
  provider_count: number;
  activity_count: number;
};

const toTimestamp = (value?: Date | string | null): number => {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
};

export const selectCanonicalCustomer = (
  candidates: MergeCandidate[],
): MergeCandidate => {
  if (!candidates.length) {
    throw new Error("At least one merge candidate is required");
  }

  return [...candidates].sort(
    (left, right) =>
      right.provider_count - left.provider_count ||
      right.activity_count - left.activity_count ||
      toTimestamp(left.created_at) - toTimestamp(right.created_at) ||
      left.id.localeCompare(right.id),
  )[0];
};

