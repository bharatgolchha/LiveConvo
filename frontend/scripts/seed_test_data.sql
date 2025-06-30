-- Seed Script for Test Data - User: bgolchha@gmail.com
-- This script is idempotent and can be run multiple times safely
-- It will create test data for user_id: e1ae6d39-bc60-4954-a498-ab08f14144af

BEGIN;

-- Variables
DO $$
DECLARE
  v_user_id UUID := 'e1ae6d39-bc60-4954-a498-ab08f14144af';
  v_org_id UUID := 'dfc638a2-43c9-4808-abc9-d028ae31c5ba';
  v_session_id UUID;
  v_transcript_id UUID;
  v_guidance_id UUID;
  v_current_time TIMESTAMP WITH TIME ZONE := NOW();
  v_session_titles TEXT[] := ARRAY[
    'Sales Call with Tech Startup',
    'Product Demo for Enterprise Client',
    'Customer Support Feedback Session',
    'Strategy Meeting with Leadership',
    'Partnership Discussion with Vendor',
    'Weekly Team Standup',
    'Client Onboarding Call',
    'Investor Pitch Practice',
    'HR Interview - Senior Developer',
    'Project Kickoff Meeting',
    'Quarterly Business Review',
    'Marketing Campaign Planning',
    'Technical Architecture Discussion',
    'Customer Success Check-in',
    'Board Meeting Preparation'
  ];
  v_participants TEXT[] := ARRAY[
    'John Smith', 'Sarah Johnson', 'Mike Chen', 'Emily Davis', 
    'Robert Wilson', 'Lisa Anderson', 'David Martinez', 'Jennifer Lee',
    'Chris Taylor', 'Amanda Brown', 'Kevin White', 'Maria Garcia'
  ];
  v_conversation_types TEXT[] := ARRAY['sales', 'demo', 'support', 'meeting', 'interview', 'presentation'];
  i INTEGER;
