import { useRef, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { courseError } from '../Courses/CourseDialogs';
export default function MaterialDialog({ material, deleting, onClose, onSubmit }) {
  const [title, setTitle] = useState(material.title);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const submit = async (event) => {
    event.preventDefault();
    if (locked.current) return;
    if (!deleting && (!title.trim() || title.trim().length > 160)) { setError('Enter a title of 1–160 characters.'); return; }
    locked.current = true; setBusy(true); setError('');
    try { await onSubmit(title.trim()); }
    catch (err) { setError(courseError(err, 'We couldn’t save this change. Please try again.')); }
    finally { locked.current = false; setBusy(false); }
  };
  return <Dialog open fullWidth maxWidth="xs" onClose={() => { if (!locked.current) onClose(); }} aria-labelledby="material-dialog-title"><Box component="form" onSubmit={submit}>
    <DialogTitle id="material-dialog-title">{deleting ? 'Delete document?' : 'Rename document'}</DialogTitle>
    <DialogContent sx={{ pt: '12px !important' }}>{error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}{deleting ? <Typography sx={{ overflowWrap: 'anywhere', fontSize: 14 }}>Delete “{material.title}”? This cannot be undone. Failed storage cleanup will be retried.</Typography> : <TextField autoFocus required fullWidth label="Document title" value={title} onChange={(event) => setTitle(event.target.value)} disabled={busy} slotProps={{ htmlInput: { maxLength: 160 } }} />}</DialogContent>
    <DialogActions sx={{ p: 3 }}><Button autoFocus={deleting} disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy} color={deleting ? 'error' : 'primary'} variant="contained">{busy ? 'Saving…' : deleting ? 'Delete document' : 'Save title'}</Button></DialogActions>
  </Box></Dialog>;
}
