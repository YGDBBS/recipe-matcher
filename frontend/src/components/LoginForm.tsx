// src/components/LoginForm.tsx
import { useState } from 'react';
import { api } from '@/lib/api';

interface Props {
  onSuccess: (token: string) => void;
}

export default function LoginForm({ onSuccess }: Props) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = isRegister
        ? await api.registerUser({ email, password, username })
        : await api.loginUser({ email, password });

      if (response.error || !response.data?.token) {
        setError(response.error || 'Authentication failed');
        return;
      }

      onSuccess(response.data.token);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-xl p-6 max-w-md mx-auto shadow-xl">
      <h2 className="text-2xl font-bold mb-4 text-[#1F2937]">{isRegister ? 'Register' : 'Login'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {isRegister && (
          <div>
            <label className="block text-sm font-medium text-[#1F2937] mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
              required
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-[#1F2937] mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1F2937] mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-[#E5E7EB] rounded focus:outline-none focus:ring-2 focus:ring-[#84CC16]"
            required
          />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#84CC16] hover:bg-[#65A30D] text-white px-6 py-3 rounded-xl font-medium text-sm transform transition-all duration-200 hover:scale-105 hover:shadow-lime-glow active:scale-95 disabled:opacity-50"
        >
          {loading ? 'Loading...' : isRegister ? 'Register' : 'Login'}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRegister(!isRegister);
            setError('');
          }}
          className="w-full text-sm text-[#6B7280] hover:text-[#84CC16]"
        >
          {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
        </button>
      </form>
    </div>
  );
}