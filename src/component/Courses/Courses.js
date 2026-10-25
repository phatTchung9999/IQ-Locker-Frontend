import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, IconButton, Menu, MenuItem, Paper, SvgIcon, Typography } from '@mui/material';
import CourseFolders from './CourseFolders';
import CourseCard, { FolderIcon } from './CourseCard';
import { isCourse, courseOptions as options } from './courseData';
import { api } from '../../utils/api';
import { CourseEditor, DeleteCourseDialog, courseError } from './CourseDialogs';

const primary = { bgcolor: '#34475c', '&:hover': { bgcolor: '#26394e' }, textTransform: 'none', borderRadius: '8px', px: 2.5 };
const panel = { border: '1px solid #e2e5e9', borderRadius: '14px', boxShadow: 'none' };


export default function Courses({ courseId, folderId, basePath, onUnauthorized }) {
  const [courses, setCourses] = useState([]);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [reload, setReload] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [menu, setMenu] = useState(null);
  const [notice, setNotice] = useState('');
  const mutation = useRef(null);
  const unauthorized = useRef(onUnauthorized);
  unauthorized.current = onUnauthorized;
  const navigate = useNavigate();
  const coursePath = `${basePath}/courses`;

  const authorize = useCallback((err) => {
    if ([401, 403].includes(err.response?.status)) { unauthorized.current(); return true; }
    return false;
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setNotFound(false);
    setCourses([]);
    setCourse(null);
    setDialog(null);
    setMenu(null);
    api.get(courseId ? `/api/v1/courses/${encodeURIComponent(courseId)}` : '/api/v1/courses', options(controller.signal))
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (courseId ? !isCourse(data) : !Array.isArray(data) || !data.every(isCourse)) throw new Error('Invalid course response');
        if (courseId) setCourse(data); else setCourses(data);
      })
      .catch((err) => {
        if (controller.signal.aborted || authorize(err)) return;
        setNotFound(err.response?.status === 404);
        setError(courseError(err, 'We couldn’t load your courses. Check your connection and try again.'));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); mutation.current?.abort(); };
  }, [courseId, reload, authorize]);

  useEffect(() => { setNotice(''); }, [courseId]);

  const save = async (fields) => {
    const controller = new AbortController();
    mutation.current = controller;
    try {
      const editing = dialog?.course;
      const { data } = editing
        ? await api.patch(`/api/v1/courses/${editing.id}`, fields, options(controller.signal))
        : await api.post('/api/v1/courses', fields, options(controller.signal));
      if (controller.signal.aborted) return;
      if (!isCourse(data)) throw new Error('Invalid course response');
      if (courseId) setCourse(data);
      else setCourses((items) => editing ? items.map((item) => item.id === data.id ? data : item) : [data, ...items]);
      setDialog(null);
      setNotice(editing ? 'Course updated.' : 'Course created.');
      if (error) setReload((value) => value + 1);
    } catch (err) { if (!controller.signal.aborted) { authorize(err); throw err; } }
    finally { if (mutation.current === controller) mutation.current = null; }
  };

  const remove = async () => {
    const controller = new AbortController();
    mutation.current = controller;
    try {
      const target = dialog.course;
      await api.delete(`/api/v1/courses/${target.id}`, options(controller.signal));
      if (controller.signal.aborted) return;
      setDialog(null);
      if (courseId) navigate(coursePath, { replace: true });
      else { setCourses((items) => items.filter((item) => item.id !== target.id)); setNotice('Course deleted.'); }
    } catch (err) { if (!controller.signal.aborted) { authorize(err); throw err; } }
    finally { if (mutation.current === controller) mutation.current = null; }
  };

  const actionButton = (item) => <IconButton aria-label={`Actions for ${item.name}`} aria-haspopup="menu" onClick={(event) => setMenu({ anchor: event.currentTarget, course: item })} sx={{ color: '#8792a0' }}><SvgIcon sx={{ fontSize: 22 }}><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></SvgIcon></IconButton>;

  return <Box>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 3 }}>
      {courseId ? <Button component={RouterLink} to={coursePath} sx={{ textTransform: 'none', color: '#5e728b', px: 0 }}>← Back to Courses</Button>
        : <Typography sx={{ fontSize: 12, color: '#8792a0' }}>One folder for every course.</Typography>}
      {!courseId && <Button variant="contained" disableElevation disabled={loading} onClick={() => setDialog({ type: 'create' })} sx={primary}>+ Create course</Button>}
    </Box>
    {notice && <Alert severity="success" role="status" onClose={() => setNotice('')} sx={{ mb: 3 }}>{notice}</Alert>}
    {loading ? <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress size={28} aria-label="Loading courses" sx={{ color: '#647b95' }} /></Box>
      : error ? <Paper sx={{ ...panel, p: 3 }}><Alert severity={notFound ? 'info' : 'error'}>{notFound ? 'This course was not found or is no longer available.' : error}</Alert>{!notFound && <Button onClick={() => setReload((value) => value + 1)} sx={{ textTransform: 'none', mt: 2 }}>Try again</Button>}</Paper>
      : courseId && course ? <Paper sx={{ ...panel, overflow: 'hidden' }}>
        <CourseFolders course={course} folderId={folderId} basePath={basePath} onUnauthorized={onUnauthorized} courseActions={actionButton(course)} />
      </Paper>
      : !courses.length ? <Paper sx={{ ...panel, borderStyle: 'dashed', bgcolor: '#fafbfc', textAlign: 'center', py: 8, px: 3 }}><FolderIcon large /><Typography component="h2" sx={{ fontSize: 19, fontWeight: 600, color: '#53647a', mt: 2 }}>Your courses start here</Typography><Typography sx={{ fontSize: 13, color: '#8792a0', mt: 1, lineHeight: 1.8 }}>Create a folder for a course you’re taking.</Typography></Paper>
      : <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))' }, gap: 2.5 }}>
        {courses.map((item) => <CourseCard key={item.id} course={item} basePath={basePath} action={actionButton(item)} />)}
      </Box>}
    <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
      <MenuItem onClick={() => { setDialog({ type: 'edit', course: menu.course }); setMenu(null); }} sx={{ fontSize: 13 }}>Edit course</MenuItem>
      <MenuItem onClick={() => { setDialog({ type: 'delete', course: menu.course }); setMenu(null); }} sx={{ fontSize: 13, color: '#a94a42' }}>Delete course</MenuItem>
    </Menu>
    {dialog && dialog.type !== 'delete' && <CourseEditor key={dialog.course?.id || 'create'} course={dialog.course} onClose={() => setDialog(null)} onSave={save} />}
    {dialog?.type === 'delete' && <DeleteCourseDialog course={dialog.course} onClose={() => setDialog(null)} onDelete={remove} />}
  </Box>;
}
