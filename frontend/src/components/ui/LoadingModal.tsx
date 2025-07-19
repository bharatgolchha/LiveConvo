"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface LoadingModalProps {
  isOpen: boolean
  title?: string
  description?: string
  isNewSession?: boolean
}

export function LoadingModal({
  isOpen,
  title,
  description,
  isNewSession = false,
}: LoadingModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-[100px] [&>button]:hidden border-0 bg-background/80 backdrop-blur-sm p-6">
        <DialogTitle className="sr-only">Loading</DialogTitle>
        <DialogDescription className="sr-only">Please wait...</DialogDescription>
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-muted border-t-primary border-r-primary rounded-full animate-spin" />
        </div>
      </DialogContent>
    </Dialog>
  )
}