import { TexasMessage } from './message';

export interface Replay extends TexasMessage {
  start: boolean; // true indicates start replay, false indicates stop replay
}