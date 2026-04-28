import React, { useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import RecordCard from "./record_card"
import type { Listing } from "../types/inertia"

interface Props {
  records: Listing[]
  index: number
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 400 : -400,
    rotate: direction > 0 ? -12 : 12,
    opacity: 0,
    scale: 0.92,
  }),
  center: {
    x: 0,
    rotate: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -400 : 400,
    rotate: direction > 0 ? 12 : -12,
    opacity: 0,
    scale: 0.92,
  }),
}

const springTransition = {
  type: "spring" as const,
  stiffness: 280,
  damping: 28,
  mass: 0.9,
}

export default function RecordStack({ records, index }: Props) {
  const prevIndex = useRef(index)
  const direction = index - prevIndex.current

  if (index !== prevIndex.current) {
    prevIndex.current = index
  }

  return (
    <div className="relative flex items-center justify-center" style={{ height: "420px" }}>
      {/* Background depth cards */}
      {[-2, -1].map((offset) => {
        const i = index + offset
        if (i < 0 || i >= records.length) return null

        return (
          <motion.div
            key={records[i].id}
            className="absolute pointer-events-none"
            initial={false}
            animate={{
              rotate: offset * -3,
              x: offset * -40,
              y: offset * -6,
              scale: 0.85 + offset * 0.05,
              zIndex: 5 + offset,
              opacity: 0.35 + offset * -0.15,
            }}
            transition={springTransition}
          >
            <RecordCard listing={records[i]} />
          </motion.div>
        )
      })}

      {/* Front/active record with enter/exit animation */}
      <AnimatePresence mode="popLayout" custom={direction}>
        <motion.div
          key={records[index].id}
          className="relative z-20"
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={springTransition}
        >
          <RecordCard listing={records[index]} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
