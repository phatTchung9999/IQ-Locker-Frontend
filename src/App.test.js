import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { api } from './utils/api';

// CRA's Jest resolver predates React Router's /dom package export.
// Use the same real routing components through its primary entry point.
jest.mock('react-router-dom', () => jest.requireActual('react-router'));
jest.mock('./utils/api', () => ({ api: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
jest.mock('axios', () => ({ isAxiosError: (error) => Boolean(error.response) }));

const user = { fullname: 'Phat Chung', email: 'student@example.com', phone: '', school: '', major: '' };
beforeEach(() => {
  jest.clearAllMocks();
  api.get.mockReset();
  api.get.mockResolvedValue({ data: [] });
  localStorage.clear();
  window.history.replaceState({}, '', '/');
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: query === '(min-width:900px)', media: query, onchange: null,
    addListener: jest.fn(), removeListener: jest.fn(), addEventListener: jest.fn(), removeEventListener: jest.fn(), dispatchEvent: jest.fn(),
  }));
});

async function openHome(path = '/p_chung') {
  localStorage.setItem('token', 'session-token');
  window.history.replaceState({}, '', path);
  api.get.mockImplementation((url) => Promise.resolve({ data: url === '/api/v1/courses' ? [] : user }));
  render(<App />);
  return screen.findByRole('heading', { name: 'Welcome home, Phat.' });
}

test('redirects an unauthenticated homepage visit to sign in', async () => {
  window.history.replaceState({}, '', '/p_chung');
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/');
});

test('signs in and opens the name-based homepage with the returned token', async () => {
  api.post.mockResolvedValue({ data: { token: 'new-token', user } });
  render(<App />);
  await screen.findByLabelText(/Email address/);
  fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: user.email } });
  fireEvent.change(screen.getByLabelText('Password', { exact: false, selector: 'input' }), { target: { value: 'test-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('heading', { name: 'Welcome home, Phat.' })).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBe('new-token');
  expect(window.location.pathname).toBe('/p_chung');
});

test('restores the authenticated profile and canonicalizes a different URL handle', async () => {
  await openHome('/a_someone');
  expect(api.get).toHaveBeenCalledWith('/api/v1/user/me', expect.objectContaining({ headers: { Authorization: 'Bearer session-token' } }));
  expect(window.location.pathname).toBe('/p_chung');
});

test('expands navigation, switches features, and logs out through the pinned account menu', async () => {
  await openHome();
  fireEvent.click(screen.getByRole('button', { name: 'Expand navigation' }));
  expect(screen.getByRole('button', { name: 'Collapse navigation' })).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(screen.getByRole('link', { name: 'Courses', exact: true }));
  expect(await screen.findByRole('heading', { name: 'Courses', exact: true })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/p_chung/courses');
  fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Log out' }));
  expect(await screen.findByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBeNull();
  expect(window.location.pathname).toBe('/');
});

test('clears an expired session', async () => {
  localStorage.setItem('token', 'expired');
  api.get.mockRejectedValue({ response: { status: 401 } });
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBeNull();
});

test('keeps the session on a connection failure and supports retry', async () => {
  localStorage.setItem('token', 'session-token');
  api.get.mockRejectedValueOnce(new Error('Network unavailable')).mockResolvedValueOnce({ data: user });
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('check your connection');
  expect(localStorage.getItem('token')).toBe('session-token');
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByRole('heading', { name: 'Welcome home, Phat.' });
});

async function openProfile() {
  await openHome();
  fireEvent.click(screen.getByRole('button', { name: 'Account menu' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'My profile' }));
  await screen.findByRole('heading', { name: 'My profile', exact: true });
}

test('opens the profile route and cancels unsaved changes', async () => {
  await openProfile();
  expect(window.location.pathname).toBe('/p_chung/profile');
  expect(screen.getByLabelText('Email address')).toHaveAttribute('readonly');
  fireEvent.change(screen.getByLabelText(/First name/), { target: { value: 'Unsaved Name' } });
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByLabelText(/First name/)).toHaveValue('Phat');
  expect(screen.getByLabelText(/Last name/)).toHaveValue('Chung');
  expect(api.patch).not.toHaveBeenCalled();
});

test('saves the name and updates the canonical profile URL', async () => {
  api.patch.mockResolvedValue({ data: { ...user, fullname: 'Phat Nguyen' } });
  await openProfile();
  fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: 'Nguyen' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Your profile has been saved.');
  expect(window.location.pathname).toBe('/p_nguyen/profile');
  expect(api.patch).toHaveBeenCalledWith('/api/v1/user/me', { fullname: 'Phat Nguyen', phone: '', school: '', major: '' }, expect.objectContaining({ headers: { Authorization: 'Bearer session-token' } }));
  expect(screen.getByLabelText(/Last name/)).toHaveValue('Nguyen');
  expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  fireEvent.click(screen.getByRole('link', { name: 'Home', exact: true }));
  expect(await screen.findByRole('heading', { name: 'Welcome home, Phat.' })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/p_nguyen');
});

test('keeps unsaved input and the current route when saving fails', async () => {
  api.patch.mockRejectedValue({ response: { status: 500, data: { message: 'Unable to save right now' } } });
  await openProfile();
  fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: 'Nguyen' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save right now');
  expect(window.location.pathname).toBe('/p_chung/profile');
  expect(screen.getByLabelText(/Last name/)).toHaveValue('Nguyen');
  expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
});

test('requires signing in again when a profile save returns unauthorized', async () => {
  api.patch.mockRejectedValue({ response: { status: 401 } });
  await openProfile();
  fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: 'Nguyen' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBeNull();
});


test('resets unsaved phone, school and major edits on Cancel', async () => {
  await openProfile();
  fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '+1 555 010 1234' } });
  fireEvent.change(screen.getByLabelText('School name'), { target: { value: 'Example University' } });
  fireEvent.change(screen.getByLabelText('Major or field of study'), { target: { value: 'Computer Science' } });
  expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.getByLabelText('Phone number')).toHaveValue('');
  expect(screen.getByLabelText('School name')).toHaveValue('');
  expect(screen.getByLabelText('Major or field of study')).toHaveValue('');
  expect(api.patch).not.toHaveBeenCalled();
});

