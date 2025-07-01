'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BriefcaseIcon, 
  UserGroupIcon, 
  AcademicCapIcon, 
  MicrophoneIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';

interface UseCaseStepProps {
  data: {
    use_case: string;
    acquisition_source: string;
  };
  updateData: (data: any) => void;
  onNext: () => void;
  onBack: () => void;
}

const useCases = [
  {
    id: 'sales',
    label: 'Sales Calls',
    icon: BriefcaseIcon,
    description: 'Close more deals with AI-powered insights'
  },
  {
    id: 'interviews',
    label: 'Interviews',
    icon: UserGroupIcon,
    description: 'Conduct better interviews with real-time guidance'
  },
  {
    id: 'meetings',
    label: 'Team Meetings',
    icon: ChatBubbleLeftRightIcon,
    description: 'Make meetings more productive and actionable'
  },
  {
    id: 'education',
    label: 'Education',
    icon: AcademicCapIcon,
    description: 'Enhance learning with AI assistance'
  },
  {
    id: 'podcasts',
    label: 'Podcasts',
    icon: MicrophoneIcon,
    description: 'Create engaging content with AI support'
  },
  {
    id: 'other',
    label: 'Other',
    icon: GlobeAltIcon,
    description: 'Explore other use cases'
  }
];

const acquisitionSources = [
  { id: 'google', label: 'Google Search' },
  { id: 'twitter', label: 'Twitter/X' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'friend', label: 'Friend or Colleague' },
  { id: 'blog', label: 'Blog or Article' },
  { id: 'other', label: 'Other' }
];

export const UseCaseStep: React.FC<UseCaseStepProps> = ({
  data,
  updateData,
  onNext,
  onBack
}) => {
  const [selectedUseCase, setSelectedUseCase] = useState(data.use_case);
  const [selectedSource, setSelectedSource] = useState(data.acquisition_source);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUseCase && selectedSource) {
      updateData({ 
        use_case: selectedUseCase, 
        acquisition_source: selectedSource 
      });
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          How will you use liveprompt.ai?
        </h2>
        <p className="text-muted-foreground">
          This helps us tailor your experience
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          {useCases.map((useCase) => {
            const Icon = useCase.icon;
            return (
              <motion.button
                key={useCase.id}
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedUseCase(useCase.id)}
                className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                  selectedUseCase === useCase.id
                    ? 'border-app-primary bg-app-primary/5'
                    : 'border-border hover:border-app-primary/50'
                }`}
              >
                <Icon className={`w-6 h-6 mb-2 ${
                  selectedUseCase === useCase.id
                    ? 'text-app-primary'
                    : 'text-muted-foreground'
                }`} />
                <h3 className="font-medium text-foreground mb-1">
                  {useCase.label}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {useCase.description}
                </p>
              </motion.button>
            );
          })}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            How did you hear about us?
          </label>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-app-primary focus:border-app-primary transition-all duration-200 text-foreground"
            required
          >
            <option value="">Select an option</option>
            {acquisitionSources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-3 pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex items-center gap-2"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back
        </Button>
        <Button
          type="submit"
          disabled={!selectedUseCase || !selectedSource}
          className="flex-1 bg-gradient-to-r from-app-primary to-app-primary-dark hover:from-app-primary-dark hover:to-app-primary text-white py-3 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </Button>
      </div>
    </form>
  );
};