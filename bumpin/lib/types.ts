export type PublicAttendee = {
  membershipId: string;
  displayName: string;
  linkedinUrl: string | null;
  avatarSeed: string;
  avatarUrl?: string | null;
  building: string | null;
  canHelpWith?: string | null;
  lookingFor: string | null;
  displayLat: number;
  displayLng: number;
  isSelf?: boolean;
};

export type MatchCategory = "mutual" | "one-way" | "shared-interest" | "search";
export type MatchEvidence = {
  profileField?: "canHelpWith" | "building" | "lookingFor";
  direction: "they-help-you" | "you-help-them" | "shared-interest" | "search";
  terms: string[];
  yourExcerpt: string;
  theirExcerpt: string;
};
export type RecommendResult = {
  membershipId: string;
  displayName: string;
  reason: string;
  score: number;
  source: "grok" | "rules";
  category: MatchCategory;
  evidence: MatchEvidence[];
  conversationStarter: string;
  suggestedTask: string;
};
export type StagePerson = {
  displayName: string;
  avatarSeed: string;
  building: string | null;
  canHelpWith: string | null;
  lookingFor: string | null;
};
export type StageSnapshot = {
  people: [StagePerson, StagePerson];
  category: MatchCategory;
  evidence: MatchEvidence[];
  suggestedTask: string;
  jokes: [string | null, string | null];
};
export type Connection = {
  id: string;
  status: "pending" | "accepted" | "declined" | "withdrawn";
  role: "sender" | "recipient";
  revision: number;
  ownStageApproved: boolean;
  otherStageApproved: boolean;
  ownJokeId: string | null;
  snapshot: StageSnapshot & { conversationStarter: string };
};
export type ConnectionAction = {
  action:
    | "accept"
    | "decline"
    | "withdraw"
    | "chooseJoke"
    | "approveStage"
    | "revokeStage";
  jokeId?: string | null;
  expectedRevision?: number;
};
