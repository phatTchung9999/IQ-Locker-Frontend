import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { api } from '../../utils/api';
import { courseOptions } from '../Courses/courseData';

export default function SyllabusReview({ courseId, material, onClose, onUnauthorized, selectedIndex, readOnlyStart = false }) {
  const endpoint = `/api/v1/courses/${encodeURIComponent(courseId)}/materials/${encodeURIComponent(material.id)}/analysis`;
  const [job, setJob] = useState(null);
  const [rows, setRows] = useState(null);
  const [exactDates, setExactDates] = useState({});
  const [dates, setDates] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const request = useRef(null);
  const unauthorized = useRef(onUnauthorized); unauthorized.current = onUnauthorized;

  useEffect(() => {
    const controller = new AbortController(); request.current = controller;
    const options = courseOptions(controller.signal);
    let timer;
    async function update(start) {
      try {
        const { data } = start ? await api.post(endpoint, {}, options) : await api.get(endpoint, options);
        if (controller.signal.aborted) return;
        setJob(data);
        if (data.state === 'ready') {
          const response = await api.get(endpoint + '/results', { ...options, params: { extractionId: data.extractionId } });
          if (!controller.signal.aborted) setRows(response.data.suggestions);
        } else if (['queued', 'processing'].includes(data.state)) timer = setTimeout(() => update(false), 5000);
      } catch (err) {
        if (!controller.signal.aborted) {
          if (err.response?.status === 401) unauthorized.current?.();
          else if (err.response?.data?.code === 'pdf_layout_missing') setError(err.response.data.message);
          else setError('Couldn’t load syllabus analysis. Close and reopen to try again.');
        }
      } finally { if (!controller.signal.aborted) setBusy(false); }
    }
    void update(refresh === 0 && !readOnlyStart);
    return () => { controller.abort(); clearTimeout(timer); request.current?.abort(); };
  }, [endpoint, refresh, readOnlyStart]);

  const act = async (suffix, payload, apply) => {
    if (busy || request.current?.signal.aborted) return;
    const signal = request.current.signal;
    setBusy(true); setError('');
    try {
      const { data } = await api.post(endpoint + suffix, payload, courseOptions(signal));
      if (!signal.aborted) apply(data);
    } catch (err) {
      if (!signal.aborted) {
        if (err.response?.status === 401) onUnauthorized?.();
        else setError(err.response?.data?.message || 'Couldn’t save. Please try again.');
      }
    } finally { if (!signal.aborted) setBusy(false); }
  };
  const review = (row, status, date, period) => act('/review', { jobId: job.id, index: row.index, status, date, ...(period ? { period: true } : {}) },
    decision => {
      setRows(previous => previous.map(item => item.index === row.index ? { ...item, status: decision.status, confirmedDate: decision.date, confirmedRange: decision.dateRange } : item));
      setExactDates(previous => ({ ...previous, [row.index]: false }));
      setDates(previous => ({ ...previous, [row.index]: undefined }));
    });

  return <Dialog open fullWidth maxWidth="md" onClose={onClose} aria-labelledby="syllabus-review-title">
    <DialogTitle id="syllabus-review-title" sx={{ pb: 1.5 }}>
      Review syllabus
      <Typography component="span" display="block" variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{material.title}</Typography>
    </DialogTitle>
    <DialogContent dividers>
      {rows?.length > 0 && <Typography role="status" variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {rows.filter(row => row.status === 'pending').length} of {rows.length} to review
      </Typography>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {busy && <CircularProgress size={22} aria-label="Loading syllabus analysis" />}
      {job?.state === 'queued' && <Typography role="status">Analysis queued.</Typography>}
      {job?.state === 'processing' && <Typography role="status">Analyzing syllabus…</Typography>}
      {job?.state === 'failed' && <Alert severity="warning">Analysis failed. {job.canRetry && <Button disabled={busy} onClick={() => act('/retry', {}, data => {
        setJob(data);
        setRefresh(value => value + 1);
      })}>Retry analysis</Button>}</Alert>}
      {rows?.length === 0 && <Typography>No deadlines found.</Typography>}
      {rows?.filter(row => selectedIndex == null || selectedIndex === row.index).map(row => {
        const date = dates[row.index] ?? row.confirmedDate ?? row.date ?? '';
        const period = row.kind === 'exam' && (row.confirmedRange || (!row.confirmedDate && row.dateRange));
        const choosingExact = Boolean(exactDates[row.index]);
        const location = source => source.page != null ? `Page ${source.page}` : source.lineStart == null ? 'Source excerpt' : `Lines ${source.lineStart}–${source.lineEnd}`;
        const savedDate = row.confirmedDate ?? row.date;
        const needsDate = !period && !savedDate;
        const statusLabel = row.status === 'pending' ? (needsDate ? 'Needs a date' : 'To review') : row.status === 'confirmed' ? 'Confirmed' : 'Dismissed';
        return <Box key={row.index} sx={{ border: '1px solid #e2e5e9', borderRadius: 2, p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <Typography component="h3" fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>{row.title}</Typography>
            <Chip size="small" variant="outlined" label={statusLabel} color={row.status === 'confirmed' ? 'success' : needsDate && row.status === 'pending' ? 'warning' : 'default'} />
          </Box>
          <Typography fontWeight={600} sx={{ mt: 1 }}>
            {period ? `Exam period · ${period.start} – ${period.end}` :
              savedDate || (row.dateRange ? `${row.dateRange.start} – ${row.dateRange.end}` : 'Date not specified')}
          </Typography>
          {period && <Typography variant="body2" color="text.secondary">Exact day and time TBD</Typography>}
          {row.flags.length > 0 && <Typography variant="body2" color="text.secondary">{row.flags.map(flag => flag.replace(/_/g, ' ')).join(' · ')}</Typography>}
          {row.time && <Typography variant="body2" color="text.secondary">Source time: {row.time}{row.timezone ? ` (${row.timezone})` : ' (timezone unspecified)'}</Typography>}
          <Box component="details" sx={{ mt: 1, '& summary': { cursor: 'pointer', color: 'primary.main', py: 0.5, fontSize: 14 } }}>
            <summary>View sources{row.sources[0] ? ` · ${location(row.sources[0])}` : ''}</summary>
            {[...row.sources, ...row.contextSources].map((source, index) => <Box component="blockquote" key={index} sx={{ mx: 0, my: 1, pl: 1.5, borderLeft: '2px solid #ccd7e3', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
              <Typography variant="body2">{source.quote}</Typography>
              <Typography variant="caption" color="text.secondary">{index >= row.sources.length ? 'Context · ' : ''}{location(source)}</Typography>
            </Box>)}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mt: 1.5 }}>
            {choosingExact ? <>
              <TextField type="date" label="Deadline date" autoFocus size="small" value={date} disabled={busy} slotProps={{ inputLabel: { shrink: true } }}
                onChange={event => setDates(previous => ({ ...previous, [row.index]: event.target.value }))} />
              <Button variant="contained" disabled={busy || !date} onClick={() => review(row, 'confirmed', date)}>Confirm date</Button>
              <Button onClick={() => { setExactDates(previous => ({ ...previous, [row.index]: false })); setDates(previous => ({ ...previous, [row.index]: undefined })); }} disabled={busy}>Cancel edit</Button>
            </> : <>
              {period && !row.confirmedRange && <Button variant="contained" disabled={busy} onClick={() => review(row, 'confirmed', undefined, true)}>Confirm period</Button>}
              {!period && savedDate && row.status !== 'confirmed' && <Button variant="contained" disabled={busy} onClick={() => review(row, 'confirmed', savedDate)}>Confirm date</Button>}
              <Button variant={needsDate ? 'contained' : 'text'} disabled={busy} onClick={() => setExactDates(previous => ({ ...previous, [row.index]: true }))}>
                {period || needsDate ? 'Enter exact date' : 'Edit date'}
              </Button>
              {row.status !== 'dismissed' && <Button color="inherit" disabled={busy} onClick={() => review(row, 'dismissed')}>Dismiss</Button>}
            </>}
          </Box>
        </Box>;
      })}
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
  </Dialog>;
}
