import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Plane, Plus, LogIn } from 'lucide-react';

interface LobbyProps {
  username: string;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  isLoading: boolean;
}

export function Lobby({ username, onCreateRoom, onJoinRoom, isLoading }: LobbyProps) {
  const [roomCode, setRoomCode] = useState('');

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim()) {
      onJoinRoom(roomCode.trim().toUpperCase());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-500 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-white/20 p-4 rounded-full mb-4">
            <Plane className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-white mb-2">Welcome, {username}!</h1>
          <p className="text-white/80">Create a new game or join an existing one</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Create Room Card */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Create Game
              </CardTitle>
              <CardDescription className="text-white/70">
                Start a new game and invite your friends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={onCreateRoom}
                className="w-full bg-white text-blue-900 hover:bg-white/90"
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create New Room'}
              </Button>
            </CardContent>
          </Card>

          {/* Join Room Card */}
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <LogIn className="w-5 h-5" />
                Join Game
              </CardTitle>
              <CardDescription className="text-white/70">
                Enter a room code from your friend
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoin} className="space-y-3">
                <Input
                  type="text"
                  placeholder="Enter room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/50 text-center uppercase"
                  maxLength={6}
                />
                <Button
                  type="submit"
                  className="w-full bg-white text-blue-900 hover:bg-white/90"
                  disabled={!roomCode.trim() || isLoading}
                >
                  {isLoading ? 'Joining...' : 'Join Room'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
          <h3 className="text-white mb-3">How to Play</h3>
          <div className="grid md:grid-cols-2 gap-4 text-white/80">
            <div>
              <p className="mb-2"><strong className="text-white">WASD</strong> - Move plane</p>
              <p className="mb-2"><strong className="text-white">Mouse</strong> - Look around</p>
              <p><strong className="text-white">SPACE</strong> - Shoot</p>
            </div>
            <div>
              <p className="mb-2"><strong className="text-white">SHIFT</strong> - Boost speed</p>
              <p className="mb-2"><strong className="text-white">Q/E</strong> - Roll left/right</p>
              <p><strong className="text-white">Goal</strong> - Shoot down enemy planes!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
