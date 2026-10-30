import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, IconButton, List, ListItem, ListItemButton, Paper, SvgIcon, Typography } from '@mui/material';
import { api } from '../../utils/api';
import { FolderIcon } from './CourseCard';
import { courseOptions, isCourse } from './courseData';
import { courseError } from './CourseDialogs';
import CourseMaterials from '../Materials/CourseMaterials';
import CourseHeader from './CourseHeader';
import FolderDialog from './FolderDialogs';

function FolderDropTarget({ folder, children, courseId, onUnauthorized }) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState(null);
  const [uploading, setUploading] = useState(false);
  const depth = useRef(0);
  const hasFiles = (event) => Array.from(event.dataTransfer.types || []).includes('Files');
  return <ListItem disablePadding onDragEnter={(event) => {
    if (!hasFiles(event)) return;
    event.preventDefault(); depth.current += 1; setDragging(true);
  }} onDragOver={(event) => {
    if (!hasFiles(event)) return;
    event.preventDefault(); event.dataTransfer.dropEffect = uploading ? 'none' : 'copy';
  }} onDragLeave={() => {
    depth.current = Math.max(0, depth.current - 1);
    if (!depth.current) setDragging(false);
  }} onDrop={(event) => {
    if (!hasFiles(event)) return;
    event.preventDefault(); event.stopPropagation(); depth.current = 0; setDragging(false);
    if (!uploading && event.dataTransfer.files.length) setFiles(Array.from(event.dataTransfer.files));
  }} sx={{ display: 'block', borderBottom: '1px solid #eef0f3', '&:last-child': { border: 0 }, bgcolor: dragging ? '#edf3f9' : 'transparent', outline: dragging ? '2px solid #56799e' : 'none', outlineOffset: '-2px', transition: 'background-color 120ms ease' }}>
    <Box sx={{ display: 'flex', alignItems: 'center' }}>{children}</Box>
    {dragging && <Typography sx={{ px: 2, pb: 1.5, fontSize: 12, fontWeight: 600, color: '#40566e', pointerEvents: 'none' }}>{uploading ? 'Upload in progress in' : 'Drop to upload into'} {folder.name}</Typography>}
    {files && <CourseMaterials courseId={courseId} folderId={folder.id} hasFolders uploadOnly incomingFiles={files} onUploadingChange={setUploading} onUnauthorized={onUnauthorized} />}
  </ListItem>;
}

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
    <Box onDragOver={(event) => { if (Array.from(event.dataTransfer.types || []).includes('Files')) event.preventDefault(); }} onDrop={(event) => { if (Array.from(event.dataTransfer.types || []).includes('Files')) event.preventDefault(); }} sx={{ p: { xs: 2, sm: 3 }, borderTop: '1px solid #e9edf1' }}>
    {loading ? <Box sx={{ textAlign: 'center', py: 5 }}><CircularProgress size={26} aria-label="Loading folders" /></Box> : error ? <><Alert severity="error">{error}</Alert><Button onClick={() => setReload((n) => n + 1)}>Try again</Button></> : <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        {current && <Box sx={{ minWidth: 0, flex: 1, flexBasis: { xs: '100%', sm: 'auto' } }}><Typography component="h2" sx={{ fontSize: 20, fontWeight: 600, overflowWrap: 'anywhere' }}>{current.name}</Typography></Box>}
        {current && <>{!current.isStarter && action(current, 'edit', 'Edit folder')}{!current.isStarter && action(current, 'delete', 'Delete folder')}</>}
        <Button disabled={busy || data.breadcrumbs.length >= 10} onClick={() => setDialog({ kind: 'create' })} sx={{ textTransform: 'none', color: '#40566e' }}>+ Create folder</Button>
      </Box>
      {data.breadcrumbs.length >= 10 && <Alert severity="info" sx={{ mb: 2 }}>You’ve reached the 10-level nesting limit.</Alert>}
      {data.folders.length > 0 && <Paper variant="outlined" sx={{ borderRadius: '10px', overflow: 'hidden' }}><List disablePadding aria-label="Course folders">
        {data.folders.map((folder) => <FolderDropTarget key={folder.id} folder={folder} courseId={course.id} onUnauthorized={onUnauthorized}>
          <ListItemButton component={RouterLink} to={folderPath(folder.id)} aria-label={`Open folder ${folder.name}`} sx={{ gap: 2, p: 2, minWidth: 0 }}><Box sx={{ flexShrink: 0, display: 'flex' }}><FolderIcon /></Box><Box sx={{ minWidth: 0 }}><Typography sx={{ fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere' }}>{folder.name}</Typography></Box></ListItemButton>
          {!folder.isStarter && action(folder, 'edit', 'Edit folder')}{!folder.isStarter && action(folder, 'delete', 'Delete folder')}
        </FolderDropTarget>)}
      </List></Paper>}
      <CourseMaterials key={`${course.id}:${folderId || 'root'}`} courseId={course.id} folderId={folderId} hideUploadArea={!folderId || data.folders.length > 0} hasFolders={data.folders.length > 0} onUnauthorized={onUnauthorized} />
    </>}
    {dialog && <FolderDialog folder={dialog.folder} deleting={dialog.kind === 'delete'} onClose={() => setDialog(null)} onSubmit={(fields) => change(dialog.kind, fields)} />}
    </Box>
  </>;
}
