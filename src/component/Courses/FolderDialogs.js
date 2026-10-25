import { useRef, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { courseError } from './CourseDialogs';
export default function FolderDialog({ folder, deleting, onClose, onSubmit }) {
  const [name, setName] = useState(folder?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const title = deleting ? 'Delete folder?' : folder ? 'Edit folder' : 'Create folder';
  const submit = async (event) => {
    event.preventDefault();
    if (locked.current) return;
    const normalized = name.trim().replace(/\s+/g, ' ');
    if (!deleting && (!normalized || normalized.length > 120)) { setError('Enter a folder name of 1–120 characters.'); return; }
    locked.current = true; setBusy(true); setError('');
    try { await onSubmit({ name: normalized }); }
    catch (err) { setError(courseError(err, 'We couldn’t save this change. Please try again.')); }
    finally { locked.current = false; setBusy(false); }
  };
  return <Dialog open fullWidth maxWidth="xs" onClose={() => { if (!locked.current) onClose(); }} aria-labelledby="folder-dialog-title">
    <Box component="form" onSubmit={submit} aria-busy={busy}>
      <DialogTitle id="folder-dialog-title">{title}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2.5, pt: '12px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        {deleting ? <Typography sx={{ fontSize: 14, color: '#667487', overflowWrap: 'anywhere' }}>Delete “{folder.name}”? Only empty folders can be deleted. This cannot be undone.</Typography> : <>
          <TextField autoFocus required label="Folder name" value={name} onChange={(event) => setName(event.target.value)} disabled={busy} fullWidth slotProps={{ htmlInput: { maxLength: 120 } }} />

        </>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button autoFocus={deleting} disabled={busy} onClick={onClose} sx={{ textTransform: 'none', color: '#697789' }}>Cancel</Button>
        <Button type="submit" disabled={busy} variant="contained" color={deleting ? 'error' : 'primary'} disableElevation sx={{ textTransform: 'none', ...(deleting ? {} : { bgcolor: '#34475c' }) }}>{busy ? 'Saving…' : deleting ? 'Delete folder' : folder ? 'Save changes' : 'Create folder'}</Button>
      </DialogActions>
    </Box>
  </Dialog>;
}
