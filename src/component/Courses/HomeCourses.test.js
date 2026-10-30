import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Home from '../Home/Home';
import { api } from '../../utils/api';

jest.mock('react-router-dom', () => jest.requireActual('react-router'));
jest.mock('../../utils/api', () => ({ api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() } }));
const user = { fullname: 'Phat Chung', email: 'phat@example.com', phone: '1234567890', school: 'University', major: 'Math' };
const biology = { id: 'biology', name: 'Biology', code: 'BIO101', semester: 'Fall 2026' };
const theme = createTheme({ components: { MuiButtonBase: { defaultProps: { disableRipple: true } } } });
const logout = jest.fn();
function View({ account = user }) {
  return <ThemeProvider theme={theme}><MemoryRouter initialEntries={['/p_chung']}><Routes><Route path="/:handle/*" element={<Home user={account} onLogout={logout} onUserUpdate={jest.fn()} />} /></Routes></MemoryRouter></ThemeProvider>;
}
beforeEach(() => { jest.resetAllMocks(); localStorage.setItem('token', 'test-token'); window.matchMedia = jest.fn((query) => ({ matches: query === '(min-width:900px)', media: query, addEventListener: jest.fn(), removeEventListener: jest.fn() })); });

test('loads all folders, including long names, and opens the selected detail', async () => {
  const long = { id: 'long', name: 'Advanced interdisciplinary studies '.repeat(3) };
  api.get.mockImplementation((url) => Promise.resolve({ data: url.endsWith('/materials') ? { materials: [], usage: { usedBytes: 0, maxFileBytes: 20000000, limitBytes: 500000000 } } : url.endsWith('/folders') ? { folders: [], breadcrumbs: [] } : url === '/api/v1/courses' ? [biology, long] : biology }));
  render(<View />);
  expect(screen.getByRole('progressbar', { name: 'Loading courses' })).toBeInTheDocument();
  expect(await screen.findByRole('link', { name: `Open ${long.name.trim()}` })).toHaveAttribute('href', '/p_chung/courses/long');
  expect(screen.getByText('BIO101 · Fall 2026')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Open Biology' }));
  expect(await screen.findByRole('heading', { name: 'Biology' })).toBeInTheDocument();
  expect(await screen.findByText('This course folder is empty')).toBeInTheDocument();
});

test('distinguishes errors from empty and retries with an authenticated request', async () => {
  api.get.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({ data: [] });
  render(<View />);
  expect(await screen.findByRole('alert')).toHaveTextContent('couldn’t load');
  expect(screen.queryByText('A place for every course')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('link', { name: 'Create a course' })).toHaveAttribute('href', '/p_chung/courses');
  expect(api.get).toHaveBeenCalledWith('/api/v1/courses', expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }));
});

test('reflects creation, rename, and deletion when returning Home', async () => {
  let items = [];
  api.get.mockImplementation(() => Promise.resolve({ data: items }));
  api.post.mockImplementation(() => { items = [biology]; return Promise.resolve({ data: biology }); });
  api.patch.mockImplementation(() => { items = [{ ...biology, name: 'Biology II' }]; return Promise.resolve({ data: items[0] }); });
  api.delete.mockImplementation(() => { items = []; return Promise.resolve({ status: 204 }); });
  render(<View />);
  fireEvent.click(await screen.findByRole('link', { name: 'Create a course' }));
  await screen.findByRole('heading', { name: 'Your courses start here' });
  fireEvent.click(screen.getByRole('button', { name: /Create course/ }));
  let dialog = await screen.findByRole('dialog', { name: 'Create course' });
  fireEvent.change(within(dialog).getByLabelText(/Course name/), { target: { value: 'Biology' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create course' }));
  await screen.findByRole('link', { name: 'Open Biology' });
  fireEvent.click(screen.getByRole('link', { name: 'Home' }));
  await screen.findByRole('link', { name: 'Open Biology' });
  fireEvent.click(screen.getByRole('link', { name: /View courses/ }));
  await screen.findByRole('link', { name: 'Open Biology' });
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Biology' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Edit course' }));
  dialog = await screen.findByRole('dialog', { name: 'Edit course' });
  fireEvent.change(within(dialog).getByLabelText(/Course name/), { target: { value: 'Biology II' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
  await screen.findByRole('link', { name: 'Open Biology II' });
  fireEvent.click(screen.getByRole('link', { name: 'Home' }));
  await screen.findByRole('link', { name: 'Open Biology II' });
  expect(screen.queryByRole('link', { name: 'Open Biology' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: /View courses/ }));
  await screen.findByRole('link', { name: 'Open Biology II' });
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Biology II' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete course' }));
  dialog = await screen.findByRole('dialog', { name: 'Delete course?' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete course' }));
  await screen.findByRole('heading', { name: 'Your courses start here' });
  fireEvent.click(screen.getByRole('link', { name: 'Home' }));
  expect(await screen.findByRole('link', { name: 'Create a course' })).toBeInTheDocument();
});

test('clears folders on account switch and ignores late responses from the previous account', async () => {
  let finish;
  api.get.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValue({ data: [] });
  const view = render(<View />);
  localStorage.setItem('token', 'next-token');
  view.rerender(<View account={{ ...user, email: 'other@example.com' }} />);
  await screen.findByRole('link', { name: 'Create a course' });
  await act(async () => finish({ data: [biology] }));
  expect(screen.queryByRole('link', { name: 'Open Biology' })).not.toBeInTheDocument();
  expect(api.get).toHaveBeenLastCalledWith('/api/v1/courses', expect.objectContaining({ headers: { Authorization: 'Bearer next-token' } }));
});

test('uses session expiry handling', async () => {
  api.get.mockRejectedValue({ response: { status: 401 } });
  render(<View />);
  await screen.findByText('No deadlines to show');
  expect(logout).toHaveBeenCalledTimes(1);
});
