import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CourseMaterials from './CourseMaterials';
import { api } from '../../utils/api';
jest.mock('react-router-dom', () => jest.requireActual('react-router'));
jest.mock('../../utils/api', () => ({ api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() } }));
jest.mock('./PdfPreview', () => function PdfPreview() { return <div>PDF canvas preview</div>; });
const material = { id: 'doc1', title: 'Week 1 Notes', originalFilename: 'notes.txt', mediaType: 'text/plain', sizeBytes: 12, createdAt: '2026-10-27T12:00:00Z', state: 'ready' };
const usage = { usedBytes: 12, maxFileBytes: 20_000_000, limitBytes: 500_000_000 };
const unauthorized = jest.fn();
const theme = createTheme({ components: { MuiButtonBase: { defaultProps: { disableRipple: true } } } });
function open(props = {}) { return render(<ThemeProvider theme={theme}><CourseMaterials courseId="course1" folderId="lecture1" hasFolders={false} onUnauthorized={unauthorized} {...props} /></ThemeProvider>); }
const response = (items = [material]) => ({ data: { materials: items, usage } });
beforeEach(() => { jest.resetAllMocks(); localStorage.setItem('token', 'token'); api.get.mockResolvedValue(response()); });
async function menu(name) {
  fireEvent.click(await screen.findByRole('button', { name: 'Actions for document Week 1 Notes' }));
  fireEvent.click(await screen.findByRole('menuitem', { name, exact: true }));
}
test('lists documents only for the selected folder with authenticated requests', async () => {
  open();
  expect(await screen.findByRole('button', { name: 'Preview Week 1 Notes' })).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith('/api/v1/courses/course1/materials', expect.objectContaining({ params: { folder: 'lecture1' }, headers: { Authorization: 'Bearer token' } }));
  expect(screen.queryByText(/500.0 MB/)).not.toBeInTheDocument();
});
test('uploads one file, shows progress, and displays the committed document', async () => {
  api.get.mockResolvedValueOnce(response([])).mockResolvedValue(response());
  let finish, config;
  api.post.mockImplementation((url, body, options) => { config = options; return new Promise((resolve) => { finish = resolve; }); });
  open();
  await screen.findByText('This folder is empty');
  expect(screen.getByLabelText('Empty folder upload area')).toBeInTheDocument();
  expect(screen.getByText('Drop your material here')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Choose material file'), { target: { files: [new File(['lecture notes'], 'notes.txt', { type: 'text/plain' })] } });
  expect(screen.getByRole('button', { name: 'Empty folder upload area' })).toHaveAttribute('aria-disabled', 'true');
  act(() => config.onUploadProgress({ loaded: 12, total: 12 }));
  expect(screen.getByRole('status')).toHaveTextContent('Saving privately');
  expect(api.post.mock.calls[0][1].get('file').name).toBe('notes.txt');
  await act(async () => finish({ data: material }));
  expect(await screen.findByRole('button', { name: 'Preview Week 1 Notes' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Document uploaded');
  expect(screen.queryByLabelText('Empty folder upload area')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Upload material' })).not.toBeInTheDocument();
});
test('rejects unsupported/multiple files and preserves server upload errors across refresh', async () => {
  api.get.mockResolvedValue(response([]));
  api.post.mockRejectedValue({ response: { status: 413, data: { message: 'Account quota exceeded' } } });
  open(); await screen.findByText('This folder is empty');
  fireEvent.change(screen.getByLabelText('Choose material file'), { target: { files: [new File(['html'], 'notes.html')] } });
  expect(screen.getByRole('alert')).toHaveTextContent('PDF or UTF-8 TXT');
  expect(api.post).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Choose material file'), { target: { files: [new File(['a'], 'a.txt'), new File(['b'], 'b.txt')] } });
  expect(screen.getByRole('alert')).toHaveTextContent('one PDF or TXT');
  fireEvent.change(screen.getByLabelText('Choose material file'), { target: { files: [new File(['notes'], 'notes.txt')] } });
  expect(await screen.findByRole('alert')).toHaveTextContent('Account quota exceeded');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Empty folder upload area' })).toHaveAttribute('aria-disabled', 'false'));
  expect(screen.getByRole('alert')).toHaveTextContent('Account quota exceeded');
});
test('renames only the display title', async () => {
  api.patch.mockResolvedValue({ data: { ...material, title: 'New title' } });
  open(); await menu('Rename title');
  const dialog = await screen.findByRole('dialog', { name: 'Rename document' });
  fireEvent.change(within(dialog).getByLabelText(/Document title/), { target: { value: 'New title' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save title' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(api.patch).toHaveBeenCalledWith('/api/v1/courses/course1/materials/doc1', { title: 'New title' }, expect.any(Object));
});
test('confirms deletion, retains a failed deletion, and retries cleanup', async () => {
  api.delete.mockRejectedValueOnce({ response: { status: 503, data: { message: 'Cleanup pending' } } }).mockResolvedValue({});
  open(); await menu('Delete document');
  let dialog = await screen.findByRole('dialog', { name: 'Delete document?' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' })); expect(api.delete).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await menu('Delete document'); dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete document' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Cleanup pending');
  api.get.mockResolvedValue(response([]));
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete document' }));
  expect(await screen.findByText('This folder is empty')).toBeInTheDocument();
});
test('previews text as inert text and uses the authenticated content endpoint', async () => {
  const text = '<script>window.secret = 1</script>';
  api.get.mockImplementation((url) => Promise.resolve(url.endsWith('/content') ? { data: new TextEncoder().encode(text).buffer } : response()));
  open(); fireEvent.click(await screen.findByRole('button', { name: 'Preview Week 1 Notes' }));
  const dialog = await screen.findByRole('dialog', { name: 'Week 1 Notes' });
  expect(await within(dialog).findByText(text)).toBeInTheDocument();
  expect(dialog.querySelector('script')).toBeNull();
  expect(api.get).toHaveBeenLastCalledWith('/api/v1/courses/course1/materials/doc1/content', expect.objectContaining({ responseType: 'arraybuffer', headers: { Authorization: 'Bearer token' } }));
});
test('renders PDF through the lazy canvas viewer', async () => {
  api.get.mockImplementation((url) => Promise.resolve(url.endsWith('/content') ? { data: new ArrayBuffer(8) } : response([{ ...material, mediaType: 'application/pdf' }])));
  open(); fireEvent.click(await screen.findByRole('button', { name: 'Preview Week 1 Notes' }));
  expect(await screen.findByText('PDF canvas preview')).toBeInTheDocument();
});
test('distinguishes list failure from empty documents and retries', async () => {
  api.get.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(response([]));
  open(); expect(await screen.findByRole('alert')).toHaveTextContent('couldn’t load');
  expect(screen.queryByText('This folder is empty')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  expect(await screen.findByText('This folder is empty')).toBeInTheDocument();
});
test('disables previews for pending cleanup and lets the student retry', async () => {
  api.get.mockResolvedValue(response([{ ...material, state: 'deleting' }]));
  open(); expect(await screen.findByRole('button', { name: 'Preview Week 1 Notes' })).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Actions for document Week 1 Notes' }));
  expect(await screen.findByRole('menuitem', { name: 'Download' })).toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByRole('menuitem', { name: 'Retry cleanup' })).not.toHaveAttribute('aria-disabled', 'true');
});
test('aborts pending uploads when leaving the workspace', async () => {
  api.post.mockImplementation((url, body, config) => new Promise((resolve, reject) => config.signal.addEventListener('abort', () => reject(new Error('Canceled')))));
  const view = open(); await screen.findByRole('button', { name: 'Preview Week 1 Notes' });
  fireEvent.change(screen.getByLabelText('Choose material file'), { target: { files: [new File(['notes'], 'notes.txt')] } });
  const signal = api.post.mock.calls[0][2].signal;
  await act(async () => view.unmount()); expect(signal.aborted).toBe(true);
});

test('empty folder drop area opens the picker by click or keyboard without a browse button', async () => {
  api.get.mockResolvedValue(response([]));
  open();
  const area = await screen.findByRole('button', { name: 'Empty folder upload area' });
  expect(screen.queryByRole('button', { name: 'Browse files' })).not.toBeInTheDocument();
  const picker = jest.spyOn(screen.getByLabelText('Choose material file'), 'click').mockImplementation(() => {});
  fireEvent.click(screen.getByText('Drop your material here'));
  fireEvent.keyDown(area, { key: 'Enter' });
  fireEvent.keyDown(area, { key: ' ' });
  expect(picker).toHaveBeenCalledTimes(3);
  picker.mockRestore();
});

test('populated folder reveals a drop overlay only for file drags and keeps progress visible after dropping', async () => {
  let finish, config;
  api.post.mockImplementation((url, body, options) => { config = options; return new Promise(resolve => { finish = resolve; }); });
  open();
  await screen.findByRole('button', { name: 'Preview Week 1 Notes' });
  const area = screen.getByRole('region', { name: 'Course documents' });
  expect(screen.queryByText('Drop your material here')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Upload material' })).not.toBeInTheDocument();
  fireEvent.dragEnter(area, { dataTransfer: { types: ['text/plain'] } });
  expect(screen.queryByText('Drop your material here')).not.toBeInTheDocument();
  const transfer = { dataTransfer: { types: ['Files'], files: [new File(['notes'], 'new.txt')] } };
  fireEvent.dragEnter(area, transfer);
  expect(screen.getByText('Drop your material here')).toBeInTheDocument();
  fireEvent.dragLeave(area);
  expect(screen.queryByText('Drop your material here')).not.toBeInTheDocument();
  fireEvent.dragEnter(area, transfer);
  fireEvent.drop(area, transfer);
  expect(screen.queryByText('Drop your material here')).not.toBeInTheDocument();
  expect(api.post).toHaveBeenCalledWith('/api/v1/courses/course1/materials', expect.any(FormData), expect.objectContaining({ params: { folder: 'lecture1' } }));
  act(() => config.onUploadProgress({ loaded: 1, total: 2 }));
  expect(screen.getByText('Uploading 50%')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cancel upload' })).toBeInTheDocument();
  await act(async () => finish({}));
  expect(await screen.findByText('Document uploaded.')).toBeInTheDocument();
  expect(screen.queryByText('Drop your material here')).not.toBeInTheDocument();
});
