import { Card, Player, GameRoomState, ClientGameState, TurnPhase } from './types';

// Helper to generate a unique card ID
let cardIdCounter = 0;
function generateCardId(): string {
  return `card_${Date.now()}_${cardIdCounter++}`;
}

export function createDeck(useDoubleDeck: boolean): Card[] {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  
  const getCardValue = (rank: string): number => {
    if (rank === 'A') return 1;
    if (['J', 'Q', 'K', '10'].includes(rank)) return 10;
    return parseInt(rank, 10);
  };

  const makeSingleDeck = (): Card[] => {
    const deck: Card[] = [];
    for (const suit of suits) {
      for (const rank of ranks) {
        deck.push({
          id: generateCardId(),
          suit,
          rank,
          value: getCardValue(rank)
        });
      }
    }
    // Add 1 Joker
    deck.push({
      id: generateCardId(),
      suit: 'joker',
      rank: 'Joker',
      value: 0
    });
    return deck;
  };

  if (useDoubleDeck) {
    return [...makeSingleDeck(), ...makeSingleDeck()];
  }
  return makeSingleDeck();
}

export function shuffleDeck(deck: Card[]): Card[] {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}

export function calculateHandValue(hand: Card[]): number {
  return hand.reduce((sum, card) => sum + card.value, 0);
}

export class GameRoom {
  public state: GameRoomState;

  constructor(roomId: string) {
    this.state = {
      roomId,
      players: [],
      drawPile: [],
      discardPile: [],
      currentTurnIndex: 0,
      turnPhase: 'DISCARD',
      gameStarted: false,
      isGameOver: false,
      winnerId: null,
      roundNumber: 1,
      history: [`Room ${roomId} created.`],
      lastDiscardedBy: null,
      prevTopDiscardBeforeTurn: null,
      skipDrawApplied: false
    };
  }

  public addPlayer(id: string, name: string, socketId: string): Player {
    // If player already exists (reconnecting), update socket ID
    const existingPlayer = this.state.players.find(p => p.id === id);
    if (existingPlayer) {
      existingPlayer.socketId = socketId;
      this.state.history.push(`${name} reconnected.`);
      return existingPlayer;
    }

    const isHost = this.state.players.length === 0;
    const newPlayer: Player = {
      id,
      name,
      socketId,
      hand: [],
      score: 0,
      roundScore: 0,
      isHost,
      isReady: isHost, // Host is ready by default
      isEliminated: false
    };
    this.state.players.push(newPlayer);
    this.state.history.push(`${name} joined the room.`);
    return newPlayer;
  }

  public removePlayer(socketId: string): string | null {
    const index = this.state.players.findIndex(p => p.socketId === socketId);
    if (index !== -1) {
      const playerName = this.state.players[index].name;
      const playerId = this.state.players[index].id;

      if (!this.state.gameStarted) {
        // Safe to remove completely if game hasn't started
        const wasHost = this.state.players[index].isHost;
        this.state.players.splice(index, 1);
        this.state.history.push(`${playerName} left the room.`);
        
        // Reassign host if needed
        if (wasHost && this.state.players.length > 0) {
          this.state.players[0].isHost = true;
          this.state.players[0].isReady = true;
          this.state.history.push(`${this.state.players[0].name} is the new host.`);
        }
      } else {
        // If game started, we just log that they disconnected. They can reconnect.
        this.state.history.push(`${playerName} disconnected.`);
      }
      return playerId;
    }
    return null;
  }

  public startGame(): void {
    if (this.state.players.length < 2) {
      throw new Error('Need at least 2 players to start.');
    }
    this.state.gameStarted = true;
    this.state.isGameOver = false;
    this.state.winnerId = null;
    this.state.roundNumber = 1;
    
    // Reset all player scores
    this.state.players.forEach(p => {
      p.score = 0;
      p.roundScore = 0;
      p.isEliminated = false;
    });

    this.state.history.push('The game has started!');
    this.startRound();
  }

