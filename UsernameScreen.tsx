import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Plane } from 'lucide-react';

interface UsernameScreenProps {
  onSubmit: (username: string) => void;
}

export function UsernameScreen({ onSubmit }: UsernameScreenProps) {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onSubmit(username.trim());
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-sky-400 to-sky-600">
      <div className="bg-white/10 backdrop-blur-md p-12 rounded-2xl shadow-2xl border border-white/20 max-w-md w-full">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-white/20 p-6 rounded-full mb-4">
            <Plane className="w-16 h-16 text-white" />
          </div>
          <h1 className="text-white text-5xl mb-2">jarzd.io</h1>
          <p className="text-white/80 text-center">
            Multiplayer Flying & Shooting Game
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-white mb-2">
              Choose your pilot name
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="bg-white/20 border-white/30 text-white placeholder:text-white/50"
              maxLength={20}
              autoFocus
            />
          </div>
          <Button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
            disabled={!username.trim()}
          >
            Take Flight
          </Button>
        </form>
      </div>
    </div>
  );
}
