import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Notifications from './Notifications';
import { api } from '../../utils/api';
jest.mock('react-router-dom', () => jest.requireActual('react-router'));
jest.mock('../../utils/api', () => ({ api: { get: jest.fn(), patch: jest.fn() } }));
const id = '0123456789abcdef01234567';
const item = { id, kind: 'profile', message: 'Finish your profile.', path: '/profile', readAt: null, createdAt: '2026-11-02T16:00:00Z' };
const payload = { notifications: [item], unreadCount: 1, nextCursor: null };
function Location() { const location = useLocation(); return <output data-testid="location">{location.pathname}{location.hash}</output>; }
const expired = jest.fn(), navigated = jest.fn();
function view() { return render(<MemoryRouter initialEntries={['/p_chung']}><Notifications wide basePath="/p_chung" onUnauthorized={expired} onNavigate={navigated} /><Location /></MemoryRouter>); }
beforeEach(() => {
  jest.clearAllMocks(); localStorage.setItem('token', 'test-token');
  api.get.mockResolvedValue({ data: payload });
  api.patch.mockResolvedValue({ data: { id, readAt: '2026-11-02T17:00:00Z' } });
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
});
afterEach(() => { jest.useRealTimers(); });
async function open() { fireEvent.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' })); return screen.findByRole('dialog'); }
test('shows unread badge, timestamps and persists a single read without navigating', async () => {
  view(); await open();
  expect(screen.getByText(item.message)).toBeInTheDocument();
  expect(document.querySelector('time')).toHaveAttribute('datetime', item.createdAt);
  fireEvent.click(screen.getByRole('button', { name: 'Mark as read', exact: true }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Mark as read', exact: true })).not.toBeInTheDocument());
  expect(api.patch).toHaveBeenCalledWith(`/api/v1/notifications/${id}/read`, {}, expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }));
  expect(screen.getByTestId('location')).toHaveTextContent('/p_chung');
});
test('marks all read and opens the relevant page when clicking a reminder', async () => {
  view(); await open();
  fireEvent.click(screen.getByRole('button', { name: 'Mark all as read' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/api/v1/notifications/read-all', {}, expect.anything()));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Mark all as read' })).not.toBeInTheDocument());
  fireEvent.click(screen.getByText(item.message));
  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/p_chung/profile'));
  expect(navigated).toHaveBeenCalledTimes(1);
});
test('preserves reminders and offers retry if marking read fails', async () => {
  view(); await open(); api.patch.mockRejectedValueOnce(new Error('Offline'));
  fireEvent.click(screen.getByRole('button', { name: 'Mark as read', exact: true }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t mark');
  expect(screen.getByText(item.message)).toBeInTheDocument();
});
test('handles expired authentication', async () => {
  api.get.mockRejectedValueOnce({ response: { status: 401 } }); view();
  await waitFor(() => expect(expired).toHaveBeenCalledTimes(1));
});
test('polls only while visible and stops after unmount', async () => {
  jest.useFakeTimers(); const { unmount } = view();
  await act(async () => {});
  expect(api.get).toHaveBeenCalledTimes(1);
  await act(async () => { jest.advanceTimersByTime(30000); });
  expect(api.get).toHaveBeenCalledTimes(2);
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  fireEvent(document, new Event('visibilitychange'));
  await act(async () => { jest.advanceTimersByTime(60000); });
  expect(api.get).toHaveBeenCalledTimes(2);
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  await act(async () => { fireEvent(document, new Event('visibilitychange')); });
  expect(api.get).toHaveBeenCalledTimes(3);
  unmount(); await act(async () => { jest.advanceTimersByTime(60000); });
  expect(api.get).toHaveBeenCalledTimes(3);
});
test('rejects unsafe destinations instead of navigating outside the workspace', async () => {
  api.get.mockResolvedValue({ data: { ...payload, notifications: [{ ...item, path: 'https://example.test' }] } });
  view(); fireEvent.click(screen.getByRole('button', { name: 'Notifications', exact: true }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t refresh');
  expect(screen.queryByText(item.message)).not.toBeInTheDocument();
});
