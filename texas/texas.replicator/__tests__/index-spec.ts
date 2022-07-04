import * as index from '../src/index';

test('Should have Greeter available', () => {
  expect(index.Greeter).toBeTruthy();
});

test('Should have Replicator available', () => {
  expect(index.Replicator).toBeTruthy();
});
