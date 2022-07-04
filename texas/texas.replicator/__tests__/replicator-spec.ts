import { Replicator } from '../src/replicator';

test('Should greet with message', () => {
  const greeter = new Replicator('friend');
  expect(greeter.greet()).toBe('Bonjour, friend!');
});
