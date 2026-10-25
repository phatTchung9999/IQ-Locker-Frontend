import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom';
import Courses from './Courses';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { api } from '../../utils/api';

jest.mock('react-router-dom', () => jest.requireActual('react-router'));
jest.mock('../../utils/api', () => ({ api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() } }));
const course = { id: '507f1f77bcf86cd799439011', name: 'Biology', code: 'BIO101', semester: 'Fall 2026' };
const onUnauthorized = jest.fn();
const testTheme = createTheme({ components: { MuiButtonBase: { defaultProps: { disableRipple: true } } } });
function CourseRoute() {
  const { courseId } = useParams();
  return <Courses basePath="/p_chung" courseId={courseId} onUnauthorized={onUnauthorized} />;
}
function open(path = '/p_chung/courses') {
  render(<ThemeProvider theme={testTheme}><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/p_chung/courses" element={<CourseRoute />} />
    <Route path="/p_chung/courses/:courseId" element={<CourseRoute />} />
  </Routes></MemoryRouter></ThemeProvider>);
}
beforeEach(() => { jest.resetAllMocks(); localStorage.setItem('token', 'test-token'); });

async function menu(action) {
  fireEvent.click(screen.getByRole('button', { name: 'Actions for Biology' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: action }));
}

test('creates a course and opens its stable ID route with automatic starter folders', async () => {
  api.get.mockImplementation((url) => Promise.resolve({ data: url.endsWith('/folders') ? { folders: ['Syllabus', 'Lectures', 'Quizzes', 'Exams'].map((name, index) => ({ id: `folder${index}`, name, parent: null })), breadcrumbs: [] } : url === '/api/v1/courses' ? [] : course }));
  api.post.mockResolvedValue({ data: course });
  open();
  expect(await screen.findByRole('heading', { name: 'Your courses start here' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Create course/ }));
  const dialog = await screen.findByRole('dialog', { name: 'Create course' });
  expect(within(dialog).queryByText(/Includes Syllabus/)).not.toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText(/Course name/), { target: { value: ' Biology ' } });
  fireEvent.change(within(dialog).getByLabelText('Course code (optional)'), { target: { value: course.code } });
  fireEvent.change(within(dialog).getByLabelText('Semester (optional)'), { target: { value: course.semester } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create course' }));
  const folder = await screen.findByRole('link', { name: 'Open Biology' });
  expect(folder).toHaveAttribute('href', `/p_chung/courses/${course.id}`);
  expect(api.post).toHaveBeenCalledWith('/api/v1/courses', { name: 'Biology', code: course.code, semester: course.semester }, expect.objectContaining({ headers: { Authorization: 'Bearer test-token' } }));
  fireEvent.click(folder);
  expect(await screen.findByRole('heading', { name: 'Biology' })).toBeInTheDocument();
  expect(await screen.findByRole('link', { name: 'Open folder Syllabus' })).toBeInTheDocument();
  for (const name of ['Lectures', 'Quizzes', 'Exams']) expect(screen.getByRole('link', { name: `Open folder ${name}` })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Add starter folders' })).not.toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Folder breadcrumbs' })).not.toBeInTheDocument();
});

