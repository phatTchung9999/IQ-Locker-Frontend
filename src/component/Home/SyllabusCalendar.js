import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { api } from '../../utils/api';
import { courseOptions } from '../Courses/courseData';
import SyllabusReview from '../Materials/SyllabusReview';

const day = value => value.toISOString().slice(0, 10);
const today = () => new Date();
const monthOf = date => date.slice(0, 7) + '-01';

export default function SyllabusCalendar({ onUnauthorized, basePath }) {
  const [params] = useSearchParams();
  const materialId = params.get('materialId');
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState(false);
  const [month, setMonth] = useState(null);
  const [open, setOpen] = useState(null);
  const [reload, setReload] = useState(0);
  useEffect(() => { setMonth(null); setOpen(null); }, [materialId]);
  useEffect(() => {
    const controller = new AbortController();
    setError(false); setGroups(null);
    api.get('/api/v1/deadlines/calendar', { ...courseOptions(controller.signal), params: materialId ? { materialId } : {} })
      .then(({ data }) => { if (!controller.signal.aborted) setGroups(data); })
      .catch(err => { if (!controller.signal.aborted) err.response?.status === 401 ? onUnauthorized() : setError(true); });
    return () => controller.abort();
  }, [materialId, onUnauthorized, reload]);
  const entries = (groups ?? []).flatMap(group => group.entries.filter(entry => entry.status !== 'dismissed').map(entry => ({ ...entry, group })));
  const first = entries.map(row => row.date ?? row.dateRange?.start).filter(Boolean).sort()[0];
  const selected = month ?? monthOf((materialId && first) || day(today()));
  const start = new Date(selected + 'T00:00:00Z');
  const shift = offset => setMonth(day(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1))));
  const days = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  const item = (row, key) => <Button key={key} size="small" fullWidth onClick={() => setOpen(row)}
    sx={{ justifyContent: 'flex-start', textAlign: 'left', textTransform: 'none', overflowWrap: 'anywhere', lineHeight: 1.3,
      bgcolor: row.status === 'confirmed' ? '#d9f2df' : '#fff0b3', color: '#253245', mb: 0.5 }}>
    {row.title} · {row.status === 'confirmed' ? 'Confirmed' : 'Needs review'}{row.dateRange ? ' · Period' : ''}
  </Button>;
  return <Box>
    {materialId && <Button component={Link} to={basePath + '/upcoming'}>Show all syllabi</Button>}
    {error ? <Alert severity="warning" action={<Button onClick={() => setReload(n => n + 1)}>Retry</Button>}>Couldn’t load the calendar.</Alert>
      : groups === null ? <CircularProgress aria-label="Loading calendar" /> : <>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr auto 1fr' },
        alignItems: 'center', gap: 1.5, mb: 2, p: { xs: 1.5, sm: 2 }, bgcolor: '#eef2f7',
        border: '1px solid #dbe3ed', borderRadius: 2 }}>
        <Typography component="h2" aria-live="polite" fontWeight={800} textAlign="center"
          sx={{ gridColumn: { xs: '1 / -1', sm: 2 }, gridRow: 1, color: '#26394e', fontSize: { xs: 24, sm: 30 } }}>
          {start.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })}
        </Typography>
        <Button variant="outlined" onClick={() => shift(-1)} aria-label="Previous month"
          sx={{ gridColumn: 1, gridRow: { xs: 2, sm: 1 }, justifySelf: 'start', bgcolor: 'white', minHeight: 44, textTransform: 'none' }}>
          <Box component="span" aria-hidden sx={{ mr: 1 }}>‹</Box>Previous
        </Button>
        <Button variant="outlined" onClick={() => shift(1)} aria-label="Next month"
          sx={{ gridColumn: { xs: 2, sm: 3 }, gridRow: { xs: 2, sm: 1 }, justifySelf: 'end', bgcolor: 'white', minHeight: 44, textTransform: 'none' }}>
          Next<Box component="span" aria-hidden sx={{ ml: 1 }}>›</Box>
        </Button>
      </Box>
      {!entries.length && <Typography sx={{ mb: 2 }}>No suggestions yet.</Typography>}
      <Box sx={{ overflowX: 'auto' }}><Box sx={{ minWidth: 630, display: 'grid', gridTemplateColumns: 'repeat(7,minmax(0,1fr))', gap: 0.5 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(label => <Typography key={label} variant="caption" textAlign="center">{label}</Typography>)}
        {Array.from({ length: start.getUTCDay() }, (_, i) => <Box key={'empty-' + i} />)}
        {Array.from({ length: days }, (_, i) => {
          const date = selected.slice(0, 8) + String(i + 1).padStart(2, '0');
          return <Box key={date} sx={{ minHeight: 84, p: 0.5, border: '1px solid #e2e5e9', borderRadius: 1, bgcolor: 'white' }}>
            <Typography component="time" dateTime={date} variant="caption">{i + 1}</Typography>
            {entries.filter(row => row.date === date || (row.dateRange && row.dateRange.start <= date && row.dateRange.end >= date))
              .map(row => item(row, row.group.jobId + ':' + row.index))}
          </Box>;
        })}
      </Box></Box>
      {entries.some(row => !row.date && !row.dateRange) && <Box sx={{ mt: 2 }}>
        <Typography component="h2" fontWeight={700}>Needs a date</Typography>
        {entries.filter(row => !row.date && !row.dateRange).map(row => item(row, row.group.jobId + ':' + row.index))}
      </Box>}
    </>}
    {open && <SyllabusReview courseId={open.group.courseId} material={{ id: open.group.materialId, title: open.group.title }}
      selectedIndex={open.index} readOnlyStart onUnauthorized={onUnauthorized}
      onClose={() => { setOpen(null); setReload(n => n + 1); }} />}
  </Box>;
}
