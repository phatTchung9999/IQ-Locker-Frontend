import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, LinearProgress, List, ListItem, ListItemButton, Menu, MenuItem, Paper, SvgIcon, Typography } from '@mui/material';
import { api } from '../../utils/api';
import { courseOptions } from '../Courses/courseData';
import { courseError } from '../Courses/CourseDialogs';
import { FolderIcon } from '../Courses/CourseCard';
import MaterialDialog from './MaterialDialog';
const PdfPreview = lazy(() => import('./PdfPreview'));
const size = (bytes) => bytes < 1000 ? `${bytes} B` : bytes < 1_000_000 ? `${(bytes / 1000).toFixed(1)} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;
const valid = (item) => typeof item?.id === 'string' && typeof item.title === 'string' && ['application/pdf', 'text/plain'].includes(item.mediaType);
const fallbackLimits = { maxFileBytes: 20_000_000, limitBytes: 500_000_000, usedBytes: 0 };

export default function CourseMaterials({ courseId, folderId, hasFolders, onUnauthorized, hideUploadArea = false, uploadOnly = false, incomingFiles, onUploadingChange }) {
  const [items, setItems] = useState([]);
  const [usage, setUsage] = useState(fallbackLimits);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [menu, setMenu] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [preview, setPreview] = useState(null);
  const [contentBusy, setContentBusy] = useState(false);
  const input = useRef(null);
  const consumedFiles = useRef(null);
  const upload = useRef(null), mutation = useRef(null), content = useRef(null);
  const alive = useRef(true);
  const unauthorized = useRef(onUnauthorized); unauthorized.current = onUnauthorized;
  const endpoint = `/api/v1/courses/${encodeURIComponent(courseId)}/materials`;
  const authorize = (err) => { if (err.response?.status === 401) unauthorized.current(); };
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; upload.current?.abort(); mutation.current?.abort(); content.current?.abort(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadError('');
    api.get(endpoint, { ...courseOptions(controller.signal), ...(folderId ? { params: { folder: folderId } } : {}) }).then(({ data }) => {
      if (controller.signal.aborted) return;
      if (!Array.isArray(data?.materials) || !data.materials.every(valid) || !data.usage || ![data.usage.usedBytes, data.usage.limitBytes, data.usage.maxFileBytes].every(Number.isFinite)) throw new Error('Invalid document response');
      setItems(data.materials); setUsage(data.usage);
    }).catch((err) => { if (!controller.signal.aborted) { authorize(err); setLoadError(courseError(err, 'We couldn’t load your documents. Please try again.')); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
    // The component is keyed by course/folder in its parent; callbacks stay in a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, folderId, reload]);

  const send = async (files) => {
    if (upload.current || !files?.length) return;
    setNotice(''); setError('');
    if (files.length !== 1) { setError('Upload one PDF or TXT file at a time.'); return; }
    const file = files[0];
    if (!/\.(pdf|txt)$/i.test(file.name) || !file.size || file.size > usage.maxFileBytes) { setError(`Choose a nonempty PDF or UTF-8 TXT file up to ${size(usage.maxFileBytes)}.`); return; }
    if (usage.usedBytes + file.size > usage.limitBytes) { setError('This file exceeds your remaining storage. Delete documents first.'); return; }
    const controller = new AbortController(); upload.current = controller;
    setUploading(true); onUploadingChange?.(true); setProgress(0);
    const form = new FormData(); form.append('file', file);
    try {
      await api.post(endpoint, form, { ...courseOptions(controller.signal), ...(folderId ? { params: { folder: folderId } } : {}), timeout: 180000,
        onUploadProgress: (event) => { if (alive.current && !controller.signal.aborted && event.total) setProgress(Math.min(100, Math.round(event.loaded / event.total * 100))); } });
      if (alive.current && !controller.signal.aborted) setNotice('Document uploaded.');
    } catch (err) {
      if (alive.current) {
        if (controller.signal.aborted) setNotice('Upload canceled. Refreshing the list; server cleanup may take a few minutes.');
        else { authorize(err); setError(courseError(err, 'Upload failed. Please try again. Any pending upload will be cleaned up automatically.')); }
      }
    } finally {
      if (upload.current === controller) upload.current = null;
      if (alive.current) { setUploading(false); onUploadingChange?.(false); setReload((n) => n + 1); }
    }
  };
  useEffect(() => {
    if (!incomingFiles || consumedFiles.current === incomingFiles || loading || loadError || uploading) return;
    consumedFiles.current = incomingFiles;
    void send(incomingFiles);
    // Each drop is consumed once, after destination limits have loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingFiles, loading, loadError, uploading]);
  const change = async (title) => {
    if (mutation.current) return;
    const controller = new AbortController(); mutation.current = controller;
    try {
      const path = `${endpoint}/${encodeURIComponent(dialog.material.id)}`;
      if (dialog.deleting) await api.delete(path, { ...courseOptions(controller.signal), timeout: 120000 });
      else await api.patch(path, { title }, courseOptions(controller.signal));
      if (alive.current) { setNotice(dialog.deleting ? 'Document deleted.' : 'Document title updated.'); setDialog(null); setReload((n) => n + 1); }
    } catch (err) { if (alive.current) { authorize(err); setReload((n) => n + 1); throw err; } }
    finally { if (mutation.current === controller) mutation.current = null; }
  };
  const openContent = async (material, download = false) => {
    content.current?.abort();
    const controller = new AbortController(); content.current = controller;
    setContentBusy(true); setError('');
    if (!download) setPreview({ material, bytes: null });
    try {
      const { data } = await api.get(`${endpoint}/${encodeURIComponent(material.id)}/content`, { ...courseOptions(controller.signal), responseType: 'arraybuffer', timeout: 120000, ...(download ? { params: { download: '1' } } : {}) });
      if (controller.signal.aborted || !alive.current) return;
      if (download) {
        const url = URL.createObjectURL(new Blob([data], { type: material.mediaType }));
        const link = document.createElement('a'); link.href = url; link.download = material.originalFilename; document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } else setPreview({ material, bytes: data, text: material.mediaType === 'text/plain' ? new TextDecoder('utf-8').decode(data) : null });
    } catch (err) {
      if (!controller.signal.aborted && alive.current) {
        authorize(err);
        // Axios arraybuffer errors must be decoded before showing the API message.
        let message = 'We couldn’t open this document. Please try again.';
        try { const parsed = JSON.parse(new TextDecoder().decode(err.response.data)); if (typeof parsed.message === 'string') message = parsed.message; } catch { /* No JSON error body. */ }
        setError(message); setPreview(null);
      }
    } finally { if (content.current === controller) { content.current = null; if (alive.current) setContentBusy(false); } }
  };
  const closePreview = () => { content.current?.abort(); setPreview(null); setContentBusy(false); };
  const expandedUpload = Boolean(folderId && !hasFolders && !items.length && !loading && !loadError && !hideUploadArea && !uploadOnly);
  const dragDepth = useRef(0);
  const uploadingCount = items.some((item) => item.state !== 'ready');
  const acceptsDrop = Boolean(folderId && !hasFolders && !hideUploadArea && !uploadOnly && !loading && !loadError);
  return <Box component="section" aria-label="Course documents"
    onDragEnter={(event) => {
      if (!acceptsDrop || !Array.from(event.dataTransfer.types || []).includes('Files')) return;
      event.preventDefault(); event.stopPropagation(); dragDepth.current += 1; setDragging(true);
    }} onDragOver={(event) => {
      if (!acceptsDrop || !Array.from(event.dataTransfer.types || []).includes('Files')) return;
      event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = uploading ? 'none' : 'copy';
    }} onDragLeave={() => {
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (!dragDepth.current) setDragging(false);
    }} onDrop={(event) => {
      if (!acceptsDrop || !Array.from(event.dataTransfer.types || []).includes('Files')) return;
      event.preventDefault(); event.stopPropagation(); dragDepth.current = 0; setDragging(false);
      void send(event.dataTransfer.files);
    }} sx={{ mt: hasFolders ? 3 : 0, position: 'relative', minHeight: acceptsDrop ? 160 : undefined }}>
    {acceptsDrop && dragging && !expandedUpload && <Box role="status" sx={{ position: 'absolute', inset: 0, zIndex: 2, border: '2px dashed #56799e', borderRadius: '10px', bgcolor: '#edf3f9f2', display: 'grid', placeItems: 'center', textAlign: 'center', p: 2, pointerEvents: 'none' }}><Typography sx={{ color: '#40566e', fontWeight: 600 }}>{uploading ? 'Upload in progress' : 'Drop your material here'}</Typography></Box>}
    <input ref={input} type="file" aria-label="Choose material file" accept=".pdf,.txt,application/pdf,text/plain" hidden onChange={(event) => { void send(event.target.files); event.target.value = ''; }} />
    {expandedUpload && <Box aria-label="Empty folder upload area" role="button" tabIndex={0} aria-disabled={uploading} onClick={expandedUpload ? (event) => { if (event.target.closest('button, input')) return; if (!uploading && !loading) input.current.click(); } : undefined} onKeyDown={expandedUpload ? (event) => { if (event.target !== event.currentTarget || !['Enter', ' '].includes(event.key)) return; event.preventDefault(); if (!uploading && !loading) input.current.click(); } : undefined}
      sx={{ border: `1px dashed ${dragging ? '#56799e' : '#dce2e9'}`, borderRadius: '10px', p: { xs: 2, sm: 3 }, minHeight: expandedUpload ? { xs: 320, sm: 'clamp(360px, 50vh, 560px)' } : undefined, width: '100%', cursor: expandedUpload && !uploading ? 'pointer' : undefined, '&:focus-visible': { outline: '2px solid #56799e', outlineOffset: '3px' }, display: 'flex', flexDirection: 'column', justifyContent: expandedUpload ? 'center' : undefined, textAlign: expandedUpload ? 'center' : 'left', bgcolor: dragging ? '#edf3f9' : '#fafbfc', transition: 'background-color 120ms ease, border-color 120ms ease', mb: expandedUpload ? 0 : 2 }}>
      {expandedUpload && <Box sx={{ mb: 2 }}><SvgIcon sx={{ color: '#8b9fb6', fontSize: 52 }}><path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></SvgIcon><Typography sx={{ fontSize: 12, color: '#8792a0', mt: 1 }}>This folder is empty</Typography><Typography component="h3" sx={{ fontSize: { xs: 20, sm: 24 }, fontWeight: 600, color: '#40566e', mt: 1 }}>Drop your material here</Typography><Typography sx={{ fontSize: 13, color: '#78889a', mt: 1 }}>or click anywhere here to choose a file</Typography></Box>}
      <Box sx={{ display: 'flex', flexDirection: expandedUpload ? 'column' : 'row', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 12, color: '#78889a', flex: 1 }}>Drop one PDF or UTF-8 TXT here · Up to {size(usage.maxFileBytes)} per file</Typography>
      </Box>
      <Typography sx={{ fontSize: 11, color: '#8792a0', mt: 1.5 }}>Storage: {size(usage.usedBytes)} of {size(usage.limitBytes)} used, including pending uploads and cleanup.</Typography>
    </Box>}
    {uploading && <Box sx={{ my: 2, px: uploadOnly ? 2 : 0 }}><LinearProgress variant="determinate" value={progress} aria-label="Upload progress" /><Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}><Typography role="status" sx={{ fontSize: 12 }}>{progress < 100 ? `Uploading ${progress}%` : 'Saving privately…'}</Typography><Button size="small" onClick={() => upload.current?.abort()}>Cancel upload</Button></Box></Box>}
    {notice && <Alert severity="success" role="status" sx={{ mb: 2 }} onClose={() => setNotice('')}>{notice}</Alert>}
    {loadError && <Alert severity="error" sx={{ mb: 2 }} action={<Button disabled={loading} onClick={() => setReload((n) => n + 1)} color="inherit">Refresh</Button>}>{loadError}</Alert>}
    {error && <Alert onClose={() => setError('')} severity="error" sx={{ mb: 2 }} action={<Button disabled={loading} onClick={() => setReload((n) => n + 1)} color="inherit">Refresh</Button>}>{error}</Alert>}
    {loading ? <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={24} aria-label="Loading documents" /></Box> : !expandedUpload && !uploadOnly && !loadError && !items.length && !hasFolders ? <Box sx={{ textAlign: 'center', py: 5 }}><FolderIcon /><Typography sx={{ fontSize: 15, fontWeight: 600, color: '#657487', mt: 2 }}>{folderId ? 'This folder is empty' : 'This course folder is empty'}</Typography><Typography sx={{ fontSize: 12, color: '#8b96a4', mt: 1 }}>Upload a document or create a folder to organize your materials.</Typography></Box> : null}
    {!uploadOnly && !loading && items.length > 0 && <Paper variant="outlined" sx={{ borderRadius: '10px', overflow: 'hidden' }}><List disablePadding aria-label="Documents">
      {items.map((material) => <ListItem key={material.id} disablePadding sx={{ borderBottom: '1px solid #eef0f3', '&:last-child': { border: 0 } }}>
        <ListItemButton disabled={material.state !== 'ready' || contentBusy} onClick={() => openContent(material)} aria-label={`Preview ${material.title}`} sx={{ p: 2, gap: 2, minWidth: 0 }}>
          <SvgIcon sx={{ color: '#8b9fb6', fontSize: 32, flexShrink: 0 }}><path d="M5 2h9l5 5v15H5V2zm9 1v5h5M8 12h8M8 16h8" fill="none" stroke="currentColor" strokeWidth="1.5" /></SvgIcon>
          <Box sx={{ minWidth: 0 }}><Typography sx={{ fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere' }}>{material.title}</Typography><Typography sx={{ fontSize: 11, color: '#8792a0', mt: 0.5 }}>{material.mediaType === 'application/pdf' ? 'PDF' : 'TXT'} · {size(material.sizeBytes)} · {new Date(material.createdAt).toLocaleDateString()}</Typography>{material.state !== 'ready' && <Typography sx={{ fontSize: 11, mt: 0.5 }}>{material.state === 'uploading' ? 'Upload pending' : 'Cleanup pending'}</Typography>}</Box>
        </ListItemButton>
        <IconButton aria-label={`Actions for document ${material.title}`} aria-haspopup="menu" onClick={(event) => setMenu({ anchor: event.currentTarget, material })} sx={{ mr: 1 }}><SvgIcon><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></SvgIcon></IconButton>
      </ListItem>)}
    </List></Paper>}
    {!uploadOnly && uploadingCount && <Box sx={{ mt: 1 }}><Typography sx={{ fontSize: 11, color: '#8792a0' }}>Pending operations recover automatically. Refresh to see their latest status.</Typography><Button size="small" disabled={loading} onClick={() => setReload((n) => n + 1)}>Refresh documents</Button></Box>}
    <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
      <MenuItem disabled={menu?.material.state !== 'ready'} onClick={() => { void openContent(menu.material, true); setMenu(null); }}>Download</MenuItem>
      <MenuItem disabled={menu?.material.state !== 'ready'} onClick={() => { setDialog({ material: menu.material }); setMenu(null); }}>Rename title</MenuItem>
      <MenuItem disabled={menu?.material.state === 'uploading'} onClick={() => { setDialog({ material: menu.material, deleting: true }); setMenu(null); }} sx={{ color: '#a94a42' }}>{menu?.material.state === 'ready' ? 'Delete document' : 'Retry cleanup'}</MenuItem>
    </Menu>
    {dialog && <MaterialDialog {...dialog} onClose={() => setDialog(null)} onSubmit={change} />}
    {preview && <Dialog open fullWidth maxWidth="md" onClose={closePreview} aria-labelledby="material-preview-title"><DialogTitle id="material-preview-title" sx={{ overflowWrap: 'anywhere' }}>{preview.material.title}</DialogTitle><DialogContent dividers>
      {preview.bytes === null ? <CircularProgress aria-label="Opening document" /> : preview.material.mediaType === 'text/plain' ? <Box component="pre" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontFamily: 'inherit', fontSize: 14 }}>{preview.text}</Box> : <Suspense fallback={<CircularProgress aria-label="Loading PDF viewer" />}><PdfPreview bytes={preview.bytes} /></Suspense>}
    </DialogContent><DialogActions><Button disabled={contentBusy} onClick={() => openContent(preview.material, true)}>Download original</Button><Button onClick={closePreview}>Close</Button></DialogActions></Dialog>}
  </Box>;
}
