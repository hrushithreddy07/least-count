import React, { useState, useEffect } from 'react';
import { socket } from './socket';
import type { ClientGameState } from '../../server/src/types';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { Scoreboard } from './components/Scoreboard';
import { LogIn, PlusCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import './App.css';

export default function App() {
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameState, setGameState] = useState<ClientGameState | null>(null);

  // Load saved session on mount
  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
      
      const savedRoomId = localStorage.getItem('least_count_room_id');
      const savedPlayerId = localStorage.getItem('least_count_player_id');
      
      if (savedRoomId && savedPlayerId) {
        socket.emit('syncState', { roomId: savedRoomId, playerId: savedPlayerId }, (response: any) => {
          if (response.error) {
            console.warn('Could not sync previous state:', response.error);
            // Clear stale session
            localStorage.removeItem('least_count_room_id');
            localStorage.removeItem('least_count_player_id');
          }
        });
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('gameStateUpdate', (newState: ClientGameState) => {
      setGameState(newState);
      setError(null);
      // Persist session
      localStorage.setItem('least_count_room_id', newState.roomId);
      localStorage.setItem('least_count_player_id', newState.myId);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('gameStateUpdate');
      socket.disconnect();
    };
  }, []);

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Name is required');

    socket.emit('createRoom', { name: name.trim() }, (response: any) => {
      if (response.error) {
        setError(response.error);
      } else {
        localStorage.setItem('least_count_player_name', name.trim());
      }
    });
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Name is required');
    if (!joinCode.trim()) return setError('Room code is required');

    socket.emit('joinRoom', { roomId: joinCode.trim(), name: name.trim() }, (response: any) => {
      if (response.error) {
        setError(response.error);
      } else {
        localStorage.setItem('least_count_player_name', name.trim());
      }
    });
  };

  const handleStartGame = () => {
    if (!gameState) return;
    socket.emit('startGame', { roomId: gameState.roomId, playerId: gameState.myId }, (response: any) => {
      if (response.error) {
        setError(response.error);
      }
    });
  };

  const handleDiscard = (cardIds: string[]) => {
    if (!gameState) return;
    socket.emit('discard', { roomId: gameState.roomId, playerId: gameState.myId, cardIds }, (response: any) => {
      if (response.error) {
        setError(response.error);
      }
    });
  };

  const handleDraw = (source: 'drawPile' | 'discardPile') => {
    if (!gameState) return;
    socket.emit('draw', { roomId: gameState.roomId, playerId: gameState.myId, source }, (response: any) => {
      if (response.error) {
        setError(response.error);
      }
    });
  };

  const handleDeclareShow = () => {
    if (!gameState) return;
    socket.emit('declareShow', { roomId: gameState.roomId, playerId: gameState.myId }, (response: any) => {
      if (response.error) {
        setError(response.error);
      }
    });
  };

  const handleNextRound = () => {
    if (!gameState) return;
    socket.emit('nextRound', { roomId: gameState.roomId, playerId: gameState.myId }, (response: any) => {
      if (response.error) {
        setError(response.error);
      }
    });
  };

  const handleLeaveRoom = () => {
    localStorage.removeItem('least_count_room_id');
    localStorage.removeItem('least_count_player_id');
    socket.disconnect();
    socket.connect(); // reconnect to reset clean socket state
    setGameState(null);
    setError(null);
  };

  const handleRestartGame = () => {
    handleStartGame(); // Restarting matches the Start Game logic
  };

  // Render Welcome/Login Screen
  if (!gameState) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="logo-section">
            <h1>🃏 Least Count <span>Multiplayer</span></h1>
          </div>
          <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
            <div className="status-dot" />
            <span>{connected ? 'Server Connected' : 'Connecting to Server...'}</span>
          </div>
        </header>

        <div className="welcome-screen">
          <div className="welcome-card glass-panel">
            <div className="welcome-title">
              <h2>Let's Play</h2>
              <p>Discard fast, count points, draw matching cards to skip!</p>
            </div>

            {error && (
              <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '0.5rem', color: '#ef4444', marginBottom: '1.5rem', fontSize: '0.9rem', alignItems: 'center' }}>
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="tabs-header">
              <button 
                className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
                onClick={() => setActiveTab('create')}
              >
                Create Room
              </button>
              <button 
                className={`tab-btn ${activeTab === 'join' ? 'active' : ''}`}
                onClick={() => setActiveTab('join')}
              >
                Join Room
              </button>
            </div>

            <form onSubmit={activeTab === 'create' ? handleCreateRoom : handleJoinRoom}>
              <div className="form-group">
                <label>Your Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Enter username" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={12}
                  required
                />
              </div>

              {activeTab === 'join' && (
                <div className="form-group">
                  <label>Room Code</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. ABCD" 
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={4}
                    required
                  />
                </div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                disabled={!connected}
              >
                {activeTab === 'create' ? (
                  <>
                    <PlusCircle size={18} />
                    Create New Room
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Join Existing Room
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Render Lobby Screen
  if (!gameState.gameStarted) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="logo-section">
            <h1>🃏 Least Count <span>Lobby</span></h1>
          </div>
          <div className="status-indicator connected">
            <div className="status-dot" />
            <span>Room {gameState.roomId}</span>
          </div>
        </header>

        {error && (
          <div style={{ position: 'fixed', top: '5rem', right: '2rem', display: 'flex', gap: '0.5rem', background: '#ef4444', padding: '0.75rem 1.25rem', borderRadius: '0.5rem', color: '#fff', fontSize: '0.9rem', alignItems: 'center', zIndex: 1000, boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#fff', marginLeft: '1rem', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
          </div>
        )}

        <Lobby 
          roomId={gameState.roomId} 
          myId={gameState.myId} 
          players={gameState.players} 
          onStartGame={handleStartGame} 
        />
      </div>
    );
  }

  // Render Game Board Screen
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-section">
          <h1>🃏 Least Count <span>Active Table</span></h1>
        </div>
        <div className="header-actions">
          <div className="status-indicator connected" style={{ background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
            <ShieldCheck size={14} />
            <span>Secure Table</span>
          </div>
        </div>
      </header>

      {error && (
        <div style={{ position: 'fixed', top: '5rem', right: '2rem', display: 'flex', gap: '0.5rem', background: '#ef4444', padding: '0.75rem 1.25rem', borderRadius: '0.5rem', color: '#fff', fontSize: '0.9rem', alignItems: 'center', zIndex: 1000, boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#fff', marginLeft: '1rem', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
        </div>
      )}

      <GameBoard 
        gameState={gameState} 
        onDiscard={handleDiscard} 
        onDraw={handleDraw} 
        onDeclareShow={handleDeclareShow} 
        onLeave={handleLeaveRoom} 
      />

      {/* Scoreboard Overlay Modal */}
      {(gameState.turnPhase === 'ROUND_END' || gameState.isGameOver) && (
        <Scoreboard 
          players={gameState.players} 
          myId={gameState.myId} 
          isGameOver={gameState.isGameOver} 
          winnerId={gameState.winnerId} 
          onRestart={handleRestartGame} 
          onLeave={handleLeaveRoom} 
          onNextRound={handleNextRound} 
        />
      )}
    </div>
  );
}
