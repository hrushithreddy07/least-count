import React from 'react';
import { Trophy, RefreshCw, LogOut, ArrowRight, Eye } from 'lucide-react';
import type { Card as CardType } from '../../../server/src/types';
import { Card } from './Card';

interface ScoreboardProps {
  players: {
    id: string;
    name: string;
    score: number;
    roundScore: number;
    isHost: boolean;
    revealHand?: CardType[];
  }[];
  myId: string;
  isGameOver: boolean;
  winnerId: string | null;
  onRestart: () => void;
  onLeave: () => void;
  onNextRound?: () => void;
}

export const Scoreboard: React.FC<ScoreboardProps> = ({
  players,
  myId,
  isGameOver,
  winnerId,
  onRestart,
  onLeave,
  onNextRound
}) => {
  const me = players.find(p => p.id === myId);
  const isHost = me?.isHost || false;
  
  // Sort players by score ascending (lowest score is best)
  const sortedPlayers = [...players].sort((a, b) => a.score - b.score);
  const winner = players.find(p => p.id === winnerId);

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '650px', width: '100%', overflowY: 'auto', maxHeight: '90vh' }}>
        {isGameOver ? (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(242, 191, 36, 0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
              <Trophy size={48} color="#f2bf24" />
            </div>
            <h2>Match Over!</h2>
            <p style={{ fontSize: '1.2rem', color: '#34d399', fontWeight: 600 }}>
              🏆 {winner ? winner.name : 'Unknown Player'} wins the match!
            </p>
          </div>
        ) : (
          <div style={{ marginBottom: '1.5rem' }}>
            <h2>Round Finished</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Scores and revealed hands</p>
          </div>
        )}

        {/* Revealed Hands Section */}
        {!isGameOver && (
          <div style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'left' }}>
            <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#34d399', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Eye size={14} /> Revealed Hands
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {players.map(p => (
                <div key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                    {p.name} {p.id === myId && '(You)'} : {p.revealHand ? p.revealHand.reduce((sum, c) => sum + c.value, 0) : 0} pts
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {p.revealHand?.map(card => (
                      <div key={card.id} style={{ scale: '0.6', transformOrigin: 'top left', width: '48px', height: '72px', marginRight: '4px', marginBottom: '8px' }}>
                        <Card card={card} disabled={true} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                <th style={{ padding: '0.5rem' }}>Rank</th>
                <th style={{ padding: '0.5rem' }}>Player</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Round</th>
                <th style={{ padding: '0.5rem', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.map((p, index) => {
                const isMe = p.id === myId;
                const isPlayerWinner = isGameOver && p.id === winnerId;
                return (
                  <tr 
                    key={p.id} 
                    style={{ 
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: isPlayerWinner ? 'rgba(242, 191, 36, 0.05)' : isMe ? 'rgba(16, 185, 129, 0.05)' : 'none',
                      fontWeight: isMe ? 600 : 400
                    }}
                  >
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      {p.name} {isMe && '(You)'}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', color: p.roundScore === 0 ? '#34d399' : p.roundScore >= 25 ? '#ef4444' : 'var(--text-primary)' }}>
                      {p.roundScore === 0 ? '0 (Show)' : p.roundScore >= 25 ? `+25 (Wrong)` : `+${p.roundScore}`}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '1rem', color: p.score >= 100 ? '#ef4444' : 'var(--text-primary)' }}>
                      {p.score} pts
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}>
          {isGameOver ? (
            isHost && (
              <button className="btn btn-primary" onClick={onRestart} style={{ flex: 1, justifyContent: 'center' }}>
                <RefreshCw size={16} />
                Play Again
              </button>
            )
          ) : isHost ? (
            <button className="btn btn-primary" onClick={onNextRound} style={{ flex: 1, justifyContent: 'center' }}>
              <ArrowRight size={16} />
              Start Next Round
            </button>
          ) : (
            <div style={{ flex: 1, fontSize: '0.9rem', color: 'var(--warning)', textAlign: 'left' }}>
              ⌛ Waiting for Host to start next round...
            </div>
          )}
          <button className="btn btn-secondary" onClick={onLeave} style={{ minWidth: '120px', justifyContent: 'center' }}>
            <LogOut size={16} />
            Leave
          </button>
        </div>
      </div>
    </div>
  );
};
