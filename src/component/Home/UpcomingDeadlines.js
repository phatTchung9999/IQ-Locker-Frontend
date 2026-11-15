import { useEffect, useRef, useState } from 'react';
import { Alert, Button, CircularProgress, List, ListItem, Paper, Typography } from '@mui/material';
import { api } from '../../utils/api';
import { courseOptions } from '../Courses/courseData';

export default function UpcomingDeadlines({ onUnauthorized }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const unauthorized = useRef(onUnauthorized); unauthorized.current = onUnauthorized;
  useEffect(() => {
    const controller = new AbortController();
    api.get('/api/v1/deadlines', courseOptions(controller.signal)).then(({ data }) => {
      if (!controller.signal.aborted) {
        if (!Array.isArray(data)) throw new Error('Invalid deadlines');
        setRows(data);
      }
    }).catch(err => {
      if (controller.signal.aborted) return;
      if (err.response?.status === 401) unauthorized.current?.();
      else setError(true);
    });
    return () => controller.abort();
  }, [reload]);
  return <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
    {error ? <Alert severity="warning" action={<Button onClick={() => { setError(false); setReload(value => value + 1); }}>Retry</Button>}>Couldn’t load deadlines.</Alert>
      : rows === null ? <CircularProgress size={24} aria-label="Loading deadlines" />
      : rows.length === 0 ? <Typography>No confirmed deadlines yet.</Typography>
      : <List disablePadding>{rows.map(row => <ListItem key={`${row.jobId}:${row.index}`} divider sx={{ gap: 2, flexWrap: 'wrap', ...(row.dateRange ? { bgcolor: '#edf1f7', color: 'text.secondary' } : {}) }}>
        {row.dateRange ? <Typography>{row.dateRange.start} – {row.dateRange.end}</Typography> : <Typography component="time" dateTime={row.date} fontWeight={600}>{row.date}</Typography>}
        <Typography sx={{ overflowWrap: 'anywhere' }}>{row.title} · {row.dateRange ? 'Exam period · exact date TBD' : row.kind}</Typography>
      </ListItem>)}</List>}
  </Paper>;
}
