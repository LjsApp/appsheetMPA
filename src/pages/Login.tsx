import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Loader2, Lock, User, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { fetchApi } from '@/hooks/useData';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);

  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION_MS = 2 * 60 * 1000; // 2 menit

  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const res = await fetchApi('checkSetup', 'GET', {});
        if (!res.isSetupComplete) {
          navigate('/setup', { replace: true });
        } else {
          setChecking(false);
        }
      } catch (err) {
        setChecking(false);
      }
    };
    checkSetupStatus();
  }, [navigate]);

  // Countdown timer for locked state
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setLockCountdown(0);
        setLoginAttempts(0);
        setError('');
      } else {
        setLockCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if locked
    if (lockedUntil && Date.now() < lockedUntil) {
      setError(`Terlalu banyak percobaan. Coba lagi dalam ${lockCountdown} detik.`);
      return;
    }

    setError('');
    setLoading(true);
    try {
      const user = await fetchApi('login', 'POST', { email, password });
      setLoginAttempts(0);
      setLockedUntil(null);
      login(user);
      navigate('/', { replace: true });
    } catch (err: any) {
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      const remaining = MAX_ATTEMPTS - newAttempts;
      if (newAttempts >= MAX_ATTEMPTS) {
        const until = Date.now() + LOCK_DURATION_MS;
        setLockedUntil(until);
        setLockCountdown(Math.ceil(LOCK_DURATION_MS / 1000));
        setError(`Akun dikunci sementara karena terlalu banyak percobaan gagal. Coba lagi dalam 2 menit.`);
      } else {
        setError(`${err.message || 'Email atau password salah.'} (${remaining} percobaan tersisa)`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-[360px] flex flex-col items-center -mt-20">
        <div className="flex items-center justify-center gap-3 mt-6">
          <img src="/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
          <h2 className="text-3xl font-extrabold text-blue-700 tracking-tight">SAPP</h2>
        </div>
        <p className="mt-2 text-center text-sm text-gray-600 font-medium">
          Sistem Manajemen
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[360px]">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 sm:text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 py-2.5 border"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 sm:text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 py-2.5 border"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className={`text-sm p-3 rounded-lg border flex items-start gap-2 ${lockedUntil ? 'text-orange-700 bg-orange-50 border-orange-200' : 'text-red-600 bg-red-50 border-red-100'}`}>
                {lockedUntil && <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-orange-500" />}
                <span>{error}</span>
              </div>
            )}

            <div>
              <Button
                type="submit"
                className="w-full flex justify-center py-2.5 gap-2"
                disabled={loading || !!lockedUntil}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : lockedUntil ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                {lockedUntil ? `Terkunci (${lockCountdown}s)` : 'Sign In'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
