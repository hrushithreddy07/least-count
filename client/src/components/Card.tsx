import React from 'react';
import type { Card as CardType } from '../../../server/src/types';

interface CardProps {
  card: CardType;
  selected?: boolean;
  onClick?: () => void;
  faceUp?: boolean;
  disabled?: boolean;
}

export const Card: React.FC<CardProps> = ({
  card,
  selected = false,
  onClick,
  faceUp = true,
  disabled = false
}) => {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const isJoker = card.suit === 'joker';

  const getSuitSymbol = (suit: CardType['suit']) => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      case 'joker': return '🃏';
      default: return '';
    }
  };

  const suitSymbol = getSuitSymbol(card.suit);

  if (!faceUp) {
    return (
      <div 
        className="card-wrapper" 
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
        onClick={!disabled ? onClick : undefined}
      >
        <div className="card-inner" style={{ transform: 'rotateY(180deg)' }}>
          <div className="card-face card-back">
            <div className="card-back-pattern" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`card-wrapper ${selected ? 'selected' : ''}`}
      onClick={!disabled ? onClick : undefined}
      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <div className="card-inner">
        <div 
          className={`card-face card-front ${
            isJoker ? 'joker-front' : isRed ? 'red-suit' : 'black-suit'
          }`}
        >
          <div className="card-front-top">
            <span>{card.rank}</span>
            {!isJoker && <span>{suitSymbol}</span>}
          </div>
          
          <div className="card-front-center">
            {isJoker ? 'Joker' : suitSymbol}
          </div>
          
          <div className="card-front-bottom">
            <span>{card.rank}</span>
            {!isJoker && <span>{suitSymbol}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
