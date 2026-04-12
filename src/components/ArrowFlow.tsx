'use client';

import { motion } from 'framer-motion';

type ArrowFlowProps = {
  attackCount: number;
  successCount: number;
};

const ROW_HEIGHT = 148;
const TOP_OFFSET = 10;

export function ArrowFlow({ attackCount, successCount }: ArrowFlowProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 hidden xl:block">
      {Array.from({ length: attackCount }).map((_, index) => {
        const top = TOP_OFFSET + index * ROW_HEIGHT + 66;

        return (
          <motion.div
            key={`attack-line-${index}`}
            initial={{ opacity: 0, scaleX: 0.4 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: index * 0.11, duration: 0.55, ease: 'easeOut' }}
            className="absolute left-[16%] right-[52%] h-px origin-left"
            style={{ top }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-400/80 to-transparent" />
            <motion.div
              className="absolute -right-2 -top-2 text-[11px] text-red-300"
              animate={{ x: [0, 8, 0], opacity: [0.25, 1, 0.25] }}
              transition={{ delay: index * 0.11, duration: 1.2, repeat: Infinity }}
            >
              ➜
            </motion.div>
          </motion.div>
        );
      })}

      {Array.from({ length: successCount }).map((_, index) => {
        const top = TOP_OFFSET + index * ROW_HEIGHT + 66;

        return (
          <motion.div
            key={`success-line-${index}`}
            initial={{ opacity: 0, scaleX: 0.4 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: 0.2 + index * 0.12, duration: 0.55, ease: 'easeOut' }}
            className="absolute left-[52%] right-[16%] h-px origin-left"
            style={{ top }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-300/80 to-transparent" />
            <motion.div
              className="absolute -right-2 -top-2 text-[11px] text-emerald-200"
              animate={{ x: [0, 8, 0], opacity: [0.25, 1, 0.25] }}
              transition={{ delay: 0.2 + index * 0.12, duration: 1.2, repeat: Infinity }}
            >
              ➜
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}