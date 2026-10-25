import { useCallback, useState } from 'react';
import Courses from '../Courses/Courses';
import HomeCourses from '../Courses/HomeCourses';
import Profile from '../Profile/Profile';
import Notifications from '../Navbar/Notifications';
import { Link as RouterLink, Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  Avatar, Box, Button, Divider, Drawer,
  IconButton, List, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem,
  Paper, SvgIcon, Tooltip, Typography, useMediaQuery,
} from '@mui/material';
import { accountPath } from '../../utils/account';

const paths = {
  home: 'M3 10.5 12 3l9 7.5V21h-6v-7H9v7H3z',
  courses: 'M3 4h7a3 3 0 0 1 3 3v14a4 4 0 0 0-4-2H3z M21 4h-5a3 3 0 0 0-3 3v14a4 4 0 0 1 4-2h4z',
  materials: 'M4 3h10l6 6v12H4z M14 3v6h6 M8 13h8 M8 17h6',
  upcoming: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h2 M14 14h2 M8 17h2',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  chevron: 'm9 5 7 7-7 7',
  arrow: 'M5 12h14 m-5-5 5 5-5 5',
  logout: 'M10 4H4v16h6 M10 12h11 m-5-5 5 5-5 5',
  incomplete: 'M21 12a9 9 0 1 1-9-9',
  person: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
  close: 'm6 6 12 12 M6 18 18 6',
};

function Icon({ name, ...props }) {
  return <SvgIcon {...props} viewBox="0 0 24 24"><path d={paths[name]} fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" /></SvgIcon>;
}

const features = [
  { key: 'home', label: 'Home', suffix: '' },
  { key: 'courses', label: 'Courses', suffix: '/courses' },
  { key: 'materials', label: 'Materials', suffix: '/materials' },
  { key: 'upcoming', label: 'Upcoming deadlines', suffix: '/upcoming' },
];
const cardStyle = { border: '1px solid #e2e5e9', borderRadius: '14px', boxShadow: 'none', bgcolor: '#fff' };
const actionStyle = { color: '#40566e', textTransform: 'none', fontSize: 12, fontWeight: 600 };

function EmptyState({ icon, title, children, compact = false }) {
  return <Box sx={{ textAlign: 'center', py: compact ? 4 : 6, px: 2 }}>
    <Box sx={{ width: 48, height: 48, mx: 'auto', mb: 2, borderRadius: '14px', bgcolor: '#f0f2f5', color: '#7d8998', display: 'grid', placeItems: 'center' }}><Icon name={icon} /></Box>
    <Typography sx={{ fontSize: 14, fontWeight: 600, color: '#4d5867' }}>{title}</Typography>
    <Typography sx={{ fontSize: 12, color: '#84909d', mt: 1, lineHeight: 1.8, maxWidth: 300, mx: 'auto' }}>{children}</Typography>
  </Box>;
}

