import { useState, useEffect } from 'react';
import { UsernameScreen } from './components/UsernameScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { Game } from './components/Game';

type GameState = 'username' | 'lobby' | 'game';

export default function App() {
  const [gameState, setGameState] = useState<GameState>('username');
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isHost, setIsHost] = useState(false);

  const handleUsernameSubmit = (name: string) => {
    setUsername(name);
    setGameState('lobby');
  };

  const handleCreateRoom = (code: string) => {
    setRoomCode(code);
    setIsHost(true);
    setGameState('game');
  };

  const handleJoinRoom = (code: string) => {
    setRoomCode(code);
    setIsHost(false);
    setGameState('game');
  };

  const handleLeaveGame = () => {
    setGameState('lobby');
    setRoomCode('');
    setIsHost(false);
  };

  return (
    <div className="w-full h-screen bg-slate-900">
      {gameState === 'username' && (
        <UsernameScreen onSubmit={handleUsernameSubmit} />
      )}
      {gameState === 'lobby' && (
        <LobbyScreen
          username={username}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
        />
      )}
      {gameState === 'game' && (
        <Game
          username={username}
          roomCode={roomCode}
          isHost={isHost}
          onLeave={handleLeaveGame}
        />
      )}
    </div>
  );
}