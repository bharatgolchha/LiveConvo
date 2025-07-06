import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMeetingContext } from '../context/MeetingContext';

export function usePersonalContext() {
  const { session } = useAuth();
  const { personalContext, setPersonalContext } = useMeetingContext();

  useEffect(() => {
    const fetchPersonalContext = async () => {
      if (!session?.access_token) return;

      try {
        const response = await fetch('/api/users/personal-context', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.personal_context) {
            setPersonalContext(data.personal_context);
          }
        }
      } catch (error) {
        console.error('Failed to fetch personal context:', error);
      }
    };

    fetchPersonalContext();
  }, [session?.access_token, setPersonalContext]);

  return { personalContext };
}