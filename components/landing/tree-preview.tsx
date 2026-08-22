'use client';

import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

/**
 * The hero illustration is the product's own drawing language rendered as SVG:
 * the same cards, the same knots between couples, the same lines dropping to
 * the next generation. What you see here is what you get inside.
 */
interface Card {
  id: string;
  x: number;
  y: number;
  name: string;
  years: string;
  initials: string;
  tint: 'ochre' | 'sage' | 'clay' | 'muted';
  deceased?: boolean;
}

const CARD_W = 158;
const CARD_H = 56;

const CARDS: Card[] = [
  { id: 'ramesh', x: 176, y: 24, name: 'Ramesh Rathi', years: '1935 – 2011', initials: 'RR', tint: 'ochre', deceased: true },
  { id: 'sunita', x: 386, y: 24, name: 'Sunita Rathi', years: '1938 – 2019', initials: 'SR', tint: 'clay', deceased: true },

  { id: 'anil', x: 40, y: 178, name: 'Anil Rathi', years: 'b. 1960', initials: 'AR', tint: 'sage' },
  { id: 'priya', x: 250, y: 178, name: 'Priya Rathi', years: 'b. 1962', initials: 'PR', tint: 'ochre' },
  { id: 'deepa', x: 460, y: 178, name: 'Deepa Nair', years: 'b. 1963', initials: 'DN', tint: 'muted' },

  { id: 'meera', x: 96, y: 322, name: 'Meera Rathi', years: 'b. 1990', initials: 'MR', tint: 'clay' },
  { id: 'rohan', x: 314, y: 322, name: 'Rohan Rathi', years: 'b. 1993', initials: 'RR', tint: 'sage' },
  { id: 'kavya', x: 500, y: 322, name: 'Kavya Nair', years: 'b. 1996', initials: 'KN', tint: 'ochre' },
];

const KNOTS = [
  { id: 'k1', x: 360, y: 52 },
  { id: 'k2', x: 224, y: 206 },
];

const EDGES = [
  // Couple bars
  'M 334 52 H 386',
  'M 198 206 H 250',
  // Ramesh & Sunita → their children
  'M 360 80 V 128 M 119 128 H 534 M 119 128 V 178 M 534 128 V 178',
  // Anil & Priya → Meera, Rohan
  'M 224 234 V 282 M 175 282 H 393 M 175 282 V 322 M 393 282 V 322',
  // Deepa → Kavya
  'M 539 234 V 282 M 579 282 H 539 M 579 282 V 322',
];

const TINTS: Record<Card['tint'], { fill: string; text: string }> = {
  ochre: { fill: 'var(--ochre-soft)', text: 'var(--ochre)' },
  sage: { fill: 'var(--sage-soft)', text: 'var(--sage)' },
  clay: { fill: 'var(--clay-soft)', text: 'var(--clay)' },
  muted: { fill: 'var(--secondary)', text: 'var(--secondary-foreground)' },
};

export function TreePreview({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    // Scaled to fit a phone, the whole drawing would render its labels at four
    // or five pixels. Better to keep the type legible and let the panel scroll
    // sideways — which is what the real canvas does anyway.
    <div className="-mx-1 min-w-0 overflow-x-auto px-1 pb-1">
      <svg
        viewBox="0 0 720 400"
        className={cn('h-auto w-full min-w-[34rem]', className)}
        role="img"
        aria-label="A family tree showing three generations of the Rathi family"
      >
        <g stroke="var(--edge-line)" strokeWidth="1.5" fill="none" strokeLinecap="round">
          {EDGES.map((d, index) => (
            <motion.path
              key={d}
              d={d}
              initial={reduceMotion ? undefined : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.15 + index * 0.12, ease: 'easeOut' }}
            />
          ))}
        </g>

        {KNOTS.map((knot, index) => (
          <motion.circle
            key={knot.id}
            cx={knot.x}
            cy={knot.y}
            r="4.5"
            fill="var(--ochre)"
            initial={reduceMotion ? undefined : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5 + index * 0.15, type: 'spring', stiffness: 240, damping: 18 }}
            style={{ transformOrigin: `${knot.x}px ${knot.y}px` }}
          />
        ))}

        {CARDS.map((card, index) => {
          const tint = TINTS[card.tint];
          return (
            <motion.g
              key={card.id}
              initial={reduceMotion ? undefined : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <rect
                x={card.x}
                y={card.y}
                width={CARD_W}
                height={CARD_H}
                rx="12"
                fill="var(--card)"
                stroke="var(--border)"
                strokeWidth="1"
              />
              <circle cx={card.x + 30} cy={card.y + 28} r="15" fill={tint.fill} />
              <text
                x={card.x + 30}
                y={card.y + 33}
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill={tint.text}
                fontFamily="var(--font-display)"
              >
                {card.initials}
              </text>
              <text
                x={card.x + 54}
                y={card.y + 25}
                fontSize="12.5"
                fontWeight="600"
                fill="var(--card-foreground)"
                fontFamily="var(--font-display)"
              >
                {card.name}
              </text>
              <text x={card.x + 54} y={card.y + 41} fontSize="10.5" fill="var(--muted-foreground)">
                {card.years}
              </text>
              {card.deceased && (
                <circle cx={card.x + CARD_W - 14} cy={card.y + 14} r="3" fill="var(--muted-foreground)" opacity="0.4" />
              )}
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
