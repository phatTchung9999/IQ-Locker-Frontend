import { useState } from 'react';
import { Box, IconButton, Popover, SvgIcon, Tooltip, Typography } from '@mui/material';

export default function Notifications() {
  const [anchor, setAnchor] = useState(null);
  return <>
    <Tooltip title="Notifications">
      <IconButton aria-label="Notifications" aria-haspopup="dialog" aria-expanded={Boolean(anchor)} aria-controls={anchor ? 'notifications-panel' : undefined}
        onClick={(event) => setAnchor(event.currentTarget)} sx={{ width: 40, height: 40, color: '#526174' }}>
        <SvgIcon sx={{ fontSize: 22 }}><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3ZM10 20a2 2 0 0 0 4 0M12 2v2" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" /></SvgIcon>
      </IconButton>
    </Tooltip>
    <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{ paper: { sx: { mt: 1, width: 320, maxWidth: 'calc(100vw - 32px)', borderRadius: '12px', border: '1px solid #e2e5e9', boxShadow: '0 12px 40px #26394e22' } } }}>
      <Box id="notifications-panel" role="dialog" aria-labelledby="notifications-title" sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography component="h2" id="notifications-title" sx={{ fontSize: 15, fontWeight: 600, color: '#34475c' }}>Notifications</Typography>
          <IconButton aria-label="Close notifications" size="small" onClick={() => setAnchor(null)}><SvgIcon sx={{ fontSize: 18 }}><path d="m6 6 12 12M6 18 18 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></SvgIcon></IconButton>
        </Box>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#657487' }}>No notifications yet</Typography>
          <Typography sx={{ fontSize: 12, color: '#8792a0', mt: 1, lineHeight: 1.8 }}>Your updates and reminders will appear here.</Typography>
        </Box>
      </Box>
    </Popover>
  </>;
}
