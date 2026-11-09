import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Home from '../Home/Home';
import { api } from '../../utils/api';
jest.mock('react-router-dom', () => jest.requireActual('react-router'));
jest.mock('../../utils/api', () => ({ api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() } }));
jest.mock('../Navbar/Notifications', () => () => null);
const user = { fullname: 'Phat Chung', email: 'a@example.test', school: 'School', major: 'Math', phone: '123' };
const endpoint = '/api/v1/user/me/avatar';
const photo = () => new File(['test-image'], 'photo.png', { type: 'image/png' });
const blob = () => new Blob(['normalized-image'], { type: 'image/webp' });
const logout = jest.fn();
function View({ account = user }) {
  return <MemoryRouter initialEntries={['/p_chung/profile']}><Routes><Route path="/" element={<div>Signed out</div>} /><Route path="/:handle/*" element={<Home user={account} onLogout={logout} onUserUpdate={jest.fn()} />} /></Routes></MemoryRouter>;
}
beforeEach(() => {
  jest.resetAllMocks(); localStorage.setItem('token', 'avatar-test-token');
  let serial = 0;
  URL.createObjectURL = jest.fn(() => `blob:photo-${++serial}`); URL.revokeObjectURL = jest.fn();
  api.get.mockImplementation(async path => {
    if (path === endpoint) throw { response: { status: 404 } };
    return { data: [] };
  });
  api.post.mockResolvedValue({ data: { hasAvatar: true } }); api.delete.mockResolvedValue({ status: 204 });
  window.matchMedia = jest.fn(query => ({ matches: query === '(min-width:900px)', media: query,
    addEventListener: jest.fn(), removeEventListener: jest.fn() }));
});
afterEach(cleanup);
const select = () => fireEvent.change(screen.getByLabelText('Avatar image'), { target: { files: [photo()] } });
async function ready() { await waitFor(() => expect(screen.queryByText('Loading photo…')).not.toBeInTheDocument()); }
test('fetches saved avatar with authorization and displays it in profile and sidebar', async () => {
  api.get.mockResolvedValue({ data: blob() }); const { unmount } = render(<View />); await ready();
  expect(api.get).toHaveBeenCalledWith(endpoint, expect.objectContaining({ headers: { Authorization: 'Bearer avatar-test-token' }, responseType: 'blob', signal: expect.any(AbortSignal) }));
  expect(screen.getByRole('img', { name: user.fullname, exact: true })).toHaveAttribute('src', 'blob:photo-1');
  expect(within(screen.getByRole('button', { name: 'Account menu' })).getByRole('img')).toHaveAttribute('src', 'blob:photo-1');
  unmount(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo-1');
});
test('treats missing avatar as normal initials and lets selection be discarded without uploading', async () => {
  render(<View />); await ready(); expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(within(screen.getByRole('button', { name: 'Account menu' })).getByText('PC')).toBeInTheDocument();
  select(); expect(screen.getByRole('img', { name: user.fullname, exact: true })).toHaveAttribute('src', 'blob:photo-1');
  fireEvent.click(screen.getByRole('button', { name: 'Discard photo' }));
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo-1'); expect(api.post).not.toHaveBeenCalled();
});
test('uploads multipart once, fetches normalized image and updates profile/sidebar together', async () => {
  render(<View />); await ready(); select();
  let finish;
  api.post.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  fireEvent.click(screen.getByRole('button', { name: 'Save photo' }));
  fireEvent.click(screen.getByRole('button', { name: 'Saving photo…' }));
  expect(api.post).toHaveBeenCalledTimes(1);
  const [path, form, options] = api.post.mock.calls[0];
  expect(path).toBe(endpoint); expect(form.get('file').name).toBe('photo.png'); expect([...form.keys()]).toEqual(['file']);
  expect(options.headers).toEqual({ Authorization: 'Bearer avatar-test-token' });
  api.get.mockResolvedValue({ data: blob() });
  await act(async () => finish({ data: { hasAvatar: true } }));
  expect(await screen.findByText('Photo saved.')).toBeInTheDocument();
  expect(screen.getByRole('img', { name: user.fullname, exact: true })).toHaveAttribute('src', 'blob:photo-2');
  expect(within(screen.getByRole('button', { name: 'Account menu' })).getByRole('img')).toHaveAttribute('src', 'blob:photo-2');
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo-1');
  expect(api.patch).not.toHaveBeenCalled(); expect(screen.queryByText(/local previews/i)).not.toBeInTheDocument();
});
test('keeps saved avatar and selection when upload fails and permits retry', async () => {
  api.get.mockResolvedValue({ data: blob() }); render(<View />); await ready(); select();
  api.post.mockRejectedValueOnce({ response: { status: 400, data: { message: 'Image is unreadable.' } } });
  fireEvent.click(screen.getByRole('button', { name: 'Save photo' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Image is unreadable.');
  expect(within(screen.getByRole('button', { name: 'Account menu' })).getByRole('img')).toHaveAttribute('src', 'blob:photo-1');
  expect(screen.getByRole('img', { name: user.fullname, exact: true })).toHaveAttribute('src', 'blob:photo-2');
  fireEvent.click(screen.getByRole('button', { name: 'Save photo' }));
  expect(await screen.findByText('Photo saved.')).toBeInTheDocument(); expect(api.post).toHaveBeenCalledTimes(2);
});
test('removes saved avatar and immediately restores initials in both places', async () => {
  api.get.mockResolvedValue({ data: blob() }); render(<View />); await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Change avatar' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Delete photo' }));
  await waitFor(() => expect(screen.queryByRole('img', { name: user.fullname, exact: true })).not.toBeInTheDocument());
  expect(api.delete).toHaveBeenCalledWith(endpoint, expect.objectContaining({ headers: { Authorization: 'Bearer avatar-test-token' } }));
  expect(within(screen.getByRole('button', { name: 'Account menu' })).getByText('PC')).toBeInTheDocument();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo-1');
});
test('shows removal failure and retains the saved image', async () => {
  api.get.mockResolvedValue({ data: blob() }); render(<View />); await ready();
  api.delete.mockRejectedValueOnce(new Error('Offline'));
  fireEvent.click(screen.getByRole('button', { name: 'Change avatar' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Delete photo' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t remove');
  expect(screen.getByAltText(user.fullname, { exact: true })).toHaveAttribute('src', 'blob:photo-1');
});
test('reports saved-but-refetch-failed and reloads without uploading a second time', async () => {
  render(<View />); await ready(); select(); api.get.mockRejectedValueOnce(new Error('Offline'));
  fireEvent.click(screen.getByRole('button', { name: 'Save photo' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Photo saved, but couldn’t load');
  api.get.mockResolvedValue({ data: blob() }); fireEvent.click(screen.getByRole('button', { name: 'Reload photo' }));
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(await screen.findByRole('img', { name: user.fullname, exact: true })).toHaveAttribute('src', 'blob:photo-2');
});
test('shows load failure with retry, and handles expired authentication', async () => {
  api.get.mockRejectedValueOnce(new Error('Offline')); render(<View />); await ready();
  expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load');
  api.get.mockRejectedValueOnce({ response: { status: 401 } }); fireEvent.click(screen.getByRole('button', { name: 'Reload photo' }));
  await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
});
test('aborts upload and revokes preview when workspace unmounts', async () => {
  const { unmount } = render(<View />); await ready(); select();
  let request;
  api.post.mockImplementation((path, data, options) => { request = options; return new Promise(() => {}); });
  fireEvent.click(screen.getByRole('button', { name: 'Save photo' }));
  unmount(); expect(request.signal.aborted).toBe(true); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo-1');
});
test('matches backend byte limits before uploading', async () => {
  render(<View />); await ready();
  fireEvent.change(screen.getByLabelText('Avatar image'), { target: { files: [new File([new Uint8Array(5_000_001)], 'huge.png', { type: 'image/png' })] } });
  expect(await screen.findByRole('alert')).toHaveTextContent('no larger than 5 MB'); expect(api.post).not.toHaveBeenCalled();
});

test('ignores a previous account’s late response and uses the new account credentials', async () => {
  let finishOld;
  api.get.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
  const { rerender } = render(<View />);
  localStorage.setItem('token', 'other-account-token');
  api.get.mockResolvedValue({ data: blob() });
  const next = { ...user, fullname: 'Other Student', email: 'b@example.test' };
  rerender(<View account={next} />); await ready();
  await act(async () => finishOld({ data: blob() }));
  expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  expect(api.get).toHaveBeenLastCalledWith(endpoint, expect.objectContaining({ headers: { Authorization: 'Bearer other-account-token' } }));
  expect(screen.getByRole('img', { name: next.fullname, exact: true })).toHaveAttribute('src', 'blob:photo-1');
});
test('clears broken saved images to initials and allows a fresh authenticated reload', async () => {
  api.get.mockResolvedValue({ data: blob() }); render(<View />); await ready();
  fireEvent.error(screen.getByRole('img', { name: user.fullname, exact: true }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t display');
  expect(within(screen.getByRole('button', { name: 'Account menu' })).getByText('PC')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reload photo' }));
  expect(await screen.findByRole('img', { name: user.fullname, exact: true })).toHaveAttribute('src', 'blob:photo-2');
});

test('clicking the saved photo opens three icon actions; Change opens the upload box', async () => {
  api.get.mockResolvedValue({ data: blob() }); render(<View />); await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Avatar options' }));
  const actions = await screen.findByRole('dialog', { name: 'Avatar actions' });
  expect(within(actions).getAllByRole('button')).toHaveLength(3);
  expect(within(actions).getByRole('button', { name: 'Rotate photo' })).toBeEnabled();
  expect(within(actions).getByRole('button', { name: 'Delete photo' })).toBeEnabled();
  expect(screen.queryByLabelText('Photo drop area')).not.toBeInTheDocument();
  fireEvent.click(within(actions).getByRole('button', { name: 'Change photo' }));
  const drop = await screen.findByLabelText('Photo drop area');
  expect(within(drop).getByText('JPG, PNG or WebP · Up to 5 MB')).toBeInTheDocument();
  expect(screen.queryByText('Choose a photo, then save it.')).not.toBeInTheDocument();
});
test('previews rotation without saving, then sends the angle only after Save photo', async () => {
  api.get.mockResolvedValue({ data: blob() }); render(<View />); await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Avatar options' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Rotate photo' }));
  expect(screen.getByRole('img', { name: user.fullname, exact: true })).toHaveStyle({ transform: 'rotate(90deg)' });
  expect(api.post).not.toHaveBeenCalled();
  expect(within(screen.getByRole('button', { name: 'Account menu' })).getByRole('img')).toHaveAttribute('src', 'blob:photo-1');
  fireEvent.click(screen.getByRole('button', { name: 'Save photo' }));
  expect(await screen.findByText('Photo saved.')).toBeInTheDocument();
  const form = api.post.mock.calls[0][1]; expect(form.get('rotation')).toBe('90'); expect(form.get('file').type).toBe('image/webp');
  expect(screen.getByRole('img', { name: user.fullname, exact: true })).toHaveStyle({ transform: 'rotate(0deg)' });
});
test('discarding rotation restores the original without changing storage', async () => {
  api.get.mockResolvedValue({ data: blob() }); render(<View />); await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Avatar options' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Rotate photo' }));
  fireEvent.click(screen.getByRole('button', { name: 'Discard photo' }));
  expect(screen.getByRole('img', { name: user.fullname, exact: true })).toHaveAttribute('src', 'blob:photo-1');
  expect(screen.getByRole('img', { name: user.fullname, exact: true })).toHaveStyle({ transform: 'rotate(0deg)' });
  expect(api.post).not.toHaveBeenCalled(); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo-2');
});
