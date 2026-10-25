import { accountHandle, accountPath, splitFullname } from './account';

test.each([
  ['Phat Chung', 'p_chung'],
  ['  Mary Jane Smith  ', 'm_smith'],
  ['José García', 'j_garcia'],
  ['Anne O’Neil', 'a_oneil'],
  ['Prince', 'p_prince'],
  ['李 明', '李_明'],
])('makes a URL handle from %s', (name, expected) => {
  expect(accountHandle(name)).toBe(expected);
});

test('encodes the handle for navigation', () => {
  expect(accountPath({ fullname: '李 明' })).toBe(`/${encodeURIComponent('李_明')}`);
});


test.each([
  ['Phat Chung', 'Phat', 'Chung'],
  ['  Mary   Jane Smith  ', 'Mary', 'Jane Smith'],
  ['Prince', 'Prince', ''],
])('splits %s for display without dropping name parts', (fullname, firstName, lastName) => {
  expect(splitFullname(fullname)).toEqual({ firstName, lastName });
});
