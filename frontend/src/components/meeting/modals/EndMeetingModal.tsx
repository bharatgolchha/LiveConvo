'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { PhoneXMarkIcon, DocumentTextIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

interface EndMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  meetingTitle?: string;
}

export function EndMeetingModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  meetingTitle,
}: EndMeetingModalProps) {
  const features = [
    'Stop recording permanently',
    'Generate comprehensive meeting summary',
    'Create timeline of key moments',
    'Save all transcripts and notes',
    'Mark meeting as complete',
  ];

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
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <PhoneXMarkIcon className="h-6 w-6 text-red-600 dark:text-red-500" />
                  </div>
                  <div className="flex-1">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100"
                    >
                      End Meeting
                    </Dialog.Title>
                    {meetingTitle && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        {meetingTitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ending this meeting will trigger the following actions:
                  </p>
                  
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                    <div className="space-y-3">
                      {features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <CheckIcon className="h-5 w-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <div className="flex gap-2">
                      <DocumentTextIcon className="h-5 w-5 text-blue-600 dark:text-blue-500 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-blue-800 dark:text-blue-300">
                        <p className="font-medium">AI-Powered Report</p>
                        <p className="text-xs mt-1 text-blue-700 dark:text-blue-400">
                          A comprehensive meeting report will be generated and available in your dashboard within moments.
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
                    className="min-w-[120px]"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Ending...
                      </div>
                    ) : (
                      <>
                        <PhoneXMarkIcon className="h-4 w-4 mr-1.5" />
                        End Meeting
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