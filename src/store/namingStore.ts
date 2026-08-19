import type {
  Bazi,
  BaziAnalysis,
  BirthInfo,
  GeneratedName,
  Gender,
  InputMode,
} from '../types';

export interface NamingState {
  inputMode: InputMode;
  surname: string;
  gender: Gender;
  birthInfo?: BirthInfo;
  bazi?: Bazi;
  analysis?: BaziAnalysis;
  generatedNames: GeneratedName[];
  favorites: string[];
}

export type NamingAction =
  | { type: 'SET_INPUT_MODE'; payload: InputMode }
  | { type: 'SET_SURNAME'; payload: string }
  | { type: 'SET_GENDER'; payload: Gender }
  | { type: 'SET_BIRTH_INFO'; payload: BirthInfo }
  | { type: 'SET_BAZI'; payload: Bazi }
  | { type: 'SET_ANALYSIS'; payload: BaziAnalysis }
  | { type: 'SET_GENERATED_NAMES'; payload: GeneratedName[] }
  | { type: 'TOGGLE_FAVORITE'; payload: string }
  | { type: 'RESET' };

export const initialNamingState: NamingState = {
  inputMode: 'birth',
  surname: '',
  gender: 'male',
  generatedNames: [],
  favorites: [],
};

export function namingReducer(
  state: NamingState,
  action: NamingAction,
): NamingState {
  switch (action.type) {
    case 'SET_INPUT_MODE':
      return { ...state, inputMode: action.payload };
    case 'SET_SURNAME':
      return { ...state, surname: action.payload };
    case 'SET_GENDER':
      return { ...state, gender: action.payload };
    case 'SET_BIRTH_INFO':
      return { ...state, birthInfo: action.payload };
    case 'SET_BAZI':
      return {
        ...state,
        bazi: action.payload,
        analysis: undefined,
        generatedNames: [],
      };
    case 'SET_ANALYSIS':
      return { ...state, analysis: action.payload };
    case 'SET_GENERATED_NAMES':
      return { ...state, generatedNames: action.payload };
    case 'TOGGLE_FAVORITE':
      return {
        ...state,
        favorites: state.favorites.includes(action.payload)
          ? state.favorites.filter((id) => id !== action.payload)
          : [...state.favorites, action.payload],
      };
    case 'RESET':
      return initialNamingState;
  }
}
