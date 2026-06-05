import React, { useState } from 'react';
import { Card } from './Card';
import type { Card as CardType, ClientGameState } from '../../../server/src/types';
import { Play, RotateCcw, AlertCircle, MessageSquare } from 'lucide-react';

interface GameBoardProps {
  gameState: ClientGameState;
  onDiscard: (cardIds: string[]) => void;
  onDraw: (source: 'drawPile' | 'discardPile') => void;
  onDeclareShow: () => void;
  onLeave: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  onDiscard,
  onDraw,
  onDeclareShow,
  onLeave
}) => {
  const {
    myId,
    players,
    myHand,
    currentTurnId,
    turnPhase,
    topDiscardCard,
    drawPileCount,
    roundNumber,
    history
  } = gameState;

  // Selected cards state
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  // Find myself
  const me = players.find(p => p.id === myId);
  const isMyTurn = currentTurnId === myId;

  // Calculate my hand value
  const myHandValue = myHand.reduce((sum, c) => sum + c.value, 0);

  // Filter out myself to get list of opponents
  const opponents = players.filter(p => p.id !== myId);

  // Position coordinates for opponents based on count
  const getOpponentStyle = (index: number, totalOpponents: number) => {
    // We place players in a semi-circular arc around the top and sides of the board
    if (totalOpponents === 1) {
      return { top: '15%', left: '50%' };
    }
    if (totalOpponents === 2) {
      return [
        { top: '25%', left: '15%' },
        { top: '25%', left: '85%' }
      ][index];
    }
    if (totalOpponents === 3) {
      return [
        { top: '45%', left: '12%' },
        { top: '15%', left: '50%' },
        { top: '45%', left: '88%' }
      ][index];
    }
    if (totalOpponents === 4) {
      return [
        { top: '50%', left: '12%' },
        { top: '20%', left: '25%' },
        { top: '20%', left: '75%' },
        { top: '50%', left: '88%' }
      ][index];
    }
    // For 5 opponents
    return [
      { top: '50%', left: '10%' },
      { top: '25%', left: '25%' },
      { top: '15%', left: '50%' },
      { top: '25%', left: '75%' },
      { top: '50%', left: '90%' }
    ][index];
  };

  const handleCardClick = (cardId: string) => {
    if (!isMyTurn || turnPhase !== 'DISCARD') return;

    setSelectedCardIds(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId);
      } else {
        // If selecting a new card, check if it matches the rank of already selected cards
        const clickedCard = myHand.find(c => c.id === cardId);
        if (prev.length > 0 && clickedCard) {
          const firstSelected = myHand.find(c => c.id === prev[0]);
          if (firstSelected && clickedCard.rank !== firstSelected.rank) {
            // Rank mismatch: clear previous selection and select only the new one
            return [cardId];
          }
        }
        return [...prev, cardId];
      }
    });
  };

  const handleDiscardClick = () => {
    if (selectedCardIds.length === 0) return;
    onDiscard(selectedCardIds);
    setSelectedCardIds([]);
  };

  const handleDrawClick = (source: 'drawPile' | 'discardPile') => {
    if (!isMyTurn || turnPhase !== 'DRAW') return;
    onDraw(source);
  };

  const handleShowClick = () => {
    if (!isMyTurn || turnPhase !== 'DISCARD' || myHandValue > 10) return;
    onDeclareShow();
  };

  // Check if selection is valid for discard
  const selectedCards = myHand.filter(c => selectedCardIds.includes(c.id));
  const isSelectionValid = selectedCards.length > 0 && selectedCards.every(c => c.rank === selectedCards[0].rank);

  return (
    <div className="game-table-container">
      {/* Game Board (Left) */}
      <div className="game-area">
        {/* Top Info Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
          <div className="status-indicator connected">
            <div className="status-dot" />
            <span>Round {roundNumber}</span>
          </div>
          
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {isMyTurn ? (
              <span style={{ color: '#34d399', fontWeight: 600 }}>
                🟢 Your Turn: {turnPhase === 'DISCARD' ? 'Discard a card (or same rank cards)' : 'Draw 1 card'}
              </span>
            ) : (
              <span>
                ⌛ Waiting for {players.find(p => p.id === currentTurnId)?.name || 'opponent'}...
              </span>
            )}
          </div>

          <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={onLeave}>
            Quit
          </button>
        </div>

        {/* The Felt Table */}
        <div className="game-board">
          {/* Opponents circle */}
          <div className="opponents-ring">
            {opponents.map((opponent, idx) => {
              const posStyle = getOpponentStyle(idx, opponents.length);
              const isOpponentTurn = opponent.id === currentTurnId;
              return (
                <div 
                  key={opponent.id} 
                  className="opponent-slot" 
                  style={posStyle}
                >
                  <div className={`opponent-card ${isOpponentTurn ? 'active-turn' : ''}`}>
                    <div className="opponent-avatar" style={{ backgroundColor: isOpponentTurn ? 'var(--primary)' : '#475569' }}>
                      {opponent.name[0].toUpperCase()}
                    </div>
                    <div className="opponent-info">
                      <h4>{opponent.name}</h4>
                      <p>{opponent.cardCount} cards | {opponent.score} pts</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Center Table (Piles) */}
          <div className="center-table">
            {/* Draw Pile */}
            <div className="pile-container">
              <span className="pile-title">Draw</span>
              <div 
                className={`pile-box ${isMyTurn && turnPhase === 'DRAW' ? 'active-pile' : ''}`}
                onClick={() => handleDrawClick('drawPile')}
                style={{ cursor: isMyTurn && turnPhase === 'DRAW' ? 'pointer' : 'not-allowed' }}
              >
                {drawPileCount > 0 ? (
                  <div className="card-wrapper" style={{ pointerEvents: 'none' }}>
                    <div className="card-inner" style={{ transform: 'rotateY(180deg)' }}>
                      <div className="card-face card-back" style={{ borderColor: '#60a5fa' }}>
                        <div className="card-back-pattern" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reshuffle</span>
                )}
                <div className="pile-card-count">{drawPileCount}</div>
              </div>
            </div>

            {/* Discard Pile */}
            <div className="pile-container">
              <span className="pile-title">Discard</span>
              <div 
                className={`pile-box ${isMyTurn && turnPhase === 'DRAW' ? 'active-pile' : ''}`}
                onClick={() => handleDrawClick('discardPile')}
                style={{ cursor: isMyTurn && turnPhase === 'DRAW' ? 'pointer' : 'not-allowed' }}
              >
                {topDiscardCard ? (
                  <Card card={topDiscardCard} disabled={true} />
                ) : (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Empty</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Player hand area at bottom */}
        <div className="player-hand-area">
          <div className="hand-header">
            <div className="hand-info">
              <h3>Your Hand</h3>
              <span>Total value: <strong>{myHandValue} pts</strong> (Threshold to Show is 10)</span>
            </div>
            
            <div className="hand-actions">
              {isMyTurn && turnPhase === 'DISCARD' && (
                <>
                  <button 
                    className="btn btn-primary"
                    disabled={!isSelectionValid}
                    onClick={handleDiscardClick}
                  >
                    Discard Selected ({selectedCardIds.length})
                  </button>
                  <button 
                    className="btn btn-danger"
                    disabled={myHandValue > 10}
                    onClick={handleShowClick}
                    title={myHandValue > 10 ? "Hand must be 10 or less to Declare Show!" : "Declare Show"}
                  >
                    Declare Show
                  </button>
                </>
              )}
              {isMyTurn && turnPhase === 'DRAW' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#60a5fa', fontSize: '0.9rem', fontWeight: 600 }}>
                  <AlertCircle size={16} />
                  Draw a card from the Closed Deck or Discard Pile!
                </div>
              )}
            </div>
          </div>

          <div className="cards-container">
            {myHand.map((card) => (
              <Card 
                key={card.id} 
                card={card} 
                selected={selectedCardIds.includes(card.id)}
                onClick={() => handleCardClick(card.id)}
                disabled={!isMyTurn || turnPhase !== 'DISCARD'}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Side Panel (Right) */}
      <div className="side-panel">
        <div className="panel-section">
          <h3>Leaderboard</h3>
          <div className="mini-scoreboard">
            {[...players].sort((a,b) => a.score - b.score).map((p) => (
              <div 
                key={p.id} 
                className="mini-score-item"
                style={{ 
                  borderColor: p.id === myId ? 'var(--primary)' : 'var(--card-border)',
                  background: p.id === myId ? 'rgba(16, 185, 129, 0.05)' : 'none'
                }}
              >
                <span style={{ fontWeight: p.id === myId ? 600 : 400 }}>
                  {p.name} {p.id === myId && '(You)'}
                </span>
                <strong>{p.score} pts</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="panel-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3>History Log</h3>
          <div className="history-log">
            {history.map((log, index) => (
              <div key={index} className="history-item">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