  public startRound(): void {
    const playerCount = this.state.players.length;
    const useDoubleDeck = playerCount >= 4;
    
    let deck = createDeck(useDoubleDeck);
    deck = shuffleDeck(deck);

    // Deal 7 cards to each player
    this.state.players.forEach(p => {
      p.hand = [];
      p.roundScore = 0;
    });

    for (let c = 0; c < 7; c++) {
      this.state.players.forEach(p => {
        const card = deck.pop();
        if (card) p.hand.push(card);
      });
    }

    // Setup discard pile
    let initialDiscard = deck.pop();
    while (!initialDiscard || initialDiscard.rank === 'Joker') {
      // If no cards or starting card is a Joker, reshuffle or draw again
      if (initialDiscard) deck.unshift(initialDiscard);
      deck = shuffleDeck(deck);
      initialDiscard = deck.pop();
    }
    
    this.state.drawPile = deck;
    this.state.discardPile = [initialDiscard];
    
    this.state.turnPhase = 'DISCARD';
    this.state.skipDrawApplied = false;
    this.state.prevTopDiscardBeforeTurn = initialDiscard;
    this.state.lastDiscardedBy = null;

    // Turn index: either 0 or whoever won the previous round (we keep it currentTurnIndex if valid)
    if (this.state.currentTurnIndex >= this.state.players.length) {
      this.state.currentTurnIndex = 0;
    }

    const activePlayer = this.state.players[this.state.currentTurnIndex];
    this.state.history.push(`Round ${this.state.roundNumber} started. ${activePlayer.name}'s turn.`);
  }

  public handleDiscard(playerId: string, cardIds: string[]): void {
    const player = this.getActivePlayer();
    if (player.id !== playerId) {
      throw new Error("It's not your turn!");
    }
    if (this.state.turnPhase !== 'DISCARD') {
      throw new Error("You must draw, not discard!");
    }
    if (cardIds.length === 0) {
      throw new Error("You must discard at least one card!");
    }

    // Find cards in hand
    const cardsToDiscard: Card[] = [];
    for (const id of cardIds) {
      const card = player.hand.find(c => c.id === id);
      if (!card) {
        throw new Error("Card not found in your hand!");
      }
      cardsToDiscard.push(card);
    }

    // Verify all discarded cards are of the exact same rank
    const firstRank = cardsToDiscard[0].rank;
    const allSameRank = cardsToDiscard.every(c => c.rank === firstRank);
    if (!allSameRank) {
      throw new Error("All discarded cards must be of the exact same rank!");
    }

    // Remove cards from player's hand
    player.hand = player.hand.filter(c => !cardIds.includes(c.id));

    // Push cards to discard pile (in the order discarded)
    cardsToDiscard.forEach(card => this.state.discardPile.push(card));

    this.state.lastDiscardedBy = playerId;
    
    const discardedNames = cardsToDiscard.map(c => `${c.rank} of ${c.suit}`).join(', ');
    this.state.history.push(`${player.name} discarded: ${discardedNames}.`);

    // Check Skip Draw Rule
    const prevTop = this.state.prevTopDiscardBeforeTurn;
    if (prevTop) {
      const isMatch = (c: Card, target: Card) => {
        // Face cards must match exactly
        if (['J', 'Q', 'K'].includes(target.rank)) {
          return c.rank === target.rank;
        }
        // Others match rank
        return c.rank === target.rank;
      };

      if (isMatch(cardsToDiscard[0], prevTop)) {
        // SUCCESSFUL SKIP DRAW!
        this.state.skipDrawApplied = true;
        this.state.history.push(`${player.name} matched the top card (${prevTop.rank}) and SKIPPED their draw!`);
        
        // Since they skip draw, transition turn to next player immediately
        this.endTurn();
        return;
      }
    }

    // If skip draw was not applied, transition to DRAW phase
    this.state.skipDrawApplied = false;
    this.state.turnPhase = 'DRAW';
  }

