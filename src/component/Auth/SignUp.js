import { Link as RouterLink, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useState } from 'react';
import { Alert, Box, Button, InputAdornment, Link, Paper, TextField, Typography } from '@mui/material';


export default function SignUp() {
    const [errorMessage, setErrorMessage] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isSubmitting) return;
        setErrorMessage('');
        const data = new FormData(event.currentTarget);
        const form = {
        fullname : `${data.get('fname').trim()} ${data.get('lname').trim()}`.trim(),
        email: data.get('email').trim().toLowerCase(),
        password: data.get('password')
        };
        if (!data.get('fname').trim() || !data.get('lname').trim() || !form.email || !form.password) {
            setErrorMessage('Please type in all required information!')
        }
        else {
            setIsSubmitting(true);
            try {
                await axios.post("http://localhost:3005/api/v1/user/signup", form, {
                    headers: {'Content-Type': 'application/json'}
                });
                navigate('/')
            } catch (error) {
                const message = error.response?.data?.message;
                setErrorMessage(
                    Array.isArray(message) ? message.join(' ') :
                    typeof message === 'string' ? message :
                    error.request ? 'Cannot connect to the signup server' : 'Sign up failed'
                );
            } finally {
                setIsSubmitting(false);
            }
        }

    };

    return (
        <Box component="main" sx={{
            minHeight: '100svh', width: '100%', boxSizing: 'border-box', display: 'flex',
            justifyContent: 'center', alignItems: 'center',
            bgcolor: '#eef0f2', color: '#252a30', px: { xs: 2, sm: 3 }, py: 4,
        }}>
            <Paper component="section" aria-labelledby="signup-title" elevation={0} sx={{
                width: '100%', maxWidth: 460, p: { xs: 3, sm: 4 },
                border: '1px solid #dfe3e7', borderRadius: '16px',
                boxShadow: '0 12px 40px #26394e08',
            }}>
                <Typography sx={{ fontWeight: 800, letterSpacing: '-.7px', fontSize: 21, textAlign: 'center' }}>IQLocker</Typography>
                <Typography component="h1" id="signup-title" sx={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.8px', mt: 3, mb: 3.5, textAlign: 'center' }}>Create your own space</Typography>
                <Box component="form" onSubmit={handleSubmit} aria-busy={isSubmitting} sx={{
                    display: 'flex', flexDirection: 'column', gap: 2.5,
                    '& .MuiOutlinedInput-root': { bgcolor: '#fff', borderRadius: '8px', fontSize: 14, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#496788' } },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#496788' },
                }}>
                    {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2.5 }}>
                        <TextField label="First name" name="fname" autoComplete="given-name" required fullWidth disabled={isSubmitting} />
                        <TextField label="Last name" name="lname" autoComplete="family-name" required fullWidth disabled={isSubmitting} />
                    </Box>
                    <TextField label="Email address" name="email" type="email" autoComplete="email" required fullWidth disabled={isSubmitting} />
                    <TextField label="Password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required fullWidth disabled={isSubmitting}
                        helperText="Use at least 8 characters (maximum 72 UTF-8 bytes)."
                        slotProps={{
                            htmlInput: { minLength: 8 },
                            input: { endAdornment: <InputAdornment position="end">
                                <Button type="button" disabled={isSubmitting} onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}
                                    sx={{ minWidth: 42, color: '#657181', textTransform: 'none', fontSize: 11 }}>
                                    {showPassword ? 'Hide' : 'Show'}
                                </Button>
                            </InputAdornment> },
                        }} />
                    <Button type="submit" variant="contained" disabled={isSubmitting} disableElevation sx={{
                        bgcolor: '#34475c', '&:hover': { bgcolor: '#26394e' }, textTransform: 'none',
                        borderRadius: '8px', py: 1.6, mt: 0.5, fontWeight: 600, justifyContent: 'space-between', px: 2.5,
                    }}>
                        {isSubmitting ? 'Creating account…' : 'Create account'}<Box component="span" aria-hidden="true">→</Box>
                    </Button>
                </Box>
                <Typography sx={{ textAlign: 'center', fontSize: 13, color: '#7c8490', mt: 3.5 }}>
                    Already have an account?{' '}
                    <Link component={RouterLink} to="/" sx={{ color: '#34475c', fontWeight: 600, textUnderlineOffset: '4px' }}>Sign in</Link>
                </Typography>
            </Paper>
        </Box>
    );
}