BEGIN
  -- Clean up existing test sessions for this user (except real ones)
  -- We identify test sessions by their title pattern
  DELETE FROM sessions 
  WHERE user_id = v_user_id 
  AND (
    title LIKE '%Test Session%' 
    OR title = ANY(v_session_titles)
  );

  -- Create 15 test sessions with various statuses
  FOR i IN 1..15 LOOP
    -- Generate session ID
    v_session_id := gen_random_uuid();
    
    -- Insert session with varying timestamps and statuses
    INSERT INTO sessions (
      id, user_id, organization_id, title, conversation_type, status,
      participant_me, participant_them, meeting_platform,
      recording_duration_seconds, recording_started_at, recording_ended_at,
      total_words_spoken, user_talk_time_seconds, silence_periods_count,
      created_at, updated_at, finalized_at,
      transcription_provider, recording_type
    ) VALUES (
      v_session_id,
      v_user_id,
      v_org_id,
      v_session_titles[i],
      v_conversation_types[1 + (i % array_length(v_conversation_types, 1))],
      CASE 
        WHEN i <= 2 THEN 'active'
        WHEN i <= 12 THEN 'completed'
        ELSE 'archived'
      END,
      'Bharat Golchha',
      v_participants[1 + (i % array_length(v_participants, 1))],
      CASE 
        WHEN i % 3 = 0 THEN 'zoom'
        WHEN i % 3 = 1 THEN 'teams'
        ELSE 'google-meet'
      END,
      CASE 
        WHEN i <= 2 THEN NULL -- Active sessions don't have duration yet
        ELSE 600 + (random() * 3000)::INTEGER -- 10-60 minutes
      END,
      CASE 
        WHEN i = 1 THEN v_current_time - INTERVAL '10 minutes'
        WHEN i = 2 THEN v_current_time - INTERVAL '5 minutes'
        WHEN i <= 5 THEN v_current_time - INTERVAL '1 day' * (i - 2) - INTERVAL '2 hours'
        WHEN i <= 10 THEN v_current_time - INTERVAL '1 week' - INTERVAL '1 day' * (i - 5)
        ELSE v_current_time - INTERVAL '1 month' - INTERVAL '1 day' * (i - 10)
      END,
      CASE 
        WHEN i <= 2 THEN NULL -- Active sessions not ended
        ELSE (
          CASE 
            WHEN i = 1 THEN v_current_time - INTERVAL '10 minutes'
            WHEN i = 2 THEN v_current_time - INTERVAL '5 minutes'
            WHEN i <= 5 THEN v_current_time - INTERVAL '1 day' * (i - 2) - INTERVAL '2 hours'
            WHEN i <= 10 THEN v_current_time - INTERVAL '1 week' - INTERVAL '1 day' * (i - 5)
            ELSE v_current_time - INTERVAL '1 month' - INTERVAL '1 day' * (i - 10)
          END + INTERVAL '1 second' * (600 + (random() * 3000)::INTEGER)
        )
      END,
      CASE WHEN i <= 2 THEN NULL ELSE 500 + (random() * 5000)::INTEGER END,
      CASE WHEN i <= 2 THEN NULL ELSE 300 + (random() * 1500)::INTEGER END,
      CASE WHEN i <= 2 THEN NULL ELSE 5 + (random() * 20)::INTEGER END,
      CASE 
        WHEN i = 1 THEN v_current_time - INTERVAL '10 minutes'
        WHEN i = 2 THEN v_current_time - INTERVAL '5 minutes'
        WHEN i <= 5 THEN v_current_time - INTERVAL '1 day' * (i - 2) - INTERVAL '2 hours'
        WHEN i <= 10 THEN v_current_time - INTERVAL '1 week' - INTERVAL '1 day' * (i - 5)
        ELSE v_current_time - INTERVAL '1 month' - INTERVAL '1 day' * (i - 10)
      END,
      v_current_time,
      CASE 
        WHEN i <= 2 THEN NULL
        ELSE (
          CASE 
            WHEN i <= 5 THEN v_current_time - INTERVAL '1 day' * (i - 2) - INTERVAL '1 hour'
            WHEN i <= 10 THEN v_current_time - INTERVAL '1 week' - INTERVAL '1 day' * (i - 5) + INTERVAL '30 minutes'
            ELSE v_current_time - INTERVAL '1 month' - INTERVAL '1 day' * (i - 10) + INTERVAL '30 minutes'
          END
        )
      END,
      'deepgram',
      'microphone'
    );

    -- Add transcripts for non-archived sessions
    IF i <= 12 THEN
      -- Add 5-20 transcript entries per session
      FOR j IN 1..(5 + (random() * 15)::INTEGER) LOOP
        INSERT INTO transcripts (
          id, session_id, content, speaker, confidence_score,
          start_time_seconds, stt_provider, is_final, 
          sequence_number, is_owner, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          v_session_id,
          CASE j % 5
            WHEN 0 THEN 'I think we should focus on the key deliverables for this quarter.'
            WHEN 1 THEN 'That''s a great point. Let me share my screen to show you the data.'
            WHEN 2 THEN 'Can we schedule a follow-up meeting to discuss this further?'
            WHEN 3 THEN 'The implementation timeline looks reasonable to me.'
            ELSE 'I agree with your assessment. Let''s move forward with this approach.'
          END || ' ' || 
          CASE (random() * 3)::INTEGER
            WHEN 0 THEN 'We need to ensure all stakeholders are aligned.'
            WHEN 1 THEN 'The budget allocation seems appropriate for this phase.'
            ELSE 'I''ll send over the detailed documentation after this call.'
          END,
          CASE 
            WHEN j % 2 = 0 THEN 'Bharat Golchha'
            ELSE v_participants[1 + (i % array_length(v_participants, 1))]
          END,
          0.85 + (random() * 0.14),
          (j - 1) * 30.0 + (random() * 25),
          'deepgram',
          true,
          j,
          j % 2 = 0,
          (sessions.created_at + INTERVAL '1 second' * ((j - 1) * 30)),
          (sessions.created_at + INTERVAL '1 second' * ((j - 1) * 30))
        )
        FROM sessions WHERE id = v_session_id;
      END LOOP;

      -- Add guidance entries for completed sessions
      IF i > 2 AND i <= 12 THEN
        -- Add 2-5 guidance entries per session
        FOR j IN 1..(2 + (random() * 3)::INTEGER) LOOP
          INSERT INTO guidance (
            id, session_id, content, guidance_type, priority,
            context_snippet, triggered_at_seconds, was_displayed,
            was_clicked, was_dismissed, model_used, processing_time_ms,
            created_at, updated_at
          ) VALUES (
            gen_random_uuid(),
            v_session_id,
            CASE j % 6
              WHEN 0 THEN 'Consider asking about their budget constraints early in the conversation.'
              WHEN 1 THEN 'Great job building rapport! Now transition to discussing their pain points.'
              WHEN 2 THEN 'Remember to summarize the key action items before ending the call.'
              WHEN 3 THEN 'This would be a good time to share a relevant case study.'
              WHEN 4 THEN 'Try to get a specific timeline commitment from them.'
              ELSE 'Ask open-ended questions to better understand their needs.'
            END,
            CASE j % 3
              WHEN 0 THEN 'tactical'
              WHEN 1 THEN 'strategic'
              ELSE 'reminder'
            END,
            1 + (random() * 4)::INTEGER,
            'Based on the conversation flow...',
            60.0 * j + (random() * 50),
            random() > 0.2,
            random() > 0.5,
            random() > 0.8,
            'gpt-4',
            100 + (random() * 400)::INTEGER,
            (sessions.created_at + INTERVAL '1 minute' * j),
            (sessions.created_at + INTERVAL '1 minute' * j)
          )
          FROM sessions WHERE id = v_session_id;
        END LOOP;
      END IF;

      -- Add summaries for completed sessions
      IF i > 2 AND i <= 12 THEN
        INSERT INTO summaries (
          id, session_id, user_id, organization_id, title, tldr,
          key_decisions, action_items, follow_up_questions,
          conversation_highlights, structured_notes,
          generation_status, model_used, generation_time_seconds,
          is_marked_done, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          v_session_id,
          v_user_id,
          v_org_id,
          v_session_titles[i],
          CASE i % 3
            WHEN 0 THEN 'Discussed product roadmap and identified three key features for Q2. Client showed strong interest in integration capabilities.'
            WHEN 1 THEN 'Reviewed current challenges with existing solution. Agreed to proceed with proof of concept for automated workflow system.'
            ELSE 'Aligned on project scope and timeline. Budget approved for initial phase. Next steps clearly defined.'
          END,
          jsonb_build_array(
            jsonb_build_object('decision', 'Move forward with proposed solution', 'rationale', 'Meets all technical requirements'),
            jsonb_build_object('decision', 'Schedule follow-up in 2 weeks', 'rationale', 'Allow time for internal review'),
            jsonb_build_object('decision', 'Include stakeholders from IT and Finance', 'rationale', 'Ensure buy-in across departments')
          ),
          jsonb_build_array(
            jsonb_build_object('task', 'Send proposal document', 'assignee', 'Bharat Golchha', 'due_date', (v_current_time + INTERVAL '3 days')::DATE::TEXT),
            jsonb_build_object('task', 'Schedule technical deep-dive', 'assignee', 'Tech Team', 'due_date', (v_current_time + INTERVAL '1 week')::DATE::TEXT),
            jsonb_build_object('task', 'Prepare ROI analysis', 'assignee', 'Finance Team', 'due_date', (v_current_time + INTERVAL '5 days')::DATE::TEXT)
          ),
          jsonb_build_array(
            'What is the expected implementation timeline?',
            'Are there any compliance requirements we should be aware of?',
            'What is the decision-making process on their end?',
            'Who are the key stakeholders we need to involve?'
          ),
          jsonb_build_array(
            jsonb_build_object('timestamp', '00:02:15', 'highlight', 'Client expressed urgency due to upcoming audit'),
            jsonb_build_object('timestamp', '00:15:30', 'highlight', 'Budget range confirmed: $50-75k'),
            jsonb_build_object('timestamp', '00:28:45', 'highlight', 'Competitor mentioned - need to differentiate'),
            jsonb_build_object('timestamp', '00:45:00', 'highlight', 'Verbal commitment to move forward')
          ),
          E'# Meeting Notes\n\n## Attendees\n- Bharat Golchha\n- ' || v_participants[1 + (i % array_length(v_participants, 1))] || 
          E'\n\n## Agenda\n1. Current challenges review\n2. Solution presentation\n3. Implementation discussion\n4. Next steps\n\n## Key Points\n- Strong alignment on technical requirements\n- Budget approved in principle\n- Timeline: 3-month implementation\n- Success metrics defined\n\n## Risks\n- Competing priorities in Q3\n- Integration complexity with legacy systems\n- Change management considerations',
          'completed',
          'gpt-4',
          2.5 + (random() * 2),
          random() > 0.5,
          sessions.finalized_at,
          v_current_time
        )
        FROM sessions WHERE id = v_session_id;
      END IF;

      -- Add checklist items for some sessions
      IF i % 3 = 0 AND i <= 12 THEN
        -- Add 3-6 checklist items
        FOR j IN 1..(3 + (random() * 3)::INTEGER) LOOP
          INSERT INTO prep_checklist (
            id, session_id, text, status, created_at, updated_at, created_by
          ) VALUES (
            gen_random_uuid(),
            v_session_id,
            CASE j % 8
              WHEN 0 THEN 'Review client background and previous interactions'
              WHEN 1 THEN 'Prepare demo environment with latest features'
              WHEN 2 THEN 'Update presentation with recent case studies'
              WHEN 3 THEN 'Confirm meeting agenda with all participants'
              WHEN 4 THEN 'Test screen sharing and audio quality'
              WHEN 5 THEN 'Gather relevant metrics and KPIs'
              WHEN 6 THEN 'Review competitor analysis'
              ELSE 'Prepare answers to common objections'
            END,
            CASE 
              WHEN j <= 2 AND i > 2 THEN 'completed'
              WHEN j = 3 AND i <= 6 THEN 'in_progress'
              ELSE 'pending'
            END,
            sessions.created_at - INTERVAL '1 hour',
            CASE 
              WHEN j <= 2 AND i > 2 THEN sessions.created_at - INTERVAL '30 minutes'
              ELSE sessions.created_at - INTERVAL '1 hour'
            END,
            v_user_id
          )
          FROM sessions WHERE id = v_session_id;
        END LOOP;
      END IF;

      -- Add timeline events for completed sessions
      IF i > 2 AND i <= 12 THEN
        -- Add 4-8 timeline events
        FOR j IN 1..(4 + (random() * 4)::INTEGER) LOOP
          INSERT INTO session_timeline_events (
            id, session_id, event_timestamp, title, description,
            type, importance, created_at
          ) VALUES (
            gen_random_uuid(),
            v_session_id,
            sessions.created_at + INTERVAL '1 minute' * (j * 5),
            CASE j % 7
              WHEN 0 THEN 'Introduction and rapport building'
              WHEN 1 THEN 'Pain points discussion'
              WHEN 2 THEN 'Solution presentation begun'
              WHEN 3 THEN 'Technical requirements reviewed'
              WHEN 4 THEN 'Pricing discussion'
              WHEN 5 THEN 'Objection handling'
              ELSE 'Next steps and timeline agreed'
            END,
            CASE j % 7
              WHEN 0 THEN 'Started with small talk about recent industry news'
              WHEN 1 THEN 'Client explained current challenges in detail'
              WHEN 2 THEN 'Demonstrated key features relevant to their use case'
              WHEN 3 THEN 'Discussed integration requirements and API capabilities'
              WHEN 4 THEN 'Presented pricing tiers and ROI calculations'
              WHEN 5 THEN 'Addressed concerns about implementation complexity'
              ELSE 'Agreed on pilot program starting next month'
            END,
            CASE j % 4
              WHEN 0 THEN 'conversation_start'
              WHEN 1 THEN 'key_moment'
              WHEN 2 THEN 'decision_point'
              ELSE 'action_item'
            END,
            CASE j % 3
              WHEN 0 THEN 'high'
              WHEN 1 THEN 'medium'
              ELSE 'low'
            END,
            sessions.created_at + INTERVAL '1 minute' * (j * 5)
          )
          FROM sessions WHERE id = v_session_id;
        END LOOP;
      END IF;
    END IF;
  END LOOP;

  -- Update user statistics
  -- Note: This is a simplified update. In production, you might have triggers or functions to maintain these stats
  RAISE NOTICE 'Test data seeded successfully for user: bgolchha@gmail.com';
  
END $$;

COMMIT;

-- Verification queries
SELECT 'Sessions created:' as info, COUNT(*) as count FROM sessions WHERE user_id = 'e1ae6d39-bc60-4954-a498-ab08f14144af';
SELECT 'Active sessions:' as info, COUNT(*) as count FROM sessions WHERE user_id = 'e1ae6d39-bc60-4954-a498-ab08f14144af' AND status = 'active';
SELECT 'Completed sessions:' as info, COUNT(*) as count FROM sessions WHERE user_id = 'e1ae6d39-bc60-4954-a498-ab08f14144af' AND status = 'completed';
SELECT 'Archived sessions:' as info, COUNT(*) as count FROM sessions WHERE user_id = 'e1ae6d39-bc60-4954-a498-ab08f14144af' AND status = 'archived';
SELECT 'Total transcripts:' as info, COUNT(*) as count FROM transcripts t JOIN sessions s ON t.session_id = s.id WHERE s.user_id = 'e1ae6d39-bc60-4954-a498-ab08f14144af';
SELECT 'Total summaries:' as info, COUNT(*) as count FROM summaries WHERE user_id = 'e1ae6d39-bc60-4954-a498-ab08f14144af';