import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CourseFolders from './CourseFolders';
import { api } from '../../utils/api';
jest.mock('react-router-dom', () => jest.requireActual('react-router'));
jest.mock('../../utils/api', () => ({ api: { get: jest.fn(), post: jest.fn() } }));
jest.mock('../Materials/PdfPreview', () => () => null);
const folders = [{ id: 'syllabus', name: 'Syllabus', isStarter: true }, { id: 'lectures', name: 'Lectures', isStarter: true }];
const usage = { usedBytes: 0, maxFileBytes: 20000000, limitBytes: 500000000 };
function open(folderId) {
  return render(<MemoryRouter><CourseFolders course={{ id: 'course1', name: 'Biology' }} folderId={folderId} basePath="/p_chung" onUnauthorized={jest.fn()} /></MemoryRouter>);
}
const drag = (files = []) => ({ dataTransfer: { types: ['Files'], files, dropEffect: 'none' } });
beforeEach(() => {
  jest.resetAllMocks(); localStorage.setItem('token', 'token');
  api.get.mockImplementation((url, options) => Promise.resolve({ data: url.endsWith('/folders') ? { folders: options.params?.parent ? [] : folders, breadcrumbs: options.params?.parent ? [folders[0]] : [] } : { materials: [], usage } }));
});
test('hides root upload area and uploads a drop to the hovered folder without navigation', async () => {
  let finish, config;
  api.post.mockImplementation((url, body, options) => { config = options; return new Promise(resolve => { finish = resolve; }); });
  open();
  const row = (await screen.findByRole('link', { name: 'Open folder Syllabus' })).closest('li');
  await waitFor(() => expect(screen.queryByLabelText('Loading documents')).not.toBeInTheDocument());
  expect(screen.queryByRole('button', { name: 'Upload material' })).not.toBeInTheDocument();
  const file = new File(['notes'], 'syllabus.txt', { type: 'text/plain' });
  fireEvent.dragEnter(row, drag()); fireEvent.dragOver(row, drag());
  expect(screen.getByText('Drop to upload into Syllabus')).toBeInTheDocument();
  fireEvent.drop(row, drag([file]));
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  expect(api.post).toHaveBeenCalledWith('/api/v1/courses/course1/materials', expect.any(FormData), expect.objectContaining({ params: { folder: 'syllabus' }, headers: { Authorization: 'Bearer token' } }));
  expect(api.post.mock.calls[0][1].get('file').name).toBe('syllabus.txt');
  expect(screen.getByRole('link', { name: 'Open folder Lectures' })).toBeInTheDocument();
  fireEvent.drop(row, drag([file]));
  expect(api.post).toHaveBeenCalledTimes(1);
  act(() => config.onUploadProgress({ loaded: 2, total: 4 }));
  expect(screen.getByText('Uploading 50%')).toBeInTheDocument();
  await act(async () => finish({}));
  expect(await screen.findByText('Document uploaded.')).toBeInTheDocument();
  expect(screen.queryByText('Drop to upload into Syllabus')).not.toBeInTheDocument();
});
test('keeps browse uploads inside folders', async () => {
  open('syllabus');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Empty folder upload area' })).toHaveAttribute('aria-disabled', 'false'));
});
test('rejects invalid dropped files near their folder without uploading', async () => {
  open();
  const row = (await screen.findByRole('link', { name: 'Open folder Lectures' })).closest('li');
  fireEvent.dragEnter(row, { dataTransfer: { types: ['text/plain'] } });
  expect(screen.queryByText('Drop to upload into Lectures')).not.toBeInTheDocument();
  fireEvent.drop(row, drag([new File(['image'], 'image.png')]));
  expect(await screen.findByRole('alert')).toHaveTextContent('PDF or UTF-8 TXT');
  expect(api.post).not.toHaveBeenCalled();
});

 test('shows a failed upload at its folder and lets the student retry', async () => {
  api.post.mockRejectedValueOnce({ response: { status: 503, data: { message: 'Storage temporarily unavailable' } } }).mockResolvedValue({});
  open();
  const row = (await screen.findByRole('link', { name: 'Open folder Syllabus' })).closest('li');
  const file = new File(['notes'], 'notes.txt');
  fireEvent.drop(row, drag([file]));
  expect(await screen.findByRole('alert')).toHaveTextContent('Storage temporarily unavailable');
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Cancel upload' })).not.toBeInTheDocument());
  fireEvent.drop(row, drag([file]));
  expect(await screen.findByText('Document uploaded.')).toBeInTheDocument();
  expect(api.post).toHaveBeenCalledTimes(2);
});

test('hides the upload panel below nested folders while keeping folder drop targets', async () => {
  api.get.mockImplementation((url) => Promise.resolve({ data: url.endsWith('/folders') ? { folders: [{ id: 'week1', name: 'Week 1' }], breadcrumbs: [folders[0]] } : { materials: [], usage } }));
  api.post.mockResolvedValue({});
  open('syllabus');
  const row = (await screen.findByRole('link', { name: 'Open folder Week 1' })).closest('li');
  await waitFor(() => expect(screen.queryByLabelText('Loading documents')).not.toBeInTheDocument());
  expect(screen.queryByRole('button', { name: 'Upload material' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Browse files' })).not.toBeInTheDocument();
  fireEvent.drop(row, drag([new File(['notes'], 'notes.txt')]));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/courses/course1/materials', expect.any(FormData), expect.objectContaining({ params: { folder: 'week1' } })));
  expect(await screen.findByText('Document uploaded.')).toBeInTheDocument();
});
