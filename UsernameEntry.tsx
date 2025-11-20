import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Plane } from 'lucide-react';

interface UsernameEntryProps {
  onSubmit: (username: string) => void;
}

export function UsernameEntry({ onSubmit }: UsernameEntryProps) {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onSubmit(username.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-cyan-500 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full shadow-2xl border border-white/20">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-white/20 p-4 rounded-full mb-4">
            <Plane className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-white text-center mb-2">Sky Warriors</h1>
          <p className="text-white/80 text-center">Enter your pilot name to begin</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-white/20 border-white/30 text-white placeholder:text-white/50 text-center"
            maxLength={20}
            autoFocus
          />
          <Button
            type="submit"
            className="w-full bg-white text-blue-900 hover:bg-white/90"
            disabled={!username.trim()}
          >
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
}
