export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';
  rank: string; // 'A', '2'-'10', 'J', 'Q', 'K', 'Joker'
  value: number; // point value (0-10)
  id: string; // unique card id for rendering keys and identification
}

export interface Player {
  id: string; // custom client-side unique id or socket id
  name: string;
  socketId: string;
  hand: Card[];
  score: number; // cumulative score
  roundScore: number; // score for the current round
  isHost: boolean;
  isReady: boolean;
  isEliminated: boolean;
}

export type TurnPhase = 'DISCARD' | 'DRAW' | 'ROUND_END';

export interface GameRoomState {
  roomId: string;
  players: Player[];
  drawPile: Card[];
  discardPile: Card[];
  currentTurnIndex: number;
  turnPhase: TurnPhase;
  gameStarted: boolean;
  isGameOver: boolean;
  winnerId: string | null;
  roundNumber: number;
  history: string[];
  lastDiscardedBy: string | null;
  prevTopDiscardBeforeTurn: Card | null;
  skipDrawApplied: boolean;
}

// Personalized game state sent to a specific player
export interface ClientGameState {
  roomId: string;
  myId: string;
  players: {
    id: string;
    name: string;
    score: number;
    roundScore: number;
    cardCount: number;
    isHost: boolean;
    isReady: boolean;
    isEliminated: boolean;
    isCurrentTurn: boolean;
    revealHand?: Card[]; // Revealed at the end of a round
  }[];
  myHand: Card[];
  currentTurnId: string | null;
  turnPhase: TurnPhase;
  topDiscardCard: Card | null;
  drawPileCount: number;
  gameStarted: boolean;
  isGameOver: boolean;
  winnerId: string | null;
  roundNumber: number;
  history: string[];
}
