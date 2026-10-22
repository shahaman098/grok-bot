export const HOST_LINES = [
  "Less small talk. More shipping.",
  "Your next collaborator is somewhere in this room. Probably looking for a charger.",
  "Unlike your side projects, this introduction has a next step.",
] as const;

export const PERSONAL_JOKES = [
  { id: "tabs", text: "My superpower? Turning one good idea into 47 open tabs." },
  { id: "final", text: "My project is called final_final. This is not its final form." },
  { id: "coffee", text: "I turn coffee into ambitious project timelines." },
] as const;
export type JokeId = (typeof PERSONAL_JOKES)[number]["id"];
export function jokeText(id: string | null | undefined): string | null {
  return PERSONAL_JOKES.find((j) => j.id === id)?.text ?? null;
}
