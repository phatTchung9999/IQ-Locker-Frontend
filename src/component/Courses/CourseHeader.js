import { Link as RouterLink } from 'react-router-dom';
import { Box, Breadcrumbs, Chip, Link, Typography } from '@mui/material';
import { FolderIcon } from './CourseCard';

export default function CourseHeader({ course, folderId, breadcrumbs, basePath, actions }) {
  const root = `${basePath}/courses/${encodeURIComponent(course.id)}`;
  return <Box sx={{ p: { xs: 2.5, sm: 4 }, display: 'flex', alignItems: 'flex-start', gap: { xs: 1.5, sm: 2.5 }, bgcolor: '#fafbfc' }}>
    <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexShrink: 0 }}><FolderIcon large /></Box>
    <Box sx={{ minWidth: 0, flex: 1 }}>
      <Typography component="h2" sx={{ fontSize: { xs: 22, sm: 28 }, fontWeight: 600, overflowWrap: 'anywhere', letterSpacing: '-.6px' }}>{course.name}</Typography>
      {folderId && <Breadcrumbs aria-label="Folder breadcrumbs" sx={{ mt: 1, '& .MuiBreadcrumbs-ol': { flexWrap: 'wrap' }, '& a, & p': { fontSize: 13, overflowWrap: 'anywhere' } }}>
        <Link component={RouterLink} to={root} color="inherit">{course.name}</Link>
        {breadcrumbs.map((folder, index) => index === breadcrumbs.length - 1 ? <Typography key={folder.id} aria-current="page">{folder.name}</Typography> : <Link key={folder.id} component={RouterLink} to={`${root}/folders/${encodeURIComponent(folder.id)}`} color="inherit">{folder.name}</Link>)}
      </Breadcrumbs>}
      {(course.code || course.semester) && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>{course.code && <Chip label={course.code} size="small" sx={{ bgcolor: '#e7edf4', color: '#62768e' }} />}{course.semester && <Chip label={course.semester} size="small" variant="outlined" sx={{ color: '#8792a0', borderColor: '#dfe5eb' }} />}</Box>}
    </Box>
    {actions}
  </Box>;
}
