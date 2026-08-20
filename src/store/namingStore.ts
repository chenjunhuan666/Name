import type {
  Bazi,
  BaziAnalysis,
  BirthInfo,
  CalendarResult,
  FavoriteNameRecord,
  GeneratedName,
  Gender,
  InputMode,
  NamingHistoryRecord,
  RecentNameViewRecord,
} from '../types';
import {
  MAX_NAMING_HISTORY,
  MAX_RECENT_VIEWS,
} from '../core/storage/namingPersistence';

export interface NamingState {
  inputMode: InputMode;
  surname: string;
  gender: Gender;
  birthInfo?: BirthInfo;
  calendarResult?: CalendarResult;
  bazi?: Bazi;
  analysis?: BaziAnalysis;
  generatedNames: GeneratedName[];
  favorites: FavoriteNameRecord[];
  namingHistory: NamingHistoryRecord[];
  recentViews: RecentNameViewRecord[];
}

export type NamingAction =
  | { type: 'SET_INPUT_MODE'; payload: InputMode }
  | { type: 'SET_SURNAME'; payload: string }
  | { type: 'SET_GENDER'; payload: Gender }
  | { type: 'SET_BIRTH_INFO'; payload: BirthInfo }
  | { type: 'SET_CALENDAR_RESULT'; payload: CalendarResult }
  | { type: 'CLEAR_BIRTH_RESULT' }
  | { type: 'SET_BAZI'; payload: Bazi }
  | { type: 'SET_ANALYSIS'; payload: BaziAnalysis }
  | { type: 'SET_GENERATED_NAMES'; payload: GeneratedName[] }
  | { type: 'TOGGLE_FAVORITE'; payload: FavoriteNameRecord }
  | { type: 'RECORD_NAME_VIEW'; payload: RecentNameViewRecord }
  | { type: 'ADD_NAMING_HISTORY'; payload: NamingHistoryRecord }
  | { type: 'RESTORE_NAMING_HISTORY'; payload: NamingHistoryRecord }
  | { type: 'CLEAR_NAMING_HISTORY' }
  | { type: 'CLEAR_RECENT_VIEWS' }
  | { type: 'RESET' };

export const initialNamingState: NamingState = {
  inputMode: 'birth',
  surname: '',
  gender: 'male',
  generatedNames: [],
  favorites: [],
  namingHistory: [],
  recentViews: [],
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
    case 'SET_CALENDAR_RESULT':
      return { ...state, calendarResult: action.payload };
    case 'CLEAR_BIRTH_RESULT':
      return {
        ...state,
        birthInfo: undefined,
        calendarResult: undefined,
      };
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
      if (
        state.favorites.some(
          ({ name }) => name.id === action.payload.name.id,
        )
      ) {
        return {
          ...state,
          favorites: state.favorites.filter(
            ({ name }) => name.id !== action.payload.name.id,
          ),
        };
      }

      return {
        ...state,
        favorites: [action.payload, ...state.favorites],
      };
    case 'RECORD_NAME_VIEW':
      return {
        ...state,
        recentViews: [
          action.payload,
          ...state.recentViews.filter(
            ({ name }) => name.id !== action.payload.name.id,
          ),
        ].slice(0, MAX_RECENT_VIEWS),
      };
    case 'ADD_NAMING_HISTORY':
      return {
        ...state,
        namingHistory: [
          action.payload,
          ...state.namingHistory.filter(({ id }) => id !== action.payload.id),
        ].slice(0, MAX_NAMING_HISTORY),
      };
    case 'RESTORE_NAMING_HISTORY':
      return {
        ...state,
        inputMode: action.payload.inputMode,
        surname: action.payload.surname,
        gender: action.payload.gender,
        birthInfo: action.payload.birthInfo,
        calendarResult: action.payload.calendarResult,
        bazi: action.payload.bazi,
        analysis: action.payload.analysis,
        generatedNames: [],
      };
    case 'CLEAR_NAMING_HISTORY':
      return { ...state, namingHistory: [] };
    case 'CLEAR_RECENT_VIEWS':
      return { ...state, recentViews: [] };
    case 'RESET':
      return initialNamingState;
  }
}
