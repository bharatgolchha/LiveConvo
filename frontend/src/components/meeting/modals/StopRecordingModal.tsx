'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { StopCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

interface StopRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function StopRecordingModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: StopRecordingModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                    <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 dark:text-orange-500" />
                  </div>
                  <div>
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100"
                    >
                      Stop Recording?
                    </Dialog.Title>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Are you sure you want to stop recording? You can resume recording later if needed.
                  </p>
                  
                  <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                    <div className="flex gap-2">
                      <StopCircleIcon className="h-5 w-5 text-orange-600 dark:text-orange-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-orange-800 dark:text-orange-300">
                        <p className="font-medium">Recording will be paused</p>
                        <p className="text-xs mt-1 text-orange-700 dark:text-orange-400">
                          The transcript captured so far will be saved and you can continue later.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={isLoading}
                    className="min-w-[100px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={onConfirm}
                    disabled={isLoading}
                    className="min-w-[100px] bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Stopping...
                      </div>
                    ) : (
                      <>
                        <StopCircleIcon className="h-4 w-4 mr-1.5" />
                        Stop Recording
                      </>
                    )}
                  </Button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}