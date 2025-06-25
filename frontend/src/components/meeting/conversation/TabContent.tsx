import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TabContentProps {
  children: ReactNode;
}

export function TabContent({ children }: TabContentProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={React.Children.toArray(children).findIndex(child => child)}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}