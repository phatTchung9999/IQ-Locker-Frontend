import { Link as RouterLink } from 'react-router-dom';
import { Box, CardActionArea, Paper, SvgIcon, Typography } from '@mui/material';

export function FolderIcon({ large = false }) {
  return <SvgIcon sx={{ fontSize: large ? 64 : 42, color: '#8b9fb6' }} viewBox="0 0 48 48"><path d="M5 11a3 3 0 0 1 3-3h11l5 5h16a3 3 0 0 1 3 3v22a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" fill="#d9e2ee" stroke="currentColor" strokeWidth="1.5" /><path d="M6 19h36" fill="none" stroke="currentColor" strokeWidth="1.5" /></SvgIcon>;
}

export default function CourseCard({ course, basePath, action }) {
  return <Paper sx={{ border: '1px solid #e2e5e9', borderRadius: '14px', boxShadow: 'none', position: 'relative', overflow: 'hidden', minWidth: 0, '&:hover': { borderColor: '#bccbdb' } }}>
    {action && <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}>{action}</Box>}
    <CardActionArea component={RouterLink} to={`${basePath}/courses/${encodeURIComponent(course.id)}`} aria-label={`Open ${course.name}`} sx={{ height: '100%', p: 3, display: 'block', textAlign: 'left' }}>
      <FolderIcon /><Typography component="h3" sx={{ fontSize: 16, fontWeight: 600, mt: 2, color: '#34475c', overflowWrap: 'anywhere', pr: action ? 4 : 0 }}>{course.name}</Typography>
      <Typography sx={{ fontSize: 12, color: '#8792a0', mt: 1, minHeight: 18, overflowWrap: 'anywhere' }}>{[course.code, course.semester].filter(Boolean).join(' · ') || 'Course folder'}</Typography>
    </CardActionArea>
  </Paper>;
}
