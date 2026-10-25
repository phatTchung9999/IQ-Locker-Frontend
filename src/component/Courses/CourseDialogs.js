import { useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';

export function courseError(error, fallback) {
  const message = error.response?.data?.message;
  return Array.isArray(message) ? message.join(' ') : typeof message === 'string' ? message : fallback;
}

export function CourseEditor({ course, onClose, onSave }) {
  const [name, setName] = useState(course?.name ?? '');
  const [code, setCode] = useState(course?.code ?? '');
  const [semester, setSemester] = useState(course?.semester ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const title = course ? 'Edit course' : 'Create course';

  const submit = async (event) => {
    event.preventDefault();
    if (locked.current) return;
    const normalize = (text) => text.trim().replace(/\s+/g, ' ');
    const fields = { name: normalize(name), code: normalize(code), semester: normalize(semester) };
    if (!fields.name) { setError('Enter a course name.'); return; }
    if (fields.name.length > 120 || fields.code.length > 40 || fields.semester.length > 80) {
      setError('Keep the name within 120 characters, code within 40, and semester within 80.'); return;
    }
    locked.current = true;
    setSaving(true);
    setError('');
    try { await onSave(fields); }
    catch (err) { setError(courseError(err, 'We couldn’t save your course. Please try again.')); }
    finally { locked.current = false; setSaving(false); }
  };

  return <Dialog open onClose={() => { if (!locked.current) onClose(); }} fullWidth maxWidth="xs" aria-labelledby="course-editor-title">
    <Box component="form" onSubmit={submit} aria-busy={saving} sx={{
      '& .MuiOutlinedInput-root': { fontSize: 14, borderRadius: '8px', '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#496788' } },
      '& .MuiInputLabel-root.Mui-focused': { color: '#496788' },
    }}>
      <DialogTitle id="course-editor-title" sx={{ fontWeight: 600 }}>{title}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2.5, pt: '12px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField autoFocus label="Course name" value={name} onChange={(event) => setName(event.target.value)} required disabled={saving} fullWidth slotProps={{ htmlInput: { maxLength: 120 } }} />
        <TextField label="Course code (optional)" value={code} onChange={(event) => setCode(event.target.value)} disabled={saving} fullWidth slotProps={{ htmlInput: { maxLength: 40 } }} />
        <TextField label="Semester (optional)" placeholder="e.g. Fall 2026" value={semester} onChange={(event) => setSemester(event.target.value)} disabled={saving} fullWidth slotProps={{ htmlInput: { maxLength: 80 } }} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button disabled={saving} onClick={onClose} sx={{ color: '#697789', textTransform: 'none' }}>Cancel</Button>
        <Button type="submit" disabled={saving} variant="contained" disableElevation sx={{ bgcolor: '#34475c', '&:hover': { bgcolor: '#26394e' }, textTransform: 'none', borderRadius: '8px' }}>
          {saving ? 'Saving…' : course ? 'Save changes' : 'Create course'}{saving && <CircularProgress size={14} color="inherit" sx={{ ml: 1.5 }} aria-label="Saving course" />}
        </Button>
      </DialogActions>
    </Box>
  </Dialog>;
}

export function DeleteCourseDialog({ course, onClose, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const remove = async () => {
    if (locked.current) return;
    locked.current = true;
    setDeleting(true);
    setError('');
    try { await onDelete(); }
    catch (err) { setError(courseError(err, 'We couldn’t delete this course. Please try again.')); }
    finally { locked.current = false; setDeleting(false); }
  };
  return <Dialog open onClose={() => { if (!locked.current) onClose(); }} fullWidth maxWidth="xs" aria-labelledby="delete-course-title">
    <DialogTitle id="delete-course-title">Delete course?</DialogTitle>
    <DialogContent>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Typography sx={{ fontSize: 14, color: '#667487', overflowWrap: 'anywhere' }}>Delete “{course.name}”? This removes the course folder and cannot be undone.</Typography>
      <Typography sx={{ fontSize: 12, color: '#8792a0', mt: 1.5 }}>Empty starter folders are removed with the course. Remove custom folders and contents first.</Typography>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
      <Button autoFocus disabled={deleting} onClick={onClose} sx={{ textTransform: 'none', color: '#697789' }}>Cancel</Button>
      <Button disabled={deleting} onClick={remove} variant="contained" color="error" disableElevation sx={{ textTransform: 'none', borderRadius: '8px' }}>{deleting ? 'Deleting…' : 'Delete course'}</Button>
    </DialogActions>
  </Dialog>;
}
