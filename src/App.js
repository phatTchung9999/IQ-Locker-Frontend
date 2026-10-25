import './App.css';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import Index from './component/Index.js';
import { api } from './utils/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    setSessionError(false);
  }, []);

  const restoreSession = useCallback(async (signal) => {
    const token = localStorage.getItem('token');
    setSessionError(false);
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await api.get('/api/v1/user/me', {
        headers: { Authorization: `Bearer ${token}` }, signal,
      });
      if (typeof data?.fullname !== 'string' || !data.fullname.trim() || typeof data.email !== 'string') {
        throw new Error('Invalid profile response');
      }
      if (!signal?.aborted) setUser(data);
    } catch (error) {
      if (signal?.aborted) return;
      if ([401, 403].includes(error.response?.status)) logout();
      else setSessionError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    const controller = new AbortController();
    restoreSession(controller.signal);
    return () => controller.abort();
  }, [restoreSession]);

  if (loading) return <Box sx={{ minHeight: '100svh', display: 'grid', placeItems: 'center', bgcolor: '#f4f5f6' }}><CircularProgress aria-label="Opening your locker" sx={{ color: '#34475c' }} /></Box>;
  if (sessionError) return <Box sx={{ minHeight: '100svh', display: 'grid', placeItems: 'center', px: 3 }}>
    <Box sx={{ maxWidth: 440 }}><Alert severity="warning">We couldn’t open your session. Please check your connection and try again.</Alert>
      <Button onClick={() => restoreSession()} sx={{ mt: 2 }}>Try again</Button><Button onClick={logout} sx={{ mt: 2 }}>Back to sign in</Button>
    </Box>
  </Box>;
  return <Index user={user} onSignIn={setUser} onLogout={logout} onUserUpdate={setUser} />;
}

export default App;
