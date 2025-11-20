import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Users, Plus } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface LobbyScreenProps {
  username: string;
  onCreateRoom: (code: string) => void;
  onJoinRoom: (code: string) => void;
}

export function LobbyScreen({ username, onCreateRoom, onJoinRoom }: LobbyScreenProps) {
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError('');
    
    try {
      const code = generateRoomCode();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-472de917/create-room`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ roomCode: code, hostUsername: username }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      onCreateRoom(code);
    } catch (err) {
      setError('Failed to create room. Please try again.');
      console.error('Error creating room:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    setIsJoining(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-472de917/join-room`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ roomCode: joinCode.toUpperCase(), username }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to join room');
      }

      onJoinRoom(joinCode.toUpperCase());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room. Please check the code and try again.');
      console.error('Error joining room:', err);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-sky-400 to-sky-600">
      <div className="bg-white/10 backdrop-blur-md p-12 rounded-2xl shadow-2xl border border-white/20 max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-white text-4xl mb-2">Welcome, {username}!</h1>
          <p className="text-white/80">Create a room or join your friends</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Create Room */}
          <div className="bg-white/10 p-6 rounded-xl border border-white/20">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="w-6 h-6 text-white" />
              <h2 className="text-white text-2xl">Create Room</h2>
            </div>
            <p className="text-white/70 mb-6">
              Start a new game and share the code with your friends
            </p>
            <Button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {isCreating ? 'Creating...' : 'Create Room'}
            </Button>
          </div>

          {/* Join Room */}
          <div className="bg-white/10 p-6 rounded-xl border border-white/20">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-6 h-6 text-white" />
              <h2 className="text-white text-2xl">Join Room</h2>
            </div>
            <p className="text-white/70 mb-6">
              Enter the room code from your friend
            </p>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <Input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                className="bg-white/20 border-white/30 text-white placeholder:text-white/50 text-center uppercase"
                maxLength={6}
              />
              <Button
                type="submit"
                disabled={isJoining || !joinCode.trim()}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                {isJoining ? 'Joining...' : 'Join Room'}
              </Button>
            </form>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-500/20 border border-red-500/50 text-white p-3 rounded-lg text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