test('edits metadata without changing a course ID and supports clearing code', async () => {
  api.get.mockResolvedValue({ data: [course] });
  api.patch.mockResolvedValue({ data: { ...course, name: 'Biology II', code: '' } });
  open();
  await screen.findByRole('link', { name: 'Open Biology' });
  await menu('Edit course');
  const dialog = await screen.findByRole('dialog', { name: 'Edit course' });
  fireEvent.change(within(dialog).getByLabelText(/Course name/), { target: { value: 'Biology II' } });
  fireEvent.change(within(dialog).getByLabelText('Course code (optional)'), { target: { value: '' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
  expect(await screen.findByRole('link', { name: 'Open Biology II' })).toHaveAttribute('href', `/p_chung/courses/${course.id}`);
  expect(api.patch).toHaveBeenCalledWith(`/api/v1/courses/${course.id}`, { name: 'Biology II', code: '', semester: course.semester }, expect.any(Object));
});

test('retains entered data when saving fails and Cancel leaves the list unchanged', async () => {
  api.get.mockResolvedValue({ data: [] });
  api.post.mockRejectedValue({ response: { data: { message: 'Course could not be saved' } } });
  open();
  await screen.findByRole('heading', { name: 'Your courses start here' });
  fireEvent.click(screen.getByRole('button', { name: /Create course/ }));
  const dialog = await screen.findByRole('dialog', { name: 'Create course' });
  fireEvent.change(within(dialog).getByLabelText(/Course name/), { target: { value: 'Biology' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create course' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Course could not be saved');
  expect(within(dialog).getByLabelText(/Course name/)).toHaveValue('Biology');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('link', { name: 'Open Biology' })).not.toBeInTheDocument();
});

test('prevents duplicate submissions while a create request is pending', async () => {
  api.get.mockResolvedValue({ data: [] });
  let finish;
  api.post.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  open();
  await screen.findByRole('heading', { name: 'Your courses start here' });
  fireEvent.click(screen.getByRole('button', { name: /Create course/ }));
  const dialog = await screen.findByRole('dialog', { name: 'Create course' });
  fireEvent.change(within(dialog).getByLabelText(/Course name/), { target: { value: 'Biology' } });
  const form = within(dialog).getByRole('button', { name: 'Create course' }).closest('form');
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(api.post).toHaveBeenCalledTimes(1);
  expect(within(dialog).getByRole('button', { name: 'Saving…' })).toBeDisabled();
  await act(async () => finish({ data: course }));
});

test('confirms deletion, reports a rejected delete, and keeps the course available', async () => {
  api.get.mockResolvedValue({ data: [course] });
  api.delete.mockRejectedValue({ response: { status: 409, data: { message: 'Course is not empty' } } });
  open();
  await screen.findByRole('link', { name: 'Open Biology' });
  await menu('Delete course');
  let dialog = await screen.findByRole('dialog', { name: 'Delete course?' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(api.delete).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await menu('Delete course');
  dialog = await screen.findByRole('dialog', { name: 'Delete course?' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete course' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Course is not empty');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(await screen.findByRole('link', { name: 'Open Biology' })).toBeInTheDocument();
});

test('deletes an open empty course and returns to the list', async () => {
  api.get.mockResolvedValueOnce({ data: course }).mockResolvedValue({ data: [] });
  api.delete.mockResolvedValue({ status: 204 });
  open(`/p_chung/courses/${course.id}`);
  await screen.findByRole('heading', { name: 'Biology' });
  await menu('Delete course');
  const dialog = await screen.findByRole('dialog', { name: 'Delete course?' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete course' }));
  expect(await screen.findByRole('heading', { name: 'Your courses start here' })).toBeInTheDocument();
});

test('distinguishes a failed list request from empty courses and retries', async () => {
  api.get.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({ data: [course] });
  open();
  expect(await screen.findByRole('alert')).toHaveTextContent('couldn’t load');
  expect(screen.queryByText('Your courses start here')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByRole('link', { name: 'Open Biology' })).toBeInTheDocument();
});

test('handles an inaccessible direct course URL', async () => {
  api.get.mockRejectedValue({ response: { status: 404 } });
  open(`/p_chung/courses/${course.id}`);
  expect(await screen.findByRole('alert')).toHaveTextContent('not found or is no longer available');
  expect(screen.getByRole('link', { name: /Back to Courses/ })).toHaveAttribute('href', '/p_chung/courses');
});

test('handles expired sessions through the shared account logout', async () => {
  api.get.mockRejectedValue({ response: { status: 401 } });
  open();
  await waitFor(() => expect(onUnauthorized).toHaveBeenCalledTimes(1));
});

test('reloads the list after creating a course following a list-load failure', async () => {
  api.get.mockRejectedValueOnce(new Error('Offline')).mockResolvedValue({ data: [course] });
  api.post.mockResolvedValue({ data: course });
  open();
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: /Create course/ }));
  const dialog = await screen.findByRole('dialog', { name: 'Create course' });
  fireEvent.change(within(dialog).getByLabelText(/Course name/), { target: { value: 'Biology' } });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create course' }));
  expect(await screen.findByRole('link', { name: 'Open Biology' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Course created.');
});