  public handleDraw(playerId: string, source: 'drawPile' | 'discardPile'): void {
    const player = this.getActivePlayer();
    if (player.id !== playerId) {
      throw new Error("It's not your turn!");
    }
    if (this.state.turnPhase !== 'DRAW') {
      throw new Error("You must discard first!");
    }

    let drawnCard: Card;

    if (source === 'drawPile') {
      if (this.state.drawPile.length === 0) {
        this.reshuffleDiscardPile();
      }
      const card = this.state.drawPile.pop();
      if (!card) {
        throw new Error("The draw pile is completely empty!");
      }
      drawnCard = card;
      player.hand.push(drawnCard);
      this.state.history.push(`${player.name} drew a card from the Closed Deck.`);
    } else {
      // Draw from discard pile:
      // Player draws the card that was on top BEFORE their turn.
      // Wait, let's verify if the prevTopDiscardBeforeTurn is still in the discard pile.
      // Since they discarded, the pile has their discarded cards on top of prevTopDiscardBeforeTurn.
      // So we need to pull prevTopDiscardBeforeTurn from the pile!
      const prevTop = this.state.prevTopDiscardBeforeTurn;
      if (!prevTop) {
        throw new Error("No card available in the discard pile to draw!");
      }

      const prevTopIndex = this.state.discardPile.findIndex(c => c.id === prevTop.id);
      if (prevTopIndex === -1) {
        throw new Error("Error retrieving the discard card!");
      }

      // Remove it from discard pile
      const [card] = this.state.discardPile.splice(prevTopIndex, 1);
      drawnCard = card;
      player.hand.push(drawnCard);
      this.state.history.push(`${player.name} drew the open card (${drawnCard.rank} of ${drawnCard.suit}) from the Discard Pile.`);
    }

    // End turn
    this.endTurn();
  }

  public handleDeclareShow(playerId: string): void {
    const player = this.getActivePlayer();
    if (player.id !== playerId) {
      throw new Error("It's not your turn!");
    }
    if (this.state.turnPhase !== 'DISCARD') {
      throw new Error("You can only declare Show at the start of your turn!");
    }

    const declarerScore = calculateHandValue(player.hand);
    if (declarerScore > 10) {
      throw new Error("You can only declare Show if your hand value is 10 points or less!");
    }

    this.state.history.push(`${player.name} declared SHOW with a hand total of ${declarerScore}!`);

    // Reveal all hands and calculate scores
    const playerScores = this.state.players.map(p => ({
      id: p.id,
      name: p.name,
      score: calculateHandValue(p.hand)
    }));

    // Find the minimum score among all players
    const minScore = Math.min(...playerScores.map(ps => ps.score));
    
    // Check if the show is successful (declarer score is strictly the lowest)
    const otherScores = playerScores.filter(ps => ps.id !== playerId).map(ps => ps.score);
    const strictlyLowest = otherScores.every(score => declarerScore < score);

    if (strictlyLowest) {
      // SUCCESSFUL SHOW
      this.state.history.push(`SUCCESSFUL SHOW! ${player.name} has the lowest hand count (${declarerScore} pts).`);
      
      this.state.players.forEach(p => {
        if (p.id === playerId) {
          p.roundScore = 0;
        } else {
          // Cap at maximum of 25 points
          p.roundScore = Math.min(25, calculateHandValue(p.hand));
        }
        p.score += p.roundScore;
      });
    } else {
      // WRONG SHOW (PENALTY)
      this.state.history.push(`WRONG SHOW! Someone else had a lower or equal hand count. ${player.name} receives a +25 penalty.`);
      
      // Find the player(s) with the actual lowest score
      const actualMinScore = Math.min(...playerScores.map(ps => ps.score));

      this.state.players.forEach(p => {
        if (p.id === playerId) {
          // Wrong declarer gets +25 points
          p.roundScore = 25;
        } else if (calculateHandValue(p.hand) === actualMinScore) {
          // The actual lowest score holder(s) get 0 points
          p.roundScore = 0;
        } else {
          // All others get their hand value capped at 25
          p.roundScore = Math.min(25, calculateHandValue(p.hand));
        }
        p.score += p.roundScore;
      });
    }

    // Log the round scores
    this.state.players.forEach(p => {
      this.state.history.push(`${p.name} hand: ${p.hand.map(c => `${c.rank}${c.suit[0].toUpperCase()}`).join(', ')} (${calculateHandValue(p.hand)} pts) -> Round Score: +${p.roundScore}`);
    });

    // Check for Game Over / Elimination
    const ELIMINATION_SCORE = 100;
    const anyEliminated = this.state.players.some(p => p.score >= ELIMINATION_SCORE);

    this.state.turnPhase = 'ROUND_END';

    if (anyEliminated) {
      this.state.isGameOver = true;
      // Find player with lowest cumulative score
      let bestPlayer = this.state.players[0];
      this.state.players.forEach(p => {
        if (p.score < bestPlayer.score) {
          bestPlayer = p;
        }
      });
      this.state.winnerId = bestPlayer.id;
      this.state.history.push(`GAME OVER! ${bestPlayer.name} wins the match with a total score of ${bestPlayer.score} points!`);
    } else {
      this.state.history.push(`Round ended. Waiting for Host to start the next round.`);
    }
  }

