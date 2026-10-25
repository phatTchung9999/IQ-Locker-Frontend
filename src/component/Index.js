import SignIn from './Auth/SignIn.js';
import SignUp from './Auth/SignUp.js';
import Home from './Home/Home.js';
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { accountHandle, accountPath } from '../utils/account';

function StudentHome({ user, onLogout, onUserUpdate }) {
  const { handle, '*': section } = useParams();
  if (!user) return <Navigate to="/" replace />;
  // Changing the URL cannot select a different account's locker.
  const detail = /^courses\/([^/]+)(?:\/folders\/([^/]+))?\/?$/.exec(section || '');
  const suffix = detail ? `/courses/${encodeURIComponent(detail[1])}${detail[2] ? `/folders/${encodeURIComponent(detail[2])}` : ''}` :
    ['profile', 'courses', 'materials', 'upcoming'].includes(section) ? `/${section}` : '';
  return <>
    {handle !== accountHandle(user.fullname) && <Navigate to={`${accountPath(user)}${suffix}`} replace />}
    <Home user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />
  </>;
}

export default function Index({ user, onSignIn, onLogout, onUserUpdate }) {
  return <BrowserRouter><Routes>
    <Route path="/" element={user ? <Navigate to={accountPath(user)} replace /> : <SignIn onSignIn={onSignIn} />} />
    <Route path="/signup" element={user ? <Navigate to={accountPath(user)} replace /> : <SignUp />} />
    <Route path="/:handle/*" element={<StudentHome user={user} onLogout={onLogout} onUserUpdate={onUserUpdate} />} />
    <Route path="*" element={<Navigate to={user ? accountPath(user) : '/'} replace />} />
  </Routes></BrowserRouter>;
}