test('previews an avatar locally and releases it when cancelled', async () => {
  URL.createObjectURL = jest.fn().mockReturnValue('blob:avatar-preview');
  URL.revokeObjectURL = jest.fn();
  await openProfile();
  const image = new File(['example-image'], 'avatar.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText('Avatar image'), { target: { files: [image] } });
  expect(screen.getByRole('img', { name: user.fullname })).toHaveAttribute('src', 'blob:avatar-preview');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:avatar-preview');
  expect(api.patch).not.toHaveBeenCalled();
});

test('rejects unsupported avatar files', async () => {
  await openProfile();
  fireEvent.change(screen.getByLabelText('Avatar image'), { target: { files: [new File(['document'], 'notes.pdf', { type: 'application/pdf' })] } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Choose a JPG, PNG, or WebP image');
  expect(api.patch).not.toHaveBeenCalled();
});


test('opens and closes the avatar picker from its camera control', async () => {
  await openProfile();
  fireEvent.click(screen.getByRole('button', { name: 'Change avatar' }));
  expect(await screen.findByRole('dialog', { name: 'Change avatar' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'or browse files' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close avatar picker' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Change avatar' })).not.toBeInTheDocument());
});

test('accepts a dropped photo as a local preview and closes the picker', async () => {
  URL.createObjectURL = jest.fn().mockReturnValue('blob:dropped-avatar');
  URL.revokeObjectURL = jest.fn();
  await openProfile();
  fireEvent.click(screen.getByRole('button', { name: 'Change avatar' }));
  await screen.findByRole('dialog', { name: 'Change avatar' });
  const photo = new File(['photo'], 'avatar.png', { type: 'image/png' });
  fireEvent.drop(screen.getByLabelText('Photo drop area'), { dataTransfer: { files: [photo] } });
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Change avatar' })).not.toBeInTheDocument());
  expect(screen.getByRole('img', { name: user.fullname })).toHaveAttribute('src', 'blob:dropped-avatar');
  expect(api.patch).not.toHaveBeenCalled();
});

test('keeps the avatar picker open when multiple photos are dropped', async () => {
  await openProfile();
  fireEvent.click(screen.getByRole('button', { name: 'Change avatar' }));
  await screen.findByRole('dialog', { name: 'Change avatar' });
  const photo = new File(['photo'], 'avatar.png', { type: 'image/png' });
  fireEvent.drop(screen.getByLabelText('Photo drop area'), { dataTransfer: { files: [photo, photo] } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Please choose one photo at a time.');
  expect(screen.getByRole('dialog', { name: 'Change avatar' })).toBeInTheDocument();
});


test('saves phone, school and major without changing the name or route', async () => {
  const updated = { ...user, phone: '+1 555 010 1234', school: 'Example University', major: 'Computer Science' };
  api.patch.mockResolvedValue({ data: updated });
  await openProfile();
  fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: updated.phone } });
  fireEvent.change(screen.getByLabelText('School name'), { target: { value: updated.school } });
  fireEvent.change(screen.getByLabelText('Major or field of study'), { target: { value: updated.major } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Your profile has been saved.');
  expect(api.patch).toHaveBeenCalledWith('/api/v1/user/me', { fullname: user.fullname, phone: updated.phone, school: updated.school, major: updated.major }, expect.any(Object));
  expect(window.location.pathname).toBe('/p_chung/profile');
  expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
});

test('restores saved optional details on refresh and can clear a saved field', async () => {
  const saved = { ...user, phone: '+1 555 010 1234', school: 'Example University', major: 'Computer Science' };
  localStorage.setItem('token', 'session-token');
  window.history.replaceState({}, '', '/p_chung/profile');
  api.get.mockResolvedValue({ data: saved });
  api.patch.mockResolvedValue({ data: { ...saved, school: '' } });
  render(<App />);
  expect(await screen.findByLabelText('School name')).toHaveValue(saved.school);
  expect(screen.getByLabelText('Phone number')).toHaveValue(saved.phone);
  expect(screen.getByLabelText('Major or field of study')).toHaveValue(saved.major);
  fireEvent.change(screen.getByLabelText('School name'), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await screen.findByRole('status');
  expect(screen.getByLabelText('School name')).toHaveValue('');
  expect(screen.getByLabelText('Major or field of study')).toHaveValue(saved.major);
});


test('opens and closes the notification panel from the top bar', async () => {
  await openHome();
  fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
  expect(await screen.findByRole('dialog', { name: 'Notifications' })).toHaveTextContent('No notifications yet');
  fireEvent.click(screen.getByRole('button', { name: 'Close notifications' }));
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Notifications' })).not.toBeInTheDocument());
});

test('requires a last name before an existing single-name account can save', async () => {
  const singleName = { ...user, fullname: 'Prince' };
  localStorage.setItem('token', 'session-token');
  window.history.replaceState({}, '', '/p_prince/profile');
  api.get.mockResolvedValue({ data: singleName });
  api.patch.mockResolvedValue({ data: { ...singleName, fullname: 'Prince Nelson', phone: '+1 555 010 1234' } });
  render(<App />);
  expect(await screen.findByLabelText(/First name/)).toHaveValue('Prince');
  expect(screen.getByLabelText(/Last name/)).toHaveValue('');
  expect(screen.getByLabelText(/Last name/)).toBeRequired();
  fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: '+1 555 010 1234' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Save changes' }).closest('form'));
  expect(await screen.findByRole('alert')).toHaveTextContent('First name and last name are required.');
  expect(api.patch).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: 'Nelson' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await screen.findByRole('status');
  expect(api.patch).toHaveBeenCalledWith('/api/v1/user/me', { fullname: 'Prince Nelson', phone: '+1 555 010 1234', school: '', major: '' }, expect.any(Object));
});


test.each([/First name/, /Last name/])('rejects whitespace-only profile name input %s', async (label) => {
  await openProfile();
  fireEvent.change(screen.getByLabelText(label), { target: { value: '   ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('First name and last name are required.');
  expect(api.patch).not.toHaveBeenCalled();
});


test('shows missing profile details and links to completion without blocking Home', async () => {
  await openHome();
  expect(screen.getByRole('region', { name: 'Finish setting up your account' })).toHaveTextContent('Still needed: School, Major, Phone number.');
  expect(screen.getByRole('heading', { name: 'Your courses' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Complete profile' }));
  expect(await screen.findByRole('heading', { name: 'My profile', exact: true })).toBeInTheDocument();
  expect(window.location.pathname).toBe('/p_chung/profile');
});

test('lists only missing details, treating whitespace as incomplete', async () => {
  localStorage.setItem('token', 'session-token');
  api.get.mockResolvedValue({ data: { ...user, school: 'Example University', major: '   ', phone: '+1 555 010 1234' } });
  render(<App />);
  const reminder = await screen.findByRole('region', { name: 'Finish setting up your account' });
  expect(reminder).toHaveTextContent('Still needed: Major.');
  expect(reminder).not.toHaveTextContent('Still needed: School');
});

test('hides the setup reminder after all details are saved', async () => {
  const completed = { ...user, phone: '+1 555 010 1234', school: 'Example University', major: 'Computer Science' };
  api.patch.mockResolvedValue({ data: completed });
  await openHome();
  fireEvent.click(screen.getByRole('link', { name: 'Complete profile' }));
  await screen.findByRole('heading', { name: 'My profile', exact: true });
  fireEvent.change(screen.getByLabelText('Phone number'), { target: { value: completed.phone } });
  fireEvent.change(screen.getByLabelText('School name'), { target: { value: completed.school } });
  fireEvent.change(screen.getByLabelText('Major or field of study'), { target: { value: completed.major } });
  fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
  await screen.findByRole('status');
  fireEvent.click(screen.getByRole('link', { name: 'Home', exact: true }));
  await screen.findByRole('heading', { name: 'Welcome home, Phat.' });
  expect(screen.queryByRole('region', { name: 'Finish setting up your account' })).not.toBeInTheDocument();
});

test('hides the setup reminder for an already complete account on refresh', async () => {
  localStorage.setItem('token', 'session-token');
  api.get.mockResolvedValue({ data: { ...user, phone: '+1 555 010 1234', school: 'Example University', major: 'Computer Science' } });
  render(<App />);
  await screen.findByRole('heading', { name: 'Welcome home, Phat.' });
  expect(screen.queryByRole('region', { name: 'Finish setting up your account' })).not.toBeInTheDocument();
});


test('preserves a deep course link while canonicalizing the student handle', async () => {
  const id = '507f1f77bcf86cd799439011';
  localStorage.setItem('token', 'session-token');
  window.history.replaceState({}, '', `/wrong_handle/courses/${id}`);
  api.get.mockImplementation((url) => Promise.resolve({ data: url === '/api/v1/user/me' ? user : { id, name: 'Biology', code: 'BIO101', semester: 'Fall 2026' } }));
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Biology' })).toBeInTheDocument();
  expect(window.location.pathname).toBe(`/p_chung/courses/${id}`);
  expect(screen.getByRole('link', { name: 'Courses', exact: true, current: 'page' })).toHaveAttribute('aria-current', 'page');
});

test('preserves a direct nested-folder path when correcting the account handle', async () => {
  const courseId = '507f1f77bcf86cd799439011';
  const folderId = '507f1f77bcf86cd799439012';
  localStorage.setItem('token', 'session-token');
  window.history.replaceState({}, '', `/a_other/courses/${courseId}/folders/${folderId}`);
  api.get.mockImplementation((url) => Promise.resolve({ data: url === '/api/v1/user/me' ? user : url.endsWith('/folders') ? { folders: [], breadcrumbs: [{ id: folderId, name: 'Lectures', materialType: 'lecture' }] } : { id: courseId, name: 'Biology' } }));
  render(<App />);
  expect(await screen.findByRole('heading', { name: 'Lectures' })).toBeInTheDocument();
  expect(window.location.pathname).toBe(`/p_chung/courses/${courseId}/folders/${folderId}`);
  expect(screen.getByRole('link', { name: 'Courses', exact: true, current: 'page' })).toBeInTheDocument();
});
