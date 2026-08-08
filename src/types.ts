export interface PoemAnnotation {
  term: string;
  text: string;
}

export interface PoemCollation {
  [key: string]: string;
}

export interface Poem {
  id: string;
  title: string;
  volume: string;
  group: string;
  body: string[];
  collation: PoemCollation | null;
  annotations: PoemAnnotation[];
}

export interface UserState {
  counts: { [key: string]: number };
  notes: { [key: string]: string };
  favorites?: { [key: string]: boolean };
}