  public handleNextRound(playerId: string): void {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player || !player.isHost) {
      throw new Error("Only the host can start the next round!");
    }
    if (this.state.turnPhase !== 'ROUND_END') {
      throw new Error("Round is not over yet!");
    }
    if (this.state.isGameOver) {
      throw new Error("Game is over! Restart to play again.");
    }

    // Determine who starts next: player with the actual lowest score in previous round
    const playerScores = this.state.players.map(p => ({
      index: this.state.players.indexOf(p),
      score: calculateHandValue(p.hand)
    }));
    const minScore = Math.min(...playerScores.map(ps => ps.score));
    const starters = playerScores.filter(ps => ps.score === minScore);
    
    // Choose the first starter
    if (starters.length > 0) {
      this.state.currentTurnIndex = starters[0].index;
    }

    this.state.roundNumber += 1;
    this.startRound();
  }

  private endTurn(): void {
    // Increment turn index
    this.state.currentTurnIndex = (this.state.currentTurnIndex + 1) % this.state.players.length;
    this.state.turnPhase = 'DISCARD';
    this.state.skipDrawApplied = false;

    // The top card of the discard pile at this exact moment becomes the prevTopDiscardBeforeTurn for the next player
    const topCard = this.state.discardPile[this.state.discardPile.length - 1];
    this.state.prevTopDiscardBeforeTurn = topCard || null;

    const nextPlayer = this.getActivePlayer();
    this.state.history.push(`It is now ${nextPlayer.name}'s turn.`);
  }

  private getActivePlayer(): Player {
    return this.state.players[this.state.currentTurnIndex];
  }

  private reshuffleDiscardPile(): void {
    if (this.state.discardPile.length <= 1) {
      return; // Not enough cards to reshuffle
    }
    // Keep top card, shuffle the rest
    const topCard = this.state.discardPile.pop()!;
    const rest = this.state.discardPile;
    this.state.discardPile = [topCard];
    
    const shuffled = shuffleDeck(rest);
    this.state.drawPile = shuffled;
    this.state.history.push('The Draw Pile was empty. Reshuffled the Discard Pile back into the Draw Pile.');
  }

  // Generate personalized state for a player
  public getClientState(playerId: string): ClientGameState {
    const me = this.state.players.find(p => p.id === playerId);
    const activePlayer = this.state.gameStarted ? this.getActivePlayer() : null;

    return {
      roomId: this.state.roomId,
      myId: playerId,
      players: this.state.players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        roundScore: p.roundScore,
        cardCount: p.hand.length,
        isHost: p.isHost,
        isReady: p.isReady,
        isEliminated: p.isEliminated,
        isCurrentTurn: this.state.gameStarted && activePlayer?.id === p.id,
        revealHand: this.state.turnPhase === 'ROUND_END' ? p.hand : undefined
      })),
      myHand: me ? me.hand : [],
      currentTurnId: this.state.gameStarted && activePlayer ? activePlayer.id : null,
      turnPhase: this.state.turnPhase,
      topDiscardCard: this.state.discardPile[this.state.discardPile.length - 1] || null,
      drawPileCount: this.state.drawPile.length,
      gameStarted: this.state.gameStarted,
      isGameOver: this.state.isGameOver,
      winnerId: this.state.winnerId,
      roundNumber: this.state.roundNumber,
      history: this.state.history.slice(-20) // send last 20 history items
    };
  }
}
