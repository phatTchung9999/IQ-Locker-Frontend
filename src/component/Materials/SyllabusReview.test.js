import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SyllabusReview from './SyllabusReview';
import UpcomingDeadlines from '../Home/UpcomingDeadlines';
import { api } from '../../utils/api';

jest.mock('../../utils/api', () => ({ api: { post: jest.fn(), get: jest.fn() } }));

it('shows source evidence and sends the corrected date only on confirmation', async () => {
  const job = { id: 'job', extractionId: 'snapshot', state: 'ready' };
  api.post.mockResolvedValueOnce({ data: job }).mockResolvedValueOnce({ data: { status: 'confirmed', date: '2026-12-16' } });
  api.get.mockResolvedValueOnce({ data: { suggestions: [{ index: 0, title: 'Final exam', kind: 'exam',
    status: 'pending', date: '2026-12-15', flags: [], contextSources: [],
    sources: [{ quote: 'Final exam: 2026-12-15.', page: 2 }] }] } });
  const { unmount } = render(<SyllabusReview courseId="course" material={{ id: 'material', title: 'Syllabus' }} onClose={jest.fn()} />);
  fireEvent.click(await screen.findByText('View sources · Page 2'));
  expect(await screen.findByText('Final exam: 2026-12-15.')).toBeInTheDocument();
  expect(screen.getByText('Page 2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Edit date' }));
  fireEvent.change(screen.getByLabelText('Deadline date'), { target: { value: '2026-12-16' } });
  expect(api.post).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Confirm date' }));
  await waitFor(() => expect(screen.getByText('Confirmed')).toBeInTheDocument());
  expect(api.post).toHaveBeenLastCalledWith(expect.stringMatching(/\/analysis\/review$/), {
    jobId: 'job', index: 0, status: 'confirmed', date: '2026-12-16',
  }, expect.anything());
  unmount();
  api.get.mockResolvedValueOnce({ data: [{ jobId: 'job', index: 0, date: '2026-12-16', title: 'Final exam', kind: 'exam' }] });
  render(<UpcomingDeadlines />);
  expect(await screen.findByText('2026-12-16')).toBeInTheDocument();
});

it('confirms an exam window without choosing a day', async () => {
  const range = { start: '2026-12-10', end: '2026-12-15' };
  api.post.mockResolvedValueOnce({ data: { id: 'job', extractionId: 'snapshot', state: 'ready' } })
    .mockResolvedValueOnce({ data: { status: 'confirmed', date: null, dateRange: range } });
  api.get.mockResolvedValueOnce({ data: { suggestions: [{ index: 0, title: 'Final exam', kind: 'exam',
    status: 'pending', date: null, dateRange: range, flags: [], sources: [], contextSources: [] }] } });
  render(<SyllabusReview courseId="course" material={{ id: 'material', title: 'Syllabus' }} onClose={jest.fn()} />);
  const confirm = await screen.findByRole('button', { name: 'Confirm period' });
  expect(screen.queryByLabelText('Deadline date')).not.toBeInTheDocument();
  fireEvent.click(confirm);
  await waitFor(() => expect(screen.getByText('Confirmed')).toBeInTheDocument());
  expect(api.post).toHaveBeenLastCalledWith(expect.stringMatching(/\/review$/), {
    jobId: 'job', index: 0, status: 'confirmed', period: true,
  }, expect.anything());
  fireEvent.click(screen.getByRole('button', { name: 'Enter exact date' }));
  expect(screen.getByLabelText('Deadline date')).toHaveValue('');
});
