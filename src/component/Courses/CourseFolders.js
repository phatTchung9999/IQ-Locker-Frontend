import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, IconButton, List, ListItem, ListItemButton, Paper, SvgIcon, Typography } from '@mui/material';
import { api } from '../../utils/api';
import { FolderIcon } from './CourseCard';
import { courseOptions, isCourse } from './courseData';
import { courseError } from './CourseDialogs';
import CourseHeader from './CourseHeader';
import FolderDialog from './FolderDialogs';

export default function CourseFolders({ course, folderId, basePath, onUnauthorized, courseActions }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const mutation = useRef(null);
  const unauthorized = useRef(onUnauthorized); unauthorized.current = onUnauthorized;
  const navigate = useNavigate();
  const root = `${basePath}/courses/${encodeURIComponent(course.id)}`;
  const endpoint = `/api/v1/courses/${encodeURIComponent(course.id)}/folders`;
  const folderPath = (id) => `${root}/folders/${encodeURIComponent(id)}`;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setData(null); setDialog(null); setBusy(false);
    api.get(endpoint, { ...courseOptions(controller.signal), ...(folderId ? { params: { parent: folderId } } : {}) })
      .then(({ data: result }) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(result?.folders) || !result.folders.every(isCourse) || !Array.isArray(result.breadcrumbs) || !result.breadcrumbs.every(isCourse) || (folderId && result.breadcrumbs.at(-1)?.id !== folderId)) throw new Error('Invalid folder response');
        setData(result);
      }).catch((err) => {
        if (controller.signal.aborted) return;
        if (err.response?.status === 401) { unauthorized.current(); return; }
        setError(err.response?.status === 404 ? 'This course or folder was not found or is no longer available.' : courseError(err, 'We couldn’t load your folders. Please try again.'));
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); mutation.current?.abort(); mutation.current = null; };
  }, [endpoint, folderId, reload]);

  const change = async (kind, fields) => {
    if (mutation.current) return;
    const controller = new AbortController(); mutation.current = controller; setBusy(true);
    try {
      const target = dialog?.folder;
      if (kind === 'delete') await api.delete(`${endpoint}/${encodeURIComponent(target.id)}`, courseOptions(controller.signal));
      else if (target) await api.patch(`${endpoint}/${encodeURIComponent(target.id)}`, fields, courseOptions(controller.signal));
      else await api.post(endpoint, { ...fields, parent: folderId || null }, courseOptions(controller.signal));
      if (controller.signal.aborted) return;
      setDialog(null);
      if (kind === 'delete' && target.id === folderId) {
        const parent = data.breadcrumbs.at(-2);
        navigate(parent ? folderPath(parent.id) : root, { replace: true });
      } else setReload((value) => value + 1);
    } catch (err) {
      if (!controller.signal.aborted) {
        if (err.response?.status === 401) unauthorized.current();
        throw err;
      }
    } finally { if (mutation.current === controller) { mutation.current = null; setBusy(false); } }
  };
  const current = data?.breadcrumbs.at(-1);
  const action = (folder, kind, label) => <IconButton disabled={busy} aria-label={`${label} ${folder.name}`} onClick={() => setDialog({ kind, folder })} sx={{ color: '#74859a' }}>
    <SvgIcon sx={{ fontSize: 19 }}>{kind === 'delete' ? <path d="M6 7h12l-1 14H7L6 7zm-2-4h16v2H4zm5-2h6v2H9z" /> : <path d="m4 16 12-12 4 4L8 20H4v-4zm13-14 2-2 5 5-2 2z" />}</SvgIcon>
  </IconButton>;
  return <>
    <CourseHeader course={course} folderId={folderId} breadcrumbs={data?.breadcrumbs ?? []} basePath={basePath} actions={courseActions} />
    <Box sx={{ p: { xs: 2, sm: 3 }, borderTop: '1px solid #e9edf1' }}>
    {loading ? <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress size={26} aria-label="Loading folders" /></Box> : error ? <><Alert severity="error">{error}</Alert><Button onClick={() => setReload((n) => n + 1)}>Try again</Button></> : <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        {current && <Box sx={{ minWidth: 0, flex: 1, flexBasis: { xs: '100%', sm: 'auto' } }}><Typography component="h2" sx={{ fontSize: 20, fontWeight: 600, overflowWrap: 'anywhere' }}>{current.name}</Typography></Box>}
        {current && <>{!current.isStarter && action(current, 'edit', 'Edit folder')}{!current.isStarter && action(current, 'delete', 'Delete folder')}</>}
        <Button disabled={busy || data.breadcrumbs.length >= 10} onClick={() => setDialog({ kind: 'create' })} sx={{ textTransform: 'none', color: '#40566e' }}>+ Create folder</Button>
      </Box>
      {data.breadcrumbs.length >= 10 && <Alert severity="info" sx={{ mb: 2 }}>You’ve reached the 10-level nesting limit.</Alert>}
      {!data.folders.length ? <Box sx={{ textAlign: 'center', py: 5 }}><FolderIcon /><Typography sx={{ fontSize: 15, fontWeight: 600, color: '#657487', mt: 2 }}>{folderId ? 'This folder is empty' : 'This course folder is empty'}</Typography><Typography sx={{ fontSize: 12, color: '#8b96a4', mt: 1 }}>Create a folder to organize your course materials.</Typography></Box> : <Paper variant="outlined" sx={{ borderRadius: '10px', overflow: 'hidden' }}><List disablePadding aria-label="Course folders">
        {data.folders.map((folder) => <ListItem key={folder.id} disablePadding sx={{ borderBottom: '1px solid #eef0f3', '&:last-child': { border: 0 } }}>
          <ListItemButton component={RouterLink} to={folderPath(folder.id)} aria-label={`Open folder ${folder.name}`} sx={{ gap: 2, p: 2, minWidth: 0 }}><Box sx={{ flexShrink: 0, display: 'flex' }}><FolderIcon /></Box><Box sx={{ minWidth: 0 }}><Typography sx={{ fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere' }}>{folder.name}</Typography></Box></ListItemButton>
          {!folder.isStarter && action(folder, 'edit', 'Edit folder')}{!folder.isStarter && action(folder, 'delete', 'Delete folder')}
        </ListItem>)}
      </List></Paper>}
    </>}
    {dialog && <FolderDialog folder={dialog.folder} deleting={dialog.kind === 'delete'} onClose={() => setDialog(null)} onSubmit={(fields) => change(dialog.kind, fields)} />}
    </Box>
  </>;
}