export default function Home({ user, onLogout, onUserUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountAnchor, setAccountAnchor] = useState(null);
  const desktop = useMediaQuery('(min-width:900px)');
  const { '*': section } = useParams();
  const navigate = useNavigate();
  const basePath = accountPath(user);
  const currentSection = section?.replace(/\/$/, '') || '';
  const courseDetail = /^courses\/([^/]+)(?:\/folders\/([^/]+))?$/.exec(currentSection);
  const current = courseDetail ? features.find((feature) => feature.key === 'courses') : [...features, { key: 'profile', label: 'My profile', suffix: '/profile' }].find((feature) => feature.suffix === (currentSection ? `/${currentSection}` : ''));
  const firstName = user.fullname.trim().split(/\s+/)[0];
  const initials = user.fullname.trim().split(/\s+/).map((part) => Array.from(part)[0]).filter(Boolean);
  const avatar = `${initials[0]}${initials.length > 1 ? initials[initials.length - 1] : ''}`.toUpperCase();
  const wide = !desktop || expanded;
  const railWidth = expanded ? 244 : 76;
  const missingDetails = [
    ['school', 'School'], ['major', 'Major'], ['phone', 'Phone number'],
  ].filter(([field]) => typeof user[field] !== 'string' || !user[field].trim()).map(([, label]) => label);

  const signOut = useCallback(() => {
    setAccountAnchor(null);
    onLogout();
    navigate('/', { replace: true });
  }, [onLogout, navigate]);

  const navigation = <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box', overflowY: 'auto', px: 1.5, py: 2.5 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: wide ? 'space-between' : 'center', mb: 3, minHeight: 38 }}>
      {wide && <Typography sx={{ ml: 1, fontWeight: 800, letterSpacing: '-.7px', fontSize: 20, color: '#34475c' }}>IQLocker</Typography>}
      <Tooltip title={desktop ? (expanded ? 'Collapse navigation' : 'Expand navigation') : 'Close navigation'} placement="right">
        <IconButton aria-label={desktop ? (expanded ? 'Collapse navigation' : 'Expand navigation') : 'Close navigation'}
          aria-expanded={desktop ? expanded : mobileOpen} aria-controls="locker-navigation"
          onClick={() => desktop ? setExpanded(!expanded) : setMobileOpen(false)}
          sx={{ color: wide ? '#526174' : '#26394e', width: 40, height: 40, border: wide ? 'none' : '3px solid #26394e', borderRadius: wide ? '50%' : '8px' }}>
          {wide ? <Icon name={desktop ? 'chevron' : 'close'} sx={{ transform: desktop ? 'rotate(180deg)' : 'none', fontSize: 20 }} /> : <Typography sx={{ fontWeight: 800, fontSize: 13 }}>IQ</Typography>}
        </IconButton>
      </Tooltip>
    </Box>
    {wide && <Typography sx={{ px: 1.5, mb: 1.5, fontSize: 9, color: '#8b95a2', letterSpacing: 1.8, fontWeight: 700 }}>YOUR WORKSPACE</Typography>}
    <List id="locker-navigation" sx={{ p: 0, display: 'grid', gap: 0.8 }}>
      {features.map((feature) => <Tooltip key={feature.key} title={wide ? '' : feature.label} placement="right">
        <ListItemButton component={RouterLink} to={basePath + feature.suffix} onClick={() => setMobileOpen(false)}
          selected={current?.key === feature.key} aria-label={feature.label} aria-current={current?.key === feature.key ? 'page' : undefined}
          sx={{ borderRadius: '9px', px: wide ? 1.5 : 0, minHeight: 46, justifyContent: wide ? 'flex-start' : 'center', color: '#778290',
            '&.Mui-selected': { bgcolor: '#e2e7ee', color: '#34475c' }, '&.Mui-selected:hover': { bgcolor: '#dce3ec' } }}>
          <ListItemIcon sx={{ color: 'inherit', minWidth: wide ? 36 : 0 }}><Icon name={feature.key} sx={{ fontSize: 21 }} /></ListItemIcon>
          {wide && <ListItemText primary={feature.label} slotProps={{ primary: { sx: { fontSize: 12, fontWeight: current?.key === feature.key ? 600 : 400, whiteSpace: 'nowrap' } } }} />}
        </ListItemButton>
      </Tooltip>)}
    </List>
    <Box sx={{ mt: 'auto', pt: 3 }}>
      <Divider sx={{ mb: 2, borderColor: '#e0e4e8' }} />
      <Tooltip title={wide ? '' : 'Account'} placement="right">
        <Button aria-label="Account menu" aria-haspopup="menu" aria-expanded={Boolean(accountAnchor)} aria-controls={accountAnchor ? 'account-menu' : undefined}
          onClick={(event) => setAccountAnchor(event.currentTarget)}
          sx={{ minWidth: 0, width: '100%', display: 'flex', gap: 1.25, justifyContent: wide ? 'flex-start' : 'center', textTransform: 'none', color: '#34475c', borderRadius: '9px', px: wide ? 1 : 0, py: 1 }}>
          <Avatar sx={{ width: 34, height: 34, bgcolor: '#dbe1e8', color: '#485b70', fontSize: 12, fontWeight: 700 }}>{avatar}</Avatar>
          {wide && <Box sx={{ textAlign: 'left', overflow: 'hidden' }}><Typography noWrap sx={{ fontSize: 12, fontWeight: 600 }}>{user.fullname}</Typography><Typography sx={{ fontSize: 10, color: '#8b95a2' }}>Your account</Typography></Box>}
        </Button>
      </Tooltip>
    </Box>
  </Box>;

  if (!current) return <Navigate to={basePath} replace />;

  return <Box sx={{ minHeight: '100svh', bgcolor: '#f5f6f8', color: '#283240', '& *': { boxSizing: 'border-box' } }}>
    <Box component="a" href="#main-content" sx={{ position: 'fixed', left: -10000, top: 8, zIndex: 1500, '&:focus': { left: 90, bgcolor: '#fff', p: 1 } }}>Skip to content</Box>
    <Box component="nav" aria-label="Main navigation" sx={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 1100, width: railWidth, display: { xs: 'none', md: 'block' }, borderRight: '1px solid #dfe3e8', bgcolor: '#eef0f3', transition: 'width 220ms ease', '@media (prefers-reduced-motion: reduce)': { transition: 'none' } }}>{desktop && navigation}</Box>
    <Drawer open={!desktop && mobileOpen} onClose={() => setMobileOpen(false)} slotProps={{ paper: { sx: { width: 260, bgcolor: '#eef0f3' } } }}><Box component="nav" aria-label="Main navigation" sx={{ height: '100%' }}>{!desktop && navigation}</Box></Drawer>
    <Box sx={{ ml: { xs: 0, md: `${railWidth}px` }, transition: 'margin-left 220ms ease', '@media (prefers-reduced-motion: reduce)': { transition: 'none' } }}>
      <Box component="header" sx={{ minHeight: 76, px: { xs: 2, md: 4 }, borderBottom: '1px solid #e5e8ec', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, bgcolor: '#fafbfc' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
          <IconButton aria-label="Open navigation" onClick={() => setMobileOpen(true)} sx={{ display: { md: 'none' }, color: '#526174' }}><Icon name="menu" /></IconButton>
          <Typography noWrap sx={{ fontSize: { xs: 11, sm: 13 }, fontWeight: 600 }}>My workspace<Box component="span" sx={{ color: '#a4adb8', mx: 1.5 }}>/</Box><Box component="span" sx={{ color: '#8893a1', fontWeight: 400 }}>{current.label}</Box></Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <Typography sx={{ fontSize: 11, color: '#8893a1', display: { xs: 'none', sm: 'block' } }}>Store Smart. Analyze Smarter.</Typography>
          <Notifications />
        </Box>
      </Box>
      <Box component="main" id="main-content" tabIndex={-1} sx={{ maxWidth: 1360, mx: 'auto', p: { xs: 2.5, sm: 4, lg: 5 }, outline: 'none' }}>
        {current.key === 'home' && missingDetails.length > 0 && <Paper component="section" aria-labelledby="profile-setup-title" sx={{ ...cardStyle, p: { xs: 2, sm: 2.5 }, mb: 3, display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2.5, flexWrap: 'wrap', borderColor: '#e7bd69', bgcolor: '#fff6e5' }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flex: 1, minWidth: { xs: '100%', sm: 280 } }}>
            <Box aria-hidden="true" sx={{ width: 42, height: 42, borderRadius: '12px', bgcolor: '#ffedc8', color: '#996415', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="incomplete" sx={{ fontSize: 24 }} /></Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography component="h2" id="profile-setup-title" sx={{ fontSize: 15, fontWeight: 600, color: '#694818' }}>Finish setting up your account</Typography>
              <Typography sx={{ fontSize: 12, color: '#846a3e', lineHeight: 1.8, mt: 0.75 }}>Add a few details to help us tailor study assistance to you.</Typography>
              <Typography sx={{ fontSize: 11, color: '#846a3e', mt: 1 }}>Still needed: {missingDetails.join(', ')}.</Typography>
            </Box>
          </Box>
          <Button component={RouterLink} to={`${basePath}/profile`} variant="outlined" endIcon={<Icon name="arrow" />} sx={{ ...actionStyle, color: '#795016', borderColor: '#d2a653', '&:hover': { borderColor: '#aa7627', bgcolor: '#ffedc8' }, borderRadius: '8px', px: 2, py: 1, whiteSpace: 'nowrap' }}>Complete profile</Button>
        </Paper>}
        {current.key !== 'profile' && <Typography sx={{ fontSize: 9, letterSpacing: 2, color: '#8b95a2', fontWeight: 700, mb: 1.2 }}>YOUR PERSONAL LEARNING SPACE</Typography>}
        <Typography component="h1" sx={{ fontSize: { xs: 28, sm: 34 }, fontWeight: 700, letterSpacing: '-1px', mb: current.key === 'profile' ? 4 : 0 }}>{current.key === 'home' ? `Welcome home, ${firstName}.` : current.label}</Typography>
        {current.key !== 'profile' && <Typography sx={{ fontSize: 13, color: '#8a94a1', mt: 1, mb: 4, lineHeight: 1.8 }}>{current.key === 'home' ? 'A clearer space for everything you’re learning.' : {
          courses: 'A place for every subject and every new idea.',
          materials: 'Keep your notes, syllabi, and past exams together.',
          upcoming: 'See what’s ahead, one deadline at a time.',
        }[current.key]}</Typography>}

        {current.key === 'courses' ? <Courses key={user.email} courseId={courseDetail?.[1]} folderId={courseDetail?.[2]} basePath={basePath} onUnauthorized={signOut} /> : current.key === 'profile' ? <Profile user={user} onUserUpdate={onUserUpdate} onLogout={onLogout} /> : current.key === 'home' ? <>
          <Paper sx={{ ...cardStyle, p: { xs: 3, sm: 4 }, mb: 4, bgcolor: '#e9edf2', backgroundImage: 'linear-gradient(110deg, #e6ebf1, #f0f2f5)', display: 'flex', justifyContent: 'space-between', gap: 3, alignItems: 'center' }}>
            <Box sx={{ maxWidth: 520 }}>
              <Typography sx={{ color: '#6a7d93', fontSize: 9, letterSpacing: 2, fontWeight: 700, mb: 1.5 }}>A NEW CHAPTER STARTS HERE</Typography>
              <Typography component="h2" sx={{ fontSize: { xs: 23, sm: 27 }, fontWeight: 600, letterSpacing: '-.8px' }}>Big ideas need a little space.</Typography>
              <Typography sx={{ color: '#7a8797', fontSize: 12, lineHeight: 1.9, mt: 1.5, maxWidth: 390 }}>From the first lecture to the final exam, make room for your notes, your progress, and your potential.</Typography>
              <Button component={RouterLink} to={`${basePath}/courses`} endIcon={<Icon name="arrow" />} sx={{ ...actionStyle, mt: 2, px: 0 }}>Explore your courses</Button>
            </Box>
            <Box aria-hidden="true" sx={{ display: { xs: 'none', sm: 'grid' }, gridTemplateColumns: 'repeat(3, 1fr)', alignItems: 'end', gap: 1, height: 120, pr: 2, flexShrink: 0 }}>
              {[['N', 86, '#b8c7d9'], ['S', 112, '#c8cdd5'], ['E', 96, '#b6c4be']].map(([letter, height, color]) => <Box key={letter} sx={{ width: 37, height, bgcolor: color, borderRadius: '5px', display: 'grid', placeItems: 'center', transform: letter === 'E' ? 'rotate(8deg)' : 'none', boxShadow: 'inset -5px 0 #00000008' }}><Typography sx={{ color: '#607083', fontSize: 11, fontWeight: 600 }}>{letter}</Typography></Box>)}
            </Box>
          </Paper>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.65fr 1fr' }, gap: 3 }}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}><Typography component="h2" sx={{ fontSize: 15, fontWeight: 600 }}>Your courses</Typography><Button component={RouterLink} to={`${basePath}/courses`} sx={actionStyle}>View courses <Icon name="arrow" sx={{ ml: 1, fontSize: 15 }} /></Button></Box>
              <HomeCourses key={user.email} basePath={basePath} onUnauthorized={signOut} />
            </Box>
            <Box>
              <Typography component="h2" sx={{ fontSize: 15, fontWeight: 600, mb: 2.5, mt: 0.8 }}>On the horizon</Typography>
              <Paper sx={cardStyle}><EmptyState icon="upcoming" title="No deadlines to show" compact>Confirmed exams and assignment dates will appear here.</EmptyState><Divider sx={{ borderColor: '#eef0f3' }} /><Button component={RouterLink} to={`${basePath}/upcoming`} sx={{ ...actionStyle, width: '100%', py: 1.5 }}>View upcoming deadlines <Icon name="arrow" sx={{ ml: 1, fontSize: 15 }} /></Button></Paper>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 4, mb: 1.5 }}><Typography component="h2" sx={{ fontSize: 15, fontWeight: 600 }}>Recent materials</Typography><Button component={RouterLink} to={`${basePath}/materials`} sx={actionStyle}>View all <Icon name="arrow" sx={{ ml: 1, fontSize: 15 }} /></Button></Box>
          <Paper sx={cardStyle}><EmptyState icon="materials" title="Your next idea starts here" compact>Notes, syllabi, and past exams will appear here as you build your locker.</EmptyState></Paper>
        </> : <Paper sx={cardStyle}><EmptyState icon={current.key} title={{ courses: 'Your courses will live here', materials: 'Your materials will live here', upcoming: 'Your schedule has room to grow' }[current.key]}>{
          { courses: 'Organize each subject with its own space for notes, syllabi, and exams.', materials: 'A central home for the documents you learn from, organized by course.', upcoming: 'Keep confirmed exam dates and assignment deadlines together.' }[current.key]
        }</EmptyState><Divider sx={{ borderColor: '#eef0f3' }} /><Box sx={{ textAlign: 'center', p: 1.5 }}><Button component={RouterLink} to={basePath} sx={actionStyle}>Back to home</Button></Box></Paper>}
        {current.key !== 'profile' && <Typography sx={{ mt: 4, color: '#a1a9b3', fontSize: 10 }}>IQLocker · A little organization. A lot of possibility.</Typography>}
      </Box>
    </Box>
    <Menu id="account-menu" anchorEl={accountAnchor} open={Boolean(accountAnchor)} onClose={() => setAccountAnchor(null)} anchorOrigin={{ vertical: 'top', horizontal: 'right' }} transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
      <Box sx={{ px: 2, py: 1, maxWidth: 260 }}><Typography sx={{ fontSize: 13, fontWeight: 600, overflowWrap: 'anywhere' }}>{user.fullname}</Typography><Typography sx={{ color: '#8893a1', fontSize: 11, overflowWrap: 'anywhere' }}>{user.email}</Typography></Box>
      <Divider />
      <MenuItem component={RouterLink} to={`${basePath}/profile`} onClick={() => { setAccountAnchor(null); setMobileOpen(false); }} sx={{ fontSize: 13 }}><ListItemIcon><Icon name="person" fontSize="small" /></ListItemIcon>My profile</MenuItem>
      <MenuItem onClick={signOut} sx={{ fontSize: 13 }}><ListItemIcon><Icon name="logout" fontSize="small" /></ListItemIcon>Log out</MenuItem>
    </Menu>
  </Box>;
}
