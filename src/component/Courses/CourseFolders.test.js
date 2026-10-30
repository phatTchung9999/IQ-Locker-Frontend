import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CourseFolders from './CourseFolders';
import { api } from '../../utils/api';
jest.mock('react-router-dom', () => jest.requireActual('react-router'));
jest.mock('../Materials/CourseMaterials', () => function MaterialsPlaceholder({ hasFolders, folderId }) {
  return hasFolders ? null : <div>{folderId ? 'This folder is empty' : 'This course folder is empty'}</div>;
});
jest.mock('../../utils/api', () => ({ api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() } }));
const course = { id: 'course1', name: 'Biology' };
const root = { id: 'lectures', name: 'Lectures', parent: null, materialType: 'lecture' };
const child = { id: 'week1', name: 'Week 1', parent: root.id, materialType: '' };
const base = '/p_chung/courses/course1';
const endpoint = '/api/v1/courses/course1/folders';
const unauthorized = jest.fn();
const theme = createTheme({ components: { MuiButtonBase: { defaultProps: { disableRipple: true } } } });
function View() {
  const { folderId } = useParams();
  return <CourseFolders course={course} folderId={folderId} basePath="/p_chung" onUnauthorized={unauthorized} />;
}
function open(path = base) {
  render(<ThemeProvider theme={theme}><MemoryRouter initialEntries={[path]}><Routes><Route path="/p_chung/courses/course1" element={<View />} /><Route path="/p_chung/courses/course1/folders/:folderId" element={<View />} /></Routes></MemoryRouter></ThemeProvider>);
}
beforeEach(() => { jest.resetAllMocks(); localStorage.setItem('token', 'test-token'); });

test('opens nested folders and navigates back through breadcrumbs', async () => {
  api.get.mockImplementation((url, options) => Promise.resolve({ data: options.params?.parent === root.id ? { folders: [child], breadcrumbs: [root] } : options.params?.parent === child.id ? { folders: [], breadcrumbs: [root, child] } : { folders: [root], breadcrumbs: [] } }));
  open();
  fireEvent.click(await screen.findByRole('link', { name: 'Open folder Lectures' }));
  fireEvent.click(await screen.findByRole('link', { name: 'Open folder Week 1' }));
  expect(await screen.findByText('This folder is empty')).toBeInTheDocument();
  const courseHeader = screen.getByRole('heading', { name: 'Biology' }).parentElement;
  const breadcrumbs = within(courseHeader).getByRole('navigation', { name: 'Folder breadcrumbs' });
  expect(within(breadcrumbs).queryByRole('link', { name: 'Courses' })).not.toBeInTheDocument();
  expect(within(breadcrumbs).getByText('Week 1')).toHaveAttribute('aria-current', 'page');
  fireEvent.click(within(breadcrumbs).getByRole('link', { name: 'Lectures' }));
  expect(await screen.findByRole('link', { name: 'Open folder Week 1' })).toHaveAttribute('href', `${base}/folders/week1`);
  expect(api.get).toHaveBeenCalledWith(endpoint, expect.objectContaining({ params: { parent: root.id }, headers: { Authorization: 'Bearer test-token' } }));
});

