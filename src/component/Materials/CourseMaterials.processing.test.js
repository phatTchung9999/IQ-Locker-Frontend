import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CourseMaterials from './CourseMaterials';
import { api } from '../../utils/api';
jest.mock('react-router-dom', () => jest.requireActual('react-router'));
jest.mock('../../utils/api', () => ({ api: { get: jest.fn(), post: jest.fn() } }));
jest.mock('./PdfPreview', () => () => null);
const base = { id: 'doc1', title: 'Notes', originalFilename: 'notes.txt', mediaType: 'text/plain', sizeBytes: 5, createdAt: '2026-11-01T12:00:00Z', state: 'ready' };
const usage = { usedBytes: 5, limitBytes: 500000000, maxFileBytes: 20000000 };
const response = (processingStatus, extra = {}, processingEnabled = true) => ({ data: { processingEnabled, materials: [{ ...base, processingStatus, ...extra }], usage } });
const onUnauthorized = jest.fn();
const theme = createTheme({ components: { MuiButtonBase: { defaultProps: { disableRipple: true } } } });
async function open() {
  const view = render(<ThemeProvider theme={theme}><CourseMaterials courseId="course1" folderId="folder1" onUnauthorized={onUnauthorized} /></ThemeProvider>);
  await act(async () => {}); return view;
}
beforeEach(() => { jest.resetAllMocks(); jest.useFakeTimers(); localStorage.setItem('token', 'token'); Object.defineProperty(document, 'hidden', { configurable: true, value: false }); });
afterEach(() => { cleanup(); jest.useRealTimers(); delete document.hidden; });
test('refreshes active extraction quietly and stops after ready', async () => {
  api.get.mockResolvedValueOnce(response('queued')).mockResolvedValueOnce(response('processing')).mockResolvedValue(response('ready'));
  await open();
  expect(screen.getByText('Text extraction queued')).toBeInTheDocument();
  await act(async () => { jest.advanceTimersByTime(5000); });
  expect(screen.getByText('Extracting text…')).toBeInTheDocument();
  expect(screen.queryByLabelText('Loading documents')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Preview Notes' })).toBeEnabled();
  await act(async () => { jest.advanceTimersByTime(5000); });
  expect(screen.getByText('Text ready')).toBeInTheDocument();
  await act(async () => { jest.advanceTimersByTime(30000); });
  expect(api.get).toHaveBeenCalledTimes(3);
});
test('shows paused status without repeatedly polling a disabled worker', async () => {
  api.get.mockResolvedValue(response('queued', {}, false));
  await open();
  expect(screen.getByText(/Text processing is paused/)).toBeInTheDocument();
  await act(async () => { jest.advanceTimersByTime(30000); });
  expect(api.get).toHaveBeenCalledTimes(1);
});
test('retries an eligible failure once and keeps original preview available', async () => {
  const failure = response('failed', { canRetryExtraction: true, processingErrorCode: 'parser_failed', processingAttempts: 1, processingMaxAttempts: 3 }, false);
  api.get.mockResolvedValueOnce(failure).mockResolvedValue(response('queued', {}, false));
  let finish;
  api.post.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await open();
  expect(screen.getByRole('button', { name: 'Preview Notes' })).toBeEnabled();
  const button = screen.getByRole('button', { name: 'Retry text extraction for Notes' });
  fireEvent.click(button); fireEvent.click(button);
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(button).toBeDisabled();
  expect(api.post).toHaveBeenCalledWith('/api/v1/courses/course1/materials/doc1/extraction/retry', {}, expect.objectContaining({ headers: { Authorization: 'Bearer token' } }));
  await act(async () => finish({ data: { ...base, processingStatus: 'queued' } }));
  expect(screen.getByText('Text extraction queued')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Retry text extraction for Notes' })).not.toBeInTheDocument();
});
test('explains scanned documents and exhausted retries without offering a misleading retry', async () => {
  api.get.mockResolvedValue(response('failed', { canRetryExtraction: false, processingErrorCode: 'no_readable_text' }));
  const view = await open();
  expect(screen.getByText(/Scanned PDFs need OCR/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Retry text extraction for Notes' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Preview Notes' })).toBeEnabled();
  view.unmount();
  api.get.mockResolvedValue(response('failed', { canRetryExtraction: false, processingErrorCode: 'timeout', processingAttempts: 3, processingMaxAttempts: 3 }));
  await open(); expect(screen.getByText(/Retry limit reached/)).toBeInTheDocument();
});
test('stops polling on failure, keeps the list visible and supports explicit refresh', async () => {
  api.get.mockResolvedValueOnce(response('queued')).mockRejectedValueOnce({ response: { status: 503 } }).mockResolvedValue(response('ready'));
  await open();
  await act(async () => { jest.advanceTimersByTime(5000); });
  expect(screen.getByText(/couldn’t refresh text processing/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Preview Notes' })).toBeEnabled();
  await act(async () => { jest.advanceTimersByTime(20000); });
  expect(api.get).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  await act(async () => {}); expect(screen.getByText('Text ready')).toBeInTheDocument();
});
test('aborts an outstanding poll and removes future timers when leaving the folder', async () => {
  let signal;
  api.get.mockResolvedValueOnce(response('queued')).mockImplementation((url, options) => { signal = options.signal; return new Promise(() => {}); });
  const view = await open();
  await act(async () => { jest.advanceTimersByTime(5000); });
  view.unmount(); expect(signal.aborted).toBe(true);
  await act(async () => { jest.advanceTimersByTime(20000); });
  expect(api.get).toHaveBeenCalledTimes(2);
});
test('pauses while the browser tab is hidden and resumes when visible', async () => {
  api.get.mockResolvedValueOnce(response('queued')).mockResolvedValue(response('ready'));
  await open();
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  fireEvent(document, new Event('visibilitychange'));
  await act(async () => { jest.advanceTimersByTime(10000); }); expect(api.get).toHaveBeenCalledTimes(1);
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  fireEvent(document, new Event('visibilitychange'));
  await act(async () => { jest.advanceTimersByTime(5000); }); expect(screen.getByText('Text ready')).toBeInTheDocument();
});
