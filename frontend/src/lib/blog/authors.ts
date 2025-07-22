import { Author } from '@/types/blog'

export const authors: Record<string, Author> = {
  'team-liveprompt': {
    name: 'LivePrompt Team',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=LivePrompt&backgroundColor=6366f1',
    bio: 'The team behind LivePrompt.ai, building the future of real-time conversation AI.',
    role: 'Product Team',
    social: {
      twitter: 'https://twitter.com/liveprompt',
      linkedin: 'https://linkedin.com/company/liveprompt',
    }
  },
  'john-doe': {
    name: 'John Doe',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JohnDoe',
    bio: 'Head of Product at LivePrompt. Passionate about AI and conversation intelligence.',
    role: 'Head of Product',
    social: {
      twitter: 'https://twitter.com/johndoe',
      linkedin: 'https://linkedin.com/in/johndoe',
    }
  },
  'jane-smith': {
    name: 'Jane Smith',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=JaneSmith',
    bio: 'AI Engineer at LivePrompt. Building cutting-edge conversation AI systems.',
    role: 'AI Engineer',
    social: {
      twitter: 'https://twitter.com/janesmith',
      github: 'https://github.com/janesmith',
    }
  },
  'bharat-golchha': {
    name: 'Bharat Golchha',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=BG&backgroundColor=6366f1',
    bio: 'CEO & Co-Founder of LivePrompt.ai. Passionate about building AI that enhances human communication, not replaces it.',
    role: 'CEO & Co-Founder',
    social: {
      twitter: 'https://twitter.com/bharatgolchha',
      linkedin: 'https://linkedin.com/in/bharatgolchha',
    }
  }
}