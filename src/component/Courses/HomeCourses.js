import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Paper, List, ListItem, ListItemButton, SvgIcon, Typography } from '@mui/material';
import { api } from '../../utils/api';
import { FolderIcon } from './CourseCard';
import { courseOptions, isCourse } from './courseData';
import { courseError } from './CourseDialogs';

// Fetch on each Home visit. No course cache survives navigation or account changes.
export default function HomeCourses({ basePath, onUnauthorized }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const unauthorized = useRef(onUnauthorized);
  unauthorized.current = onUnauthorized;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setCourses([]);
    api.get('/api/v1/courses', courseOptions(controller.signal))
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data) || !data.every(isCourse)) throw new Error('Invalid course response');
        setCourses(data);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if ([401, 403].includes(err.response?.status)) { unauthorized.current(); return; }
        setError(courseError(err, 'We couldn’t load your courses. Check your connection and try again.'));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reload]);

  if (loading) return <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress size={28} aria-label="Loading courses" sx={{ color: '#647b95' }} /></Box>;
  if (error) return <Paper sx={{ p: 3, border: '1px solid #e2e5e9', borderRadius: '14px', boxShadow: 'none' }}><Alert severity="error">{error}</Alert><Button onClick={() => setReload((value) => value + 1)} sx={{ textTransform: 'none', mt: 2 }}>Try again</Button></Paper>;
  if (!courses.length) return <Paper sx={{ p: 3, textAlign: 'center', border: '1px dashed #e2e5e9', borderRadius: '14px', boxShadow: 'none', bgcolor: '#fafbfc' }}>
    <FolderIcon /><Typography component="h3" sx={{ fontSize: 15, fontWeight: 600, mt: 2, color: '#4d5867' }}>A place for every course</Typography>
    <Typography sx={{ fontSize: 12, color: '#84909d', mt: 1 }}>Create your first course folder to start organizing your learning.</Typography>
    <Button component={RouterLink} to={`${basePath}/courses`} sx={{ textTransform: 'none', mt: 2, color: '#40566e' }}>Create a course</Button>
  </Paper>;
  return <Paper sx={{ border: '1px solid #e2e5e9', borderRadius: '14px', boxShadow: 'none', overflow: 'hidden' }}>
    <List aria-label="Your course folders" disablePadding>
      {courses.map((course) => <ListItem key={course.id} disablePadding sx={{ '&:not(:last-child)': { borderBottom: '1px solid #eef0f3' } }}>
        <ListItemButton component={RouterLink} to={`${basePath}/courses/${encodeURIComponent(course.id)}`} aria-label={`Open ${course.name}`}
          sx={{ px: { xs: 2, sm: 3 }, py: 2.5, gap: 2, minWidth: 0, '&:hover': { bgcolor: '#f6f8fa' }, '&.Mui-focusVisible': { bgcolor: '#e9edf2' } }}>
          <Box sx={{ display: 'flex', flexShrink: 0 }}><FolderIcon /></Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography component="h3" sx={{ fontSize: 15, fontWeight: 600, color: '#34475c', overflowWrap: 'anywhere' }}>{course.name}</Typography>
            <Typography sx={{ fontSize: 12, color: '#8792a0', mt: 0.75, overflowWrap: 'anywhere' }}>{[course.code, course.semester].filter(Boolean).join(' · ') || 'Course folder'}</Typography>
          </Box>
          <SvgIcon sx={{ fontSize: 18, color: '#8792a0', flexShrink: 0 }}><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></SvgIcon>
        </ListItemButton>
      </ListItem>)}
    </List>
  </Paper>;
}
