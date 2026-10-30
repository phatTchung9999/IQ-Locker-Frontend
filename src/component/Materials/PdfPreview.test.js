import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PdfPreview from './PdfPreview';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
jest.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({ getDocument: jest.fn(), GlobalWorkerOptions: {}, version: 'test' }));
let page, pdf, destroy;
beforeEach(() => {
  jest.clearAllMocks();
  window.ResizeObserver = class { observe() {} disconnect() {} };
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({}));
  page = { getViewport: jest.fn(({ scale }) => ({ width: 550 * scale, height: 700 * scale })), render: jest.fn(() => ({ promise: Promise.resolve(), cancel: jest.fn() })), getTextContent: jest.fn(async () => ({ items: [{ str: 'Lecture notes' }] })) };
  pdf = { numPages: 2, getPage: jest.fn(async () => page) }; destroy = jest.fn(async () => {});
  pdfjs.getDocument.mockReturnValue({ promise: Promise.resolve(pdf), destroy });
});
test('renders PDF bytes without script evaluation/XFA and supports accessible page navigation', async () => {
  const view = render(<PdfPreview bytes={new ArrayBuffer(8)} />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled());
  expect(pdfjs.getDocument).toHaveBeenCalledWith(expect.objectContaining({ isEvalSupported: false, enableXfa: false }));
  expect(screen.getByText('Lecture notes')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(pdf.getPage).toHaveBeenLastCalledWith(2));
  expect(screen.getByRole('img', { name: 'PDF page 2' })).toBeInTheDocument();
  view.unmount(); expect(destroy).toHaveBeenCalled();
});
test('lets mobile readers zoom and restore fit width', async () => {
  const view = render(<PdfPreview bytes={new ArrayBuffer(8)} />);
  const canvas = await screen.findByRole('img', { name: 'PDF page 1' });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Zoom in PDF' })).toBeEnabled());
  const original = parseFloat(canvas.style.width);
  fireEvent.click(screen.getByRole('button', { name: 'Zoom in PDF' }));
  await waitFor(() => expect(parseFloat(canvas.style.width)).toBeGreaterThan(original));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Fit width' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Fit width' }));
  await waitFor(() => expect(parseFloat(canvas.style.width)).toBe(original));
  view.unmount();
});

test('reports text extraction separately after a successful page render and clears it on navigation', async () => {
  page.getTextContent.mockRejectedValueOnce(new Error('Text extraction failed'));
  render(<PdfPreview bytes={new ArrayBuffer(8)} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('page is visible, but its text could not be extracted');
  expect(screen.getByRole('alert')).not.toHaveTextContent('could not be rendered');
  expect(page.render).toHaveBeenCalled();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await screen.findByText('Lecture notes');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
test('reports rendering failure separately and clears it after a successful retry', async () => {
  page.render.mockImplementationOnce(() => ({ promise: Promise.reject(new Error('Canvas failed')), cancel: jest.fn() }));
  render(<PdfPreview bytes={new ArrayBuffer(8)} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('This page could not be rendered');
  expect(page.getTextContent).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Zoom in PDF' })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: 'Zoom in PDF' }));
  await screen.findByText('Lecture notes');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
