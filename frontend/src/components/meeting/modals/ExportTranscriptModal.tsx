'use client';

import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { ArrowDownTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import type { ExportOptions } from '@/lib/meeting/utils/transcript-export';

interface ExportTranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  isExporting?: boolean;
}

export function ExportTranscriptModal({
  isOpen,
  onClose,
  onExport,
  isExporting = false,
}: ExportTranscriptModalProps) {
  const [format, setFormat] = useState<ExportOptions['format']>('markdown');
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeSpeakers, setIncludeSpeakers] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);

  const handleExport = () => {
    onExport({
      format,
      includeTimestamps,
      includeSpeakers,
      includeMetadata,
    });
  };

  const formatOptions = [
    { value: 'markdown', label: 'Markdown (.md)', icon: DocumentTextIcon },
    { value: 'text', label: 'Plain Text (.txt)', icon: DocumentTextIcon },
    { value: 'json', label: 'JSON (.json)', icon: DocumentTextIcon },
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
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <ArrowDownTrayIcon className="h-6 w-6 text-blue-600 dark:text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100"
                    >
                      Export Transcript
                    </Dialog.Title>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      Choose your export format and options
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-6">
                  {/* Format Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Export Format
                    </label>
                    <div className="space-y-2">
                      {formatOptions.map((option) => (
                        <label
                          key={option.value}
                          className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <input
                            type="radio"
                            name="format"
                            value={option.value}
                            checked={format === option.value}
                            onChange={(e) => setFormat(e.target.value as ExportOptions['format'])}
                            className="text-blue-600"
                          />
                          <option.icon className="h-5 w-5 text-gray-500" />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Include Options
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={includeTimestamps}
                          onChange={(e) => setIncludeTimestamps(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Include timestamps
                        </span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={includeSpeakers}
                          onChange={(e) => setIncludeSpeakers(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Include speaker names
                        </span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={includeMetadata}
                          onChange={(e) => setIncludeMetadata(e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Include meeting metadata
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    disabled={isExporting}
                    className="min-w-[100px]"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="min-w-[120px]"
                  >
                    {isExporting ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Exporting...
                      </div>
                    ) : (
                      <>
                        <ArrowDownTrayIcon className="h-4 w-4 mr-1.5" />
                        Export
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