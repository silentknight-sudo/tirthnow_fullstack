import type { IconName } from '@/lib/content';

const PATHS: Record<IconName, string> = {
  temple:
    'M12 2l2 4h-4zM8 6h8l1 4H7zM5 10h14v2H5zM6 12h2v8H6zM11 12h2v8h-2zM16 12h2v8h-2zM3 20h18v2H3z',
  bell: 'M12 3a6 6 0 016 6v5l2 3H4l2-3V9a6 6 0 016-6zM10 19h4a2 2 0 01-4 0z',
  bed: 'M3 7v12M3 15h18v4M21 15v-3a3 3 0 00-3-3h-7v6M7 12a2 2 0 100-4 2 2 0 000 4z',
  car: 'M5 16l1.5-6h11L19 16M3 16h18v3H3zM7 19v2M17 19v2M8 10l1-3h6l1 3',
  thali: 'M3 12a9 4 0 0018 0zM7 10a2 2 0 014 0M13 10a2 2 0 014 0M12 8V5',
  boat: 'M3 16l2 4h14l2-4zM12 4v10M12 4l6 9h-6',
  spark: 'M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z',
  map: 'M9 4l6 2 6-2v16l-6 2-6-2-6 2V6zM9 4v16M15 6v16',
  shield: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5zM12 8v5M12 16v.5',
  reel: 'M4 4h16v16H4zM4 8h16M8 4l2 4M14 4l2 4M10 12v5l4-2.5z',
  mic: 'M12 3a3 3 0 013 3v6a3 3 0 01-6 0V6a3 3 0 013-3zM6 11a6 6 0 0012 0M12 17v4',
  camera: 'M4 7h4l2-2h4l2 2h4v12H4zM12 17a4 4 0 100-8 4 4 0 000 8z',
  cloud: 'M7 18a4 4 0 010-8 6 6 0 0111 2 3 3 0 010 6zM12 2v2M4.9 4.9l1.4 1.4',
  train: 'M6 3h12v13H6zM6 10h12M9 20l-2 2M15 20l2 2M9 13h.01M15 13h.01',
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
  lotus:
    'M12 4c2 3 2 7 0 11-2-4-2-8 0-11zM12 15c-3-1-6-4-7-8 4 0 6 3 7 8zM12 15c3-1 6-4 7-8-4 0-6 3-7 8zM4 18h16',
};

export function Icon({ name, size = 28 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
