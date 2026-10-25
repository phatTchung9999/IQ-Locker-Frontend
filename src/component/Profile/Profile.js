import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Avatar, Box, Button, CircularProgress, IconButton, Paper, Popover, SvgIcon, TextField, Typography } from '@mui/material';
import { api } from '../../utils/api';
import { splitFullname } from '../../utils/account';

export default function Profile({ user, onUserUpdate, onLogout }) {
  const [firstName, setFirstName] = useState(() => splitFullname(user.fullname).firstName);
  const [lastName, setLastName] = useState(() => splitFullname(user.fullname).lastName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarError, setAvatarError] = useState('');
  const [avatarAnchor, setAvatarAnchor] = useState(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);
  const [school, setSchool] = useState(user.school ?? '');
  const [major, setMajor] = useState(user.major ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const avatarInput = useRef(null);
  const request = useRef(null);
  const navigate = useNavigate();
  const normalizedName = `${firstName.trim()} ${lastName.trim()}`.trim().replace(/\s+/g, ' ');
  const normalize = (value) => value.trim().replace(/\s+/g, ' ');
  const changed = normalizedName !== user.fullname || normalize(phone) !== (user.phone ?? '') ||
    normalize(school) !== (user.school ?? '') || normalize(major) !== (user.major ?? '');
  const initials = user.fullname.trim().split(/\s+/).map((part) => Array.from(part)[0]);
  const avatar = `${initials[0]}${initials.length > 1 ? initials[initials.length - 1] : ''}`.toUpperCase();

  useEffect(() => {
    setFirstName(splitFullname(user.fullname).firstName);
    setLastName(splitFullname(user.fullname).lastName);
    setPhone(user.phone ?? '');
    setSchool(user.school ?? '');
    setMajor(user.major ?? '');
  }, [user.fullname, user.phone, user.school, user.major]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview); }, [avatarPreview]);

  const closeAvatarPicker = () => {
    setAvatarAnchor(null);
    setDragging(false);
    dragDepth.current = 0;
  };

  const acceptAvatar = (files) => {
    if (saving || !files?.length) return;
    setAvatarError('');
    if (files.length !== 1) {
      setAvatarError('Please choose one photo at a time.');
      return;
    }
    const file = files[0];
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setAvatarError('Choose a JPG, PNG, or WebP image no larger than 5 MB.');
      return;
    }
    setAvatarPreview(URL.createObjectURL(file));
    setSuccess(false);
    closeAvatarPicker();
  };

  const selectAvatar = (event) => {
    acceptAvatar(event.target.files);
    event.target.value = '';
  };

  const dropAvatar = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragDepth.current = 0;
    setDragging(false);
    acceptAvatar(event.dataTransfer.files);
  };

  const cancel = () => {
    setFirstName(splitFullname(user.fullname).firstName);
    setLastName(splitFullname(user.fullname).lastName);
    setAvatarPreview('');
    setAvatarError('');
    setSchool(user.school ?? '');
    setMajor(user.major ?? '');
    setPhone(user.phone ?? '');
    setError('');
    setSuccess(false);
  };

  const save = async (event) => {
    event.preventDefault();
    if (saving || request.current || !changed) return;
    setSuccess(false);
    setError('');
    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }
    if (normalizedName.length > 100) {
      setError('Keep your combined name within 100 characters.');
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setSaving(true);
    try {
      const { data } = await api.patch('/api/v1/user/me', { fullname: normalizedName, phone: normalize(phone), school: normalize(school), major: normalize(major) }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }, signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (typeof data?.fullname !== 'string' || !data.fullname.trim() || data.email !== user.email ||
          !['phone', 'school', 'major'].every((field) => typeof data[field] === 'string')) {
        throw new Error('We couldn’t confirm your updated profile. Please try again.');
      }
      onUserUpdate(data);
      setSuccess(true);
    } catch (err) {
      if (controller.signal.aborted) return;
      if ([401, 403].includes(err.response?.status)) {
        onLogout();
        navigate('/', { replace: true });
        return;
      }
      const message = err.response?.data?.message;
      setError(Array.isArray(message) ? message.join(' ') : typeof message === 'string' ? message :
        err.request ? 'We couldn’t save your changes. Check your connection and try again.' : err.message || 'Unable to save your profile. Please try again.');
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setSaving(false);
    }
  };

  const cardStyle = { border: '1px solid #e2e5e9', borderRadius: '14px', bgcolor: '#fff', p: { xs: 2.5, sm: 3.5 } };
  const previewChanges = Boolean(avatarPreview || avatarError);

  return <Box sx={{ width: '100%', maxWidth: 1120 }}>
    <Paper elevation={0} sx={{ ...cardStyle, display: 'flex', alignItems: 'center', flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2.5, sm: 4 }, mb: 3, py: { xs: 3.5, sm: 4.5 }, backgroundImage: 'linear-gradient(110deg, #f5f7fa, #fff)' }}>
      <Box sx={{ position: 'relative', flexShrink: 0 }}>
        <Avatar src={avatarPreview || undefined} alt={user.fullname} sx={{ width: { xs: 112, sm: 144 }, height: { xs: 112, sm: 144 }, bgcolor: '#dfe5ed', color: '#485b70', fontSize: { xs: 38, sm: 46 }, fontWeight: 600, border: '5px solid #fff', boxShadow: '0 3px 16px #34475c10' }}
          slotProps={{ img: { onError: () => { setAvatarPreview(''); setAvatarError('This image couldn’t be opened. Please choose another file.'); } } }}>{avatar}</Avatar>
        <IconButton type="button" aria-label="Change avatar" aria-haspopup="dialog" aria-expanded={Boolean(avatarAnchor)} aria-controls={avatarAnchor ? 'avatar-picker' : undefined}
          disabled={saving} onClick={(event) => { setAvatarAnchor(event.currentTarget); setAvatarError(''); }}
          sx={{ position: 'absolute', right: 2, bottom: 2, width: 38, height: 38, bgcolor: '#34475c', color: '#fff', border: '3px solid #fff', boxShadow: '0 2px 8px #34475c22', '&:hover': { bgcolor: '#26394e' } }}>
          <SvgIcon sx={{ fontSize: 19 }} viewBox="0 0 24 24"><path d="M4 6h4l2-3h4l2 3h4v15H4z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><circle cx="12" cy="13" r="4" fill="none" stroke="currentColor" strokeWidth="1.7" /></SvgIcon>
        </IconButton>
      </Box>
      <Box sx={{ minWidth: 0, flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
        <Typography sx={{ fontSize: { xs: 23, sm: 27 }, fontWeight: 600, letterSpacing: '-.5px', overflowWrap: 'anywhere' }}>{user.fullname}</Typography>
        <Typography sx={{ fontSize: 13, color: '#8792a0', mt: 1, overflowWrap: 'anywhere' }}>{user.email}</Typography>
        {avatarPreview && <Typography sx={{ fontSize: 11, color: '#919ba8', mt: 1.5 }}>Avatar preview · not saved</Typography>}
      </Box>
    </Paper>
    <input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Avatar image" hidden onChange={selectAvatar} />
    <Popover open={Boolean(avatarAnchor)} anchorEl={avatarAnchor} onClose={closeAvatarPicker}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      marginThreshold={16} slotProps={{ paper: { sx: { mt: 1, width: 320, maxWidth: 'calc(100vw - 32px)', borderRadius: '14px', border: '1px solid #e2e5e9', boxShadow: '0 12px 40px #26394e22' } } }}>
      <Box role="dialog" id="avatar-picker" aria-labelledby="avatar-picker-title" sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography component="h2" id="avatar-picker-title" sx={{ fontSize: 15, fontWeight: 600, color: '#34475c' }}>Change avatar</Typography>
          <IconButton aria-label="Close avatar picker" onClick={closeAvatarPicker} size="small"><SvgIcon sx={{ fontSize: 18 }}><path d="m6 6 12 12M6 18 18 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></SvgIcon></IconButton>
        </Box>
        <Box aria-label="Photo drop area" onDragEnter={(event) => { event.preventDefault(); dragDepth.current += 1; setDragging(true); }}
          onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }}
          onDragLeave={(event) => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); }} onDrop={dropAvatar}
          sx={{ textAlign: 'center', border: '2px dashed', borderColor: dragging ? '#496788' : '#d2dbe5', bgcolor: dragging ? '#e7edf5' : '#f7f9fb', borderRadius: '10px', px: 2, py: 3 }}>
          <SvgIcon sx={{ color: '#7c8da2', fontSize: 30, mb: 1 }}><path d="M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></SvgIcon>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#53647a' }}>{dragging ? 'Drop your photo here' : 'Drag and drop your photo'}</Typography>
          <Button type="button" onClick={() => avatarInput.current?.click()} sx={{ textTransform: 'none', fontSize: 12, color: '#40566e', mt: 0.5 }}>or browse files</Button>
        </Box>
        <Typography sx={{ fontSize: 10, color: '#8792a0', mt: 1.5, lineHeight: 1.8 }}>JPG, PNG or WebP · Up to 5 MB<br />Local preview only — not saved</Typography>
        {avatarError && <Alert severity="error" sx={{ mt: 2 }}>{avatarError}</Alert>}
        {avatarPreview && <Button type="button" onClick={() => { setAvatarPreview(''); closeAvatarPicker(); }} sx={{ textTransform: 'none', color: '#697789', fontSize: 12, mt: 1.5 }}>Remove preview</Button>}
      </Box>
    </Popover>
    {avatarError && !avatarAnchor && <Alert severity="error" sx={{ mb: 3 }}>{avatarError}</Alert>}
    <Box component="form" onSubmit={save} aria-busy={saving} sx={{ display: 'grid', gap: 3,
      '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: '8px', '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#496788' } },
      '& .MuiInputLabel-root.Mui-focused': { color: '#496788' },
    }}>
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success" role="status">Your profile has been saved.</Alert>}
      <Paper component="section" aria-labelledby="personal-information" elevation={0} sx={cardStyle}>
        <Typography component="h2" id="personal-information" sx={{ fontSize: 16, fontWeight: 600 }}>Personal information</Typography>
        <Typography sx={{ fontSize: 12, color: '#8792a0', mt: 1, mb: 3, lineHeight: 1.8 }}>Your name appears across your workspace. Changing it also updates your personal URL.</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
          <TextField label="First name" name="firstName" value={firstName} required fullWidth disabled={saving}
            autoComplete="given-name" slotProps={{ htmlInput: { maxLength: 100 } }}
            onChange={(event) => { setFirstName(event.target.value); setError(''); setSuccess(false); }} />
          <TextField label="Last name" name="lastName" value={lastName} required fullWidth disabled={saving}
            autoComplete="family-name" slotProps={{ htmlInput: { maxLength: 100 } }}
            onChange={(event) => { setLastName(event.target.value); setError(''); setSuccess(false); }} />
          <TextField label="Email address" value={user.email} type="email" fullWidth disabled slotProps={{ input: { readOnly: true } }} helperText="Your sign-in email is read-only."
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#f0f2f4', color: '#788390' }, '& .MuiInputLabel-root': { color: '#8792a0' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e0e4e8' } }} />
          <TextField label="Phone number" name="phone" type="tel" autoComplete="tel" placeholder="Enter your phone number" value={phone} onChange={(event) => { setPhone(event.target.value); setError(''); setSuccess(false); } } disabled={saving} fullWidth slotProps={{ htmlInput: { maxLength: 40 } }} />
          <TextField label="School name" placeholder="Enter your school or university" value={school} onChange={(event) => { setSchool(event.target.value); setError(''); setSuccess(false); } } disabled={saving} fullWidth slotProps={{ htmlInput: { maxLength: 150 } }} />
          <TextField label="Major or field of study" placeholder="Enter your major" value={major} onChange={(event) => { setMajor(event.target.value); setError(''); setSuccess(false); } } disabled={saving} fullWidth slotProps={{ htmlInput: { maxLength: 150 } }} />
        </Box>
      </Paper>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', pb: 1 }}>
        <Typography sx={{ fontSize: 11, color: '#8792a0', maxWidth: 440, lineHeight: 1.8 }}>Your details are saved to your account. Avatar changes are still local previews.</Typography>
        <Box sx={{ display: 'flex', gap: 1.5, ml: 'auto' }}>
          <Button type="button" onClick={cancel} disabled={saving || (!changed && !error && !success && !previewChanges)} sx={{ textTransform: 'none', color: '#697789', px: 2 }}>Cancel</Button>
          <Button type="submit" disabled={saving || !changed} variant="contained" disableElevation sx={{ bgcolor: '#34475c', '&:hover': { bgcolor: '#26394e' }, textTransform: 'none', borderRadius: '8px', px: 2.5, minWidth: 145 }}>
            {saving ? 'Saving…' : 'Save changes'}{saving && <CircularProgress size={15} color="inherit" aria-label="Saving profile" sx={{ ml: 1.5 }} />}
          </Button>
        </Box>
      </Box>
    </Box>
  </Box>;
}
