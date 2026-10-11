export type Room =
  | { kind: 'aarti'; id: string }
  | { kind: 'order'; id: string }
  | { kind: 'vendor'; id: string }
  | { kind: 'sos'; id: string }
  | { kind: 'admin' };

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const PATTERNS: [RegExp, Room['kind']][] = [
  [new RegExp(`^aarti:(${UUID})$`, 'i'), 'aarti'],
  [new RegExp(`^order:(${UUID})$`, 'i'), 'order'],
  [new RegExp(`^vendor:(${UUID})$`, 'i'), 'vendor'],
  [/^sos:([A-Za-z0-9_-]{20,30})$/, 'sos'],
];

export function parseRoom(value: unknown): Room | null {
  if (typeof value !== 'string' || value.length > 80) return null;
  if (value === 'admin') return { kind: 'admin' };
  for (const [re, kind] of PATTERNS) {
    const m = re.exec(value);
    const id = m?.[1];
    if (id)
      return kind === 'admin' ? { kind } : { kind, id: kind === 'sos' ? id : id.toLowerCase() };
  }
  return null;
}

export const roomName = {
  aarti: (templeId: string) => `aarti:${templeId}`,
  order: (orderId: string) => `order:${orderId}`,
  vendor: (vendorId: string) => `vendor:${vendorId}`,
  sos: (shareToken: string) => `sos:${shareToken}`,
  admin: () => 'admin',
};
