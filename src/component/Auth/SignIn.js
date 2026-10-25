import axios from 'axios';
import { api } from '../../utils/api';
import { accountPath } from '../../utils/account';
import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, InputAdornment, Link, Paper, TextField, Typography } from '@mui/material';

export default function SignIn({ onSignIn }) {
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage('');

    const formData = new FormData(event.currentTarget);

    const form = {
      email: formData.get('email'),
      password: formData.get('password'),
    };

    try {
      const { data } = await api.post('/api/v1/user/signin', form);
      if (typeof data?.token !== 'string' || !data.token ||
          typeof data.user?.fullname !== 'string' || !data.user.fullname.trim() ||
          typeof data.user.email !== 'string') {
        throw new Error('Unable to open your account. Please try again.');
      }
      localStorage.setItem('token', data.token);
      onSignIn(data.user);
      navigate(accountPath(data.user), { replace: true });

    } catch (error) {
      if (axios.isAxiosError(error)) {
        setErrorMessage(
          error.response?.data?.message ??
          (error.request
            ? 'Cannot connect to the sign-in server'
            : 'Sign in failed')
        );
      } else {
        setErrorMessage(error.message || 'Something went wrong');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box component="main" sx={{
      minHeight: '100svh', width: '100%', display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
      bgcolor: '#fafafa', color: '#252a30',
    }}>
      <Box component="section" aria-labelledby="locker-title" sx={{
        position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        bgcolor: '#e7e8ea', backgroundImage: 'radial-gradient(ellipse at 50% 45%, #f4f4f5 0%, #e1e3e6 75%)',
        px: { xs: 3, md: 6 }, pt: { xs: 3, md: 4 }, pb: 3,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box aria-hidden="true" sx={{ width: 31, height: 35, border: '2px solid #414954', borderRadius: '5px', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 11 }}>IQ</Box>
          <Typography sx={{ fontWeight: 800, letterSpacing: '-.7px', fontSize: 21 }}>IQLocker</Typography>
        </Box>
        <Box sx={{ textAlign: 'center', my: 'auto', pt: { xs: 3, md: 5 }, pb: 2 }}>
          <Typography sx={{ fontSize: 10, letterSpacing: '2.5px', fontWeight: 700, color: '#66707b' }}>MAKE ROOM FOR WHAT’S NEXT</Typography>
          <Typography id="locker-title" component="h1" sx={{ fontWeight: 700, fontSize: { xs: 30, md: 38 }, lineHeight: 1.2, letterSpacing: '-1.4px', mt: 1.5 }}>Big ideas. One locker.</Typography>
          <Typography sx={{ color: '#68717c', fontSize: 13, mt: 1.5 }}>Store Smart. Analyze Smarter.</Typography>

          <Box aria-hidden="true" sx={{
            width: { xs: 'min(48vw, 190px)', md: 'clamp(190px, 18vw, 250px)' }, height: { xs: 245, md: 330 }, mx: 'auto', mt: { xs: 4, md: 5 }, mb: 3,
            position: 'relative', perspective: '1200px', perspectiveOrigin: 'left center',
            transform: 'translateX(24px)',
            '&::after': { content: '""', position: 'absolute', bottom: -15, left: '-15%', width: '130%', height: 20, bgcolor: '#48515d33', filter: 'blur(14px)', borderRadius: '50%' },
          }}>
            <Box sx={{
              position: 'absolute', inset: 0, border: '9px solid #8d959f', borderRadius: '8px',
              bgcolor: '#555e69', backgroundImage: 'linear-gradient(100deg, #414b57, #717b87)',
              boxShadow: 'inset 8px 0 20px #222a3555, 12px 15px 25px #41495422',
            }}>
              <Box sx={{ position: 'absolute', top: 20, left: 17, right: 17, textAlign: 'left', bgcolor: '#f1f0ec', p: { xs: 1.5, md: 2 }, borderRadius: '3px', transform: 'rotate(-5deg)', boxShadow: '0 4px 9px #0002' }}>
                <Typography sx={{ fontSize: 8, color: '#8a9198', letterSpacing: 1 }}>THIS SEMESTER</Typography>
                <Typography sx={{ color: '#444e5c', fontSize: { xs: 12, md: 15 }, fontWeight: 700, mt: 1 }}>Ideas worth keeping.</Typography>
                {[75, 90, 55].map((width) => <Box key={width} sx={{ height: 3, width: `${width}%`, bgcolor: '#d3d7dc', mt: 1.3 }} />)}
              </Box>
              <Box sx={{ position: 'absolute', bottom: 18, left: 15, right: 15, display: 'flex', alignItems: 'flex-end', gap: '6px', borderBottom: '6px solid #9ca5af', pb: 0.5 }}>
                {[
                  ['NOTES', '#b3c5db', 100], ['SYLLABUS', '#e2ddd2', 114], ['EXAMS', '#a6b3a9', 94],
                ].map(([label, color, height]) => (
                  <Box key={label} sx={{ height: { xs: height * 0.7, md: height }, flex: 1, bgcolor: color, borderRadius: '3px 3px 0 0', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: 'inset -4px 0 #0000000d' }}>
                    <Typography sx={{ writingMode: 'vertical-rl', fontSize: 8, fontWeight: 700, letterSpacing: 1.5, color: '#3e4854' }}>{label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
            <Box sx={{
              position: 'absolute', inset: 0, zIndex: 1,
              transformOrigin: 'left center', transform: 'rotateY(-106deg)', transformStyle: 'preserve-3d',
              animation: 'locker-open 2200ms cubic-bezier(.45,0,.2,1) both',
              '@keyframes locker-open': { from: { transform: 'rotateY(0deg)' }, to: { transform: 'rotateY(-106deg)' } },
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }}>
              <Box sx={{
                position: 'absolute', inset: 0, border: '2px solid #8b949f', borderRadius: '7px',
                background: 'linear-gradient(105deg, #c3c8cf, #a3abb6 70%, #919ba7)',
                backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                transform: 'translateZ(1px)', boxShadow: 'inset 3px 0 8px #ffffff44',
              }}>
                {[0, 1].map((group) => <Box key={group} sx={{ position: 'absolute', top: group ? '76%' : '12%', left: '24%', right: '24%' }}>
                  {[0, 1, 2].map((vent) => <Box key={vent} sx={{ height: 4, bgcolor: '#65707d', borderBottom: '1px solid #d5d9de', borderRadius: 1, mb: '6px' }} />)}
                </Box>)}
                <Box sx={{ position: 'absolute', right: '11%', top: '44%', width: 15, height: 43, borderRadius: '4px', bgcolor: '#4d5866', boxShadow: 'inset 2px 2px 3px #0003' }}>
                  <Box sx={{ width: 5, height: 25, bgcolor: '#d5dae0', borderRadius: 1, m: '5px auto' }} />
                </Box>
                <Box sx={{ position: 'absolute', top: '30%', left: '32%', right: '32%', bgcolor: '#dde1e5', border: '1px solid #8a939e', borderRadius: 1, py: 0.5 }}>
                  <Typography sx={{ fontSize: 10, color: '#66707b', fontWeight: 700 }}>IQ — 01</Typography>
                </Box>
              </Box>
              <Box sx={{
                position: 'absolute', inset: 0, border: '2px solid #858f9b', borderRadius: '7px',
                background: 'linear-gradient(95deg, #9ea8b4, #bac1ca)',
                backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg) translateZ(1px)',
                boxShadow: 'inset 0 0 0 9px #ffffff12, inset 0 0 0 11px #78849255',
              }}>
                {[0, 1].map((group) => <Box key={group} sx={{ position: 'absolute', top: group ? '76%' : '12%', left: '24%', right: '24%' }}>
                  {[0, 1, 2].map((vent) => <Box key={vent} sx={{ height: 4, bgcolor: '#7d8896', borderBottom: '1px solid #d5d9de', borderRadius: 1, mb: '6px' }} />)}
                </Box>)}
                <Box sx={{ position: 'absolute', left: '11%', top: '45%', width: 10, height: 30, borderRadius: 1, bgcolor: '#7d8896', border: '1px solid #687585' }} />
              </Box>
            </Box>
          </Box>
          <Typography sx={{ fontSize: 12, lineHeight: 1.8, color: '#68717c', maxWidth: 285, mx: 'auto', mt: 4 }}>Your notes, your courses, your potential.<br />Keep it all together.</Typography>
        </Box>
        <Typography sx={{ color: '#727b86', fontSize: 10, mt: 3 }}>A little organization. A lot of possibility.</Typography>
      </Box>

      <Box component="section" aria-labelledby="login-title" sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', px: { xs: 3, md: 5 }, py: { xs: 6, md: 8 }, position: 'relative' }}>
        <Paper elevation={0} sx={{ width: '100%', maxWidth: 400, bgcolor: 'transparent' }}>
          <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#78828e', letterSpacing: 2 }}>YOUR SPACE TO GROW</Typography>
          <Typography component="h2" id="login-title" sx={{ fontSize: { xs: 32, md: 38 }, fontWeight: 700, letterSpacing: '-1.3px', mt: 1.5 }}>Welcome back.</Typography>
          <Typography sx={{ color: '#78818c', fontSize: 14, mt: 1, mb: 4 }}>Sign in and open up to what’s next.</Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5,
            '& .MuiOutlinedInput-root': { bgcolor: '#fff', borderRadius: '8px', fontSize: 14, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#496788' } },
            '& .MuiInputLabel-root.Mui-focused': { color: '#496788' },
          }}>
            {errorMessage && <Alert severity="error">{Array.isArray(errorMessage) ? errorMessage.join(' ') : errorMessage}</Alert>}
            <TextField label="Email address" name="email" type="email" autoComplete="username" required fullWidth />
            <TextField label="Password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required fullWidth
              slotProps={{ input: { endAdornment: <InputAdornment position="end"><Button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} sx={{ minWidth: 42, color: '#657181', textTransform: 'none', fontSize: 11 }}>{showPassword ? 'Hide' : 'Show'}</Button></InputAdornment> } }} />
            <Button type="submit" disabled={isSubmitting} variant="contained" disableElevation sx={{ bgcolor: '#34475c', '&:hover': { bgcolor: '#26394e' }, textTransform: 'none', borderRadius: '8px', py: 1.6, mt: 0.5, fontWeight: 600, justifyContent: 'space-between', px: 2.5 }}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
              <Box component="span" sx={{ width: 18, height: 18, display: 'grid', placeItems: 'center' }}>
                {isSubmitting ? <CircularProgress size={18} thickness={4} color="inherit" aria-label="Signing in" /> : <Box component="span" aria-hidden="true">→</Box>}
              </Box>
            </Button>
          </Box>
          <Typography sx={{ textAlign: 'center', fontSize: 13, color: '#7c8490', mt: 3.5 }}>New to IQLocker?{' '}<Link component={RouterLink} to="/signup" sx={{ color: '#34475c', fontWeight: 600, textUnderlineOffset: '4px' }}>Create an account</Link></Typography>
        </Paper>
        <Typography sx={{ fontSize: 10, color: '#8b939c', mt: 7, position: { md: 'absolute' }, bottom: 27 }}>IQLocker · Store Smart. Analyze Smarter.</Typography>
      </Box>
    </Box>
  );
}
