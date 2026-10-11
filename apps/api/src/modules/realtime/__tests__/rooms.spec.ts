import { parseRoom } from '../rooms';

describe('parseRoom', () => {
  const id = '3f2b8c1e-5a6d-4e7f-8a9b-0c1d2e3f4a5b';
  it('accepts the documented rooms', () => {
    expect(parseRoom(`aarti:${id}`)).toEqual({ kind: 'aarti', id });
    expect(parseRoom(`order:${id.toUpperCase()}`)).toEqual({ kind: 'order', id });
    expect(parseRoom(`vendor:${id}`)).toEqual({ kind: 'vendor', id });
    expect(parseRoom('sos:AbCdEfGhIjKlMnOpQrStUv')).toEqual({
      kind: 'sos',
      id: 'AbCdEfGhIjKlMnOpQrStUv',
    });
    expect(parseRoom('admin')).toEqual({ kind: 'admin' });
  });

  it('rejects anything else', () => {
    for (const bad of [
      null,
      42,
      '',
      'order:1',
      `orders:${id}`,
      `order:${id}:x`,
      'sos:short',
      'admin2',
      'x'.repeat(100),
    ]) {
      expect(parseRoom(bad)).toBeNull();
    }
  });
});