test('creates within the current folder, retains failed input, and blocks duplicate submissions', async () => {
  api.get.mockResolvedValue({ data: { folders: [], breadcrumbs: [root] } });
  api.post.mockRejectedValueOnce({ response: { status: 409, data: { message: 'A folder with this name already exists here' } } });
  open(`${base}/folders/lectures`);
  fireEvent.click(await screen.findByRole('button', { name: '+ Create folder' }));
  const dialog = await screen.findByRole('dialog', { name: 'Create folder' });
  fireEvent.change(within(dialog).getByLabelText(/Folder name/), { target: { value: 'Week 1' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create folder' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('already exists');
  expect(within(dialog).getByLabelText(/Folder name/)).toHaveValue('Week 1');
  let finish;
  api.post.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const form = within(dialog).getByRole('button', { name: 'Create folder' }).closest('form');
  fireEvent.submit(form); fireEvent.submit(form);
  expect(api.post).toHaveBeenCalledTimes(2);
  expect(api.post).toHaveBeenLastCalledWith(endpoint, { name: 'Week 1', parent: root.id }, expect.any(Object));
  await act(async () => finish({ data: child }));
});

test('renames without exposing or overwriting backend classification', async () => {
  api.get.mockResolvedValue({ data: { folders: [root], breadcrumbs: [] } });
  api.patch.mockResolvedValue({ data: { ...root, name: 'Class Notes', materialType: 'lecture' } });
  open();
  fireEvent.click(await screen.findByRole('button', { name: 'Edit folder Lectures' }));
  const dialog = await screen.findByRole('dialog', { name: 'Edit folder' });
  expect(within(dialog).queryByRole('combobox')).not.toBeInTheDocument();
  expect(screen.queryByText('lecture')).not.toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText(/Folder name/), { target: { value: 'Class Notes' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
  expect(api.patch).toHaveBeenCalledWith(`${endpoint}/lectures`, { name: 'Class Notes' }, expect.any(Object));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

test('confirms folder deletion and keeps a nonempty folder on server rejection', async () => {
  api.get.mockResolvedValue({ data: { folders: [root], breadcrumbs: [] } });
  api.delete.mockRejectedValue({ response: { status: 409, data: { message: 'Only empty folders can be deleted' } } });
  open();
  fireEvent.click(await screen.findByRole('button', { name: 'Delete folder Lectures' }));
  let dialog = await screen.findByRole('dialog', { name: 'Delete folder?' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(api.delete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Delete folder Lectures' }));
  dialog = await screen.findByRole('dialog', { name: 'Delete folder?' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete folder' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Only empty folders');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(screen.getByRole('link', { name: 'Open folder Lectures' })).toBeInTheDocument();
});

test('returns to the parent after deleting the current folder', async () => {
  api.get.mockImplementation((url, options) => Promise.resolve({ data: options.params?.parent === child.id ? { folders: [], breadcrumbs: [root, child] } : { folders: [], breadcrumbs: [root] } }));
  api.delete.mockResolvedValue({});
  open(`${base}/folders/week1`);
  fireEvent.click(await screen.findByRole('button', { name: 'Delete folder Week 1' }));
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete folder' }));
  expect(await screen.findByRole('button', { name: 'Edit folder Lectures' })).toBeInTheDocument();
});

test('keeps manual creation available without a starter action or root breadcrumb', async () => {
  api.get.mockResolvedValue({ data: { folders: [root], breadcrumbs: [] } });
  open();
  expect(await screen.findByRole('button', { name: '+ Create folder' })).toBeEnabled();
  expect(screen.queryByRole('button', { name: 'Add starter folders' })).not.toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Folder breadcrumbs' })).not.toBeInTheDocument();
});

test('shows unavailable folder state with course breadcrumb and supports retry', async () => {
  api.get.mockRejectedValueOnce({ response: { status: 404 } }).mockResolvedValue({ data: { folders: [], breadcrumbs: [root] } });
  open(`${base}/folders/lectures`);
  expect(await screen.findByRole('alert')).toHaveTextContent('no longer available');
  expect(screen.getByRole('link', { name: 'Biology' })).toHaveAttribute('href', base);
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('This folder is empty')).toBeInTheDocument();
});

test('disables deeper creation at the nesting limit', async () => {
  const breadcrumbs = Array.from({ length: 10 }, (_, index) => ({ id: index === 9 ? 'week1' : `level${index}`, name: `Level ${index}` }));
  api.get.mockResolvedValue({ data: { folders: [], breadcrumbs } });
  open(`${base}/folders/week1`);
  expect(await screen.findByRole('button', { name: '+ Create folder' })).toBeDisabled();
  expect(screen.getByRole('alert')).toHaveTextContent('10-level nesting limit');
});

test('handles session expiry without showing folders', async () => {
  api.get.mockRejectedValue({ response: { status: 401 } });
  open();
  await screen.findByRole('heading', { name: 'Biology' });
  expect(unauthorized).toHaveBeenCalledTimes(1);
});

test('hides starter edit/delete controls in rows and open folders while preserving custom controls', async () => {
  const starter = { ...root, isStarter: true };
  api.get.mockImplementation((url, options) => Promise.resolve({ data: options.params?.parent ? { folders: [child], breadcrumbs: [starter] } : { folders: [starter, child], breadcrumbs: [] } }));
  open();
  await screen.findByRole('link', { name: 'Open folder Lectures' });
  expect(screen.queryByRole('button', { name: 'Delete folder Lectures' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edit folder Lectures' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Delete folder Week 1' })).toBeEnabled();
  expect(screen.queryByText('lecture')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('link', { name: 'Open folder Lectures' }));
  await screen.findByRole('heading', { name: 'Lectures' });
  expect(screen.queryByRole('button', { name: 'Delete folder Lectures' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edit folder Lectures' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Edit folder Week 1' })).toBeEnabled();
  expect(screen.queryByText('lecture')).not.toBeInTheDocument();
});

test('keeps permission failures in the dialog without logging out', async () => {
  api.get.mockResolvedValue({ data: { folders: [child], breadcrumbs: [] } });
  api.delete.mockRejectedValue({ response: { status: 403, data: { message: 'Starter folders cannot be deleted' } } });
  open();
  fireEvent.click(await screen.findByRole('button', { name: 'Delete folder Week 1' }));
  fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete folder' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Starter folders cannot be deleted');
  expect(unauthorized).not.toHaveBeenCalled();
});
