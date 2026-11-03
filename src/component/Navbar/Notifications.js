import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Box, Button, CircularProgress, IconButton, List, ListItem, ListItemButton, Popover, SvgIcon, Tooltip, Typography } from '@mui/material';
import { api } from '../../utils/api';
import { courseOptions } from '../Courses/courseData';
const endpoint = '/api/v1/notifications';
const safePath = path => typeof path === 'string' && /^(\/profile|\/courses(?:\/[a-f\d]{24}(?:\/folders\/[a-f\d]{24})?(?:#material-[a-f\d]{24})?)?)$/i.test(path);
function check(data) {
  if (!Array.isArray(data?.notifications) || !Number.isSafeInteger(data.unreadCount) || data.unreadCount < 0 ||
      !(data.nextCursor === null || /^[a-f\d]{24}$/i.test(data.nextCursor)) ||
      !data.notifications.every(item => /^[a-f\d]{24}$/i.test(item.id) && typeof item.message === 'string' && safePath(item.path))) throw new Error('Invalid notification response');
  return data;
}
export default function Notifications({ wide = false, basePath, onUnauthorized, onNavigate }) {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);
  const [data, setData] = useState({ notifications: [], unreadCount: 0, nextCursor: null });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const mutation = useRef(null), fetching = useRef(null);
  const callbacks = useRef({ onUnauthorized, onNavigate }); callbacks.current = { onUnauthorized, onNavigate };
  const handleError = (err, message) => {
    if (err.response?.status === 401) callbacks.current.onUnauthorized?.(); else setError(message);
  };
  useEffect(() => {
    let timer, request;
    const load = async () => {
      if (document.hidden || mutation.current) return;
      request?.abort();
      const controller = new AbortController(); request = controller; fetching.current = controller;
      try {
        const response = await api.get(endpoint, courseOptions(controller.signal));
        if (!controller.signal.aborted) { setData(check(response.data)); setError(''); }
      } catch (err) {
        if (!controller.signal.aborted) handleError(err, 'Couldn’t refresh notifications.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    const visibility = () => { if (document.hidden) request?.abort(); else void load(); };
    void load();
    timer = setInterval(() => { void load(); }, 30000);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      clearInterval(timer); request?.abort(); mutation.current?.abort(); mutation.current = null;
      document.removeEventListener('visibilitychange', visibility);
    };
    // Callbacks are held in a ref so layout/profile changes do not reset polling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  const act = async (item, navigateToItem = false) => {
    if (mutation.current) return;
    fetching.current?.abort();
    const controller = new AbortController(); mutation.current = controller; setBusy(true);
    try {
      const response = await api.patch(item ? `${endpoint}/${item.id}/read` : `${endpoint}/read-all`, {}, courseOptions(controller.signal));
      if (controller.signal.aborted) return;
      const readAt = item ? response.data.readAt : new Date().toISOString();
      setData(previous => ({ ...previous, unreadCount: item ? Math.max(0, previous.unreadCount - (item.readAt ? 0 : 1)) : 0,
        notifications: previous.notifications.map(row => !item || row.id === item.id ? { ...row, readAt } : row) }));
      setError('');
      if (navigateToItem && safePath(item.path)) {
        setAnchor(null); navigate(`${basePath}${item.path}`); callbacks.current.onNavigate?.();
      }
    } catch (err) { if (!controller.signal.aborted) handleError(err, 'Couldn’t mark notifications as read. Please try again.'); }
    finally { if (!controller.signal.aborted) setBusy(false); if (mutation.current === controller) mutation.current = null; }
  };
  const more = async () => {
    if (mutation.current || !data.nextCursor) return;
    fetching.current?.abort();
    const controller = new AbortController(); mutation.current = controller; setBusy(true);
    try {
      const response = await api.get(endpoint, { ...courseOptions(controller.signal), params: { before: data.nextCursor } });
      if (controller.signal.aborted) return;
      const next = check(response.data);
      setData(previous => ({ ...next, notifications: [...previous.notifications, ...next.notifications.filter(item => !previous.notifications.some(row => row.id === item.id))] })); setError('');
    } catch (err) { if (!controller.signal.aborted) handleError(err, 'Couldn’t load more notifications.'); }
    finally { if (!controller.signal.aborted) setBusy(false); if (mutation.current === controller) mutation.current = null; }
  };
  return <>
    <Tooltip title={wide ? '' : 'Notifications'} placement="right">
      <Button aria-label={data.unreadCount ? `Notifications, ${data.unreadCount} unread` : 'Notifications'} aria-haspopup="dialog" aria-expanded={Boolean(anchor)} aria-controls={anchor ? 'notifications-panel' : undefined}
        onClick={event => { setAnchor(event.currentTarget); setBusy(false); setRefresh(value => value + 1); }}
        sx={{ minWidth: 0, width: '100%', minHeight: 46, justifyContent: wide ? 'flex-start' : 'center', px: wide ? 1 : 0, mb: 1, gap: 1.25, textTransform: 'none', borderRadius: '9px', color: '#526174' }}>
        <Box sx={{ width: 34, display: 'grid', placeItems: 'center' }}><Badge badgeContent={data.unreadCount} max={99} sx={{ '& .MuiBadge-badge': { bgcolor: '#a54b3e', color: '#fff', fontSize: 10 } }}>
          <SvgIcon sx={{ fontSize: 22 }}><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3ZM10 20a2 2 0 0 0 4 0M12 2v2" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" /></SvgIcon>
        </Badge></Box>{wide && <Typography sx={{ fontSize: 12 }}>Notifications</Typography>}
      </Button>
    </Tooltip>
    <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      slotProps={{ paper: { sx: { ml: 1, width: 360, maxWidth: 'calc(100vw - 32px)', maxHeight: 'min(560px, calc(100dvh - 32px))', borderRadius: '12px', border: '1px solid #e2e5e9', boxShadow: '0 12px 40px #26394e22' } } }}>
      <Box id="notifications-panel" role="dialog" aria-labelledby="notifications-title" sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography component="h2" id="notifications-title" sx={{ fontSize: 15, fontWeight: 600, color: '#34475c' }}>Notifications</Typography>
          <IconButton aria-label="Close notifications" size="small" onClick={() => setAnchor(null)}><SvgIcon sx={{ fontSize: 18 }}><path d="m6 6 12 12M6 18 18 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></SvgIcon></IconButton>
        </Box>
        {data.unreadCount > 0 && <Button size="small" disabled={busy} onClick={() => act(null)} sx={{ textTransform: 'none', my: 1 }}>Mark all as read</Button>}
        {error && <Alert severity="warning" action={<Button size="small" disabled={busy} onClick={() => { setBusy(false); setRefresh(value => value + 1); }}>Retry</Button>} sx={{ mt: 1 }}>{error}</Alert>}
        {loading ? <Box sx={{ textAlign: 'center', py: 3 }}><CircularProgress size={22} aria-label="Loading notifications" /></Box> : data.notifications.length === 0 ?
          <Typography sx={{ textAlign: 'center', py: 4, fontSize: 13, color: '#657487' }}>No notifications yet</Typography> :
          <List sx={{ p: 0, mt: 1 }}>{data.notifications.map(item => <ListItem key={item.id} disablePadding sx={{ display: 'block', mb: 1, borderRadius: '8px', bgcolor: item.readAt ? '#f8f9fb' : '#edf3f9' }}>
            <ListItemButton disabled={busy} onClick={() => act(item, true)} sx={{ display: 'block', borderRadius: '8px' }}>
              <Typography sx={{ fontSize: 12, fontWeight: item.readAt ? 400 : 600, color: '#34475c', overflowWrap: 'anywhere' }}>{item.message}</Typography>
              <Typography component="time" dateTime={item.createdAt} sx={{ display: 'block', fontSize: 10, color: '#78889a', mt: 0.75 }}>{new Date(item.createdAt).toLocaleString()}</Typography>
            </ListItemButton>
            {!item.readAt && <Button size="small" disabled={busy} onClick={() => act(item)} sx={{ textTransform: 'none', fontSize: 11, ml: 1 }}>Mark as read</Button>}
          </ListItem>)}</List>}
        {data.nextCursor && <Button fullWidth disabled={busy} onClick={more} sx={{ textTransform: 'none' }}>Load more</Button>}
      </Box>
    </Popover>
  </>;
}
