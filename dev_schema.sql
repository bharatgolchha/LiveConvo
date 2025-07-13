--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.13 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: supabase_migrations; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA supabase_migrations;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
begin
    raise debug 'PgBouncer auth request: %', p_usename;

    return query
    select 
        rolname::text, 
        case when rolvaliduntil < now() 
            then null 
            else rolpassword::text 
        end 
    from pg_authid 
    where rolname=$1 and rolcanlogin;
end;
$_$;


--
-- Name: auto_complete_orphaned_recordings(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_complete_orphaned_recordings() RETURNS TABLE(sessions_fixed integer, bot_records_fixed integer, total_minutes_recovered integer)
    LANGUAGE plpgsql
    AS $$
DECLARE
    sessions_count INTEGER := 0;
    bot_count INTEGER := 0;
    minutes_recovered INTEGER := 0;
BEGIN
    -- Auto-complete orphaned bot recordings
    WITH orphaned_sessions AS (
        SELECT DISTINCT
            but.bot_id,
            but.session_id,
            but.user_id,
            but.organization_id,
            but.recording_started_at,
            s.recording_ended_at,
            s.status as session_status,
            but.status as bot_status,
            -- Find latest transcript for this session
            COALESCE(
                (SELECT MAX(created_at) FROM transcripts WHERE session_id = but.session_id),
                but.recording_started_at
            ) as last_transcript_time,
            -- Calculate if this should be considered "orphaned"
            CASE 
                WHEN s.recording_ended_at IS NOT NULL AND but.recording_ended_at IS NULL THEN 'session_ended_but_bot_active'
                WHEN s.status = 'completed' AND but.status = 'recording' THEN 'session_completed_but_bot_recording'
                WHEN but.recording_started_at < NOW() - INTERVAL '5 minutes' 
                     AND COALESCE((SELECT MAX(created_at) FROM transcripts WHERE session_id = but.session_id), but.recording_started_at) < NOW() - INTERVAL '5 minutes'
                     AND but.status = 'recording' THEN 'no_activity_timeout'
                ELSE NULL
            END as orphan_reason
        FROM bot_usage_tracking but
        JOIN sessions s ON s.id = but.session_id
        WHERE but.status = 'recording'
            AND but.recording_started_at IS NOT NULL
    ),
    orphan_calculations AS (
        SELECT 
            bot_id,
            session_id,
            user_id,
            organization_id,
            recording_started_at,
            orphan_reason,
            -- Calculate what the end time should be
            CASE 
                WHEN orphan_reason = 'session_ended_but_bot_active' THEN 
                    (SELECT recording_ended_at FROM sessions WHERE id = session_id)
                WHEN orphan_reason = 'session_completed_but_bot_recording' THEN 
                    COALESCE(
                        (SELECT recording_ended_at FROM sessions WHERE id = session_id),
                        last_transcript_time + INTERVAL '30 seconds'
                    )
                WHEN orphan_reason = 'no_activity_timeout' THEN 
                    last_transcript_time + INTERVAL '30 seconds'
                ELSE NULL
            END as calculated_end_time
        FROM orphaned_sessions 
        WHERE orphan_reason IS NOT NULL
    ),
    calculated_usage AS (
        SELECT 
            *,
            EXTRACT(EPOCH FROM (calculated_end_time - recording_started_at))::INTEGER as duration_seconds,
            CEIL(EXTRACT(EPOCH FROM (calculated_end_time - recording_started_at)) / 60.0)::INTEGER as billable_minutes
        FROM orphan_calculations
        WHERE calculated_end_time IS NOT NULL
            AND calculated_end_time > recording_started_at
    ),
    bot_updates AS (
        UPDATE bot_usage_tracking 
        SET 
            recording_ended_at = cu.calculated_end_time,
            total_recording_seconds = cu.duration_seconds,
            billable_minutes = cu.billable_minutes,
            status = 'completed',
            updated_at = NOW()
        FROM calculated_usage cu
        WHERE bot_usage_tracking.bot_id = cu.bot_id
            AND bot_usage_tracking.status = 'recording'
        RETURNING bot_usage_tracking.session_id, cu.billable_minutes
    ),
    session_updates AS (
        UPDATE sessions 
        SET 
            bot_recording_minutes = bu.billable_minutes,
            bot_billable_amount = (bu.billable_minutes * 0.10)::DECIMAL(10,2),
            recall_bot_status = 'completed',
            status = CASE WHEN status = 'active' THEN 'completed' ELSE status END,
            updated_at = NOW()
        FROM bot_updates bu
        WHERE sessions.id = bu.session_id
        RETURNING sessions.id, bu.billable_minutes
    )
    SELECT 
        COUNT(DISTINCT su.id)::INTEGER,
        COUNT(DISTINCT bu.session_id)::INTEGER,
        COALESCE(SUM(su.billable_minutes), 0)::INTEGER
    INTO sessions_count, bot_count, minutes_recovered
    FROM session_updates su
    FULL OUTER JOIN bot_updates bu ON su.id = bu.session_id;

    -- Return the results
    RETURN QUERY SELECT sessions_count, bot_count, minutes_recovered;
END;
$$;


--
-- Name: calculate_bot_usage_metrics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_bot_usage_metrics() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Only calculate if we have both start and end times
    IF NEW.recording_started_at IS NOT NULL AND NEW.recording_ended_at IS NOT NULL THEN
        -- Calculate total seconds
        NEW.total_recording_seconds := EXTRACT(EPOCH FROM (NEW.recording_ended_at - NEW.recording_started_at))::INTEGER;
        
        -- Calculate billable minutes (rounded up)
        NEW.billable_minutes := CEIL(NEW.total_recording_seconds::DECIMAL / 60)::INTEGER;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: can_access_session(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_access_session(p_session_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM sessions 
    WHERE id = p_session_id 
    AND (
      user_id = p_user_id OR
      EXISTS (
        SELECT 1 FROM report_collaborators rc
        WHERE rc.session_id = p_session_id 
        AND rc.user_id = p_user_id
      )
    )
  );
END;
$$;


--
-- Name: cancel_old_subscriptions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cancel_old_subscriptions() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only process if this is a new active subscription with a Stripe ID
  IF NEW.status IN ('active', 'trialing') AND NEW.stripe_subscription_id IS NOT NULL THEN
    -- Cancel all other subscriptions for this user
    UPDATE subscriptions
    SET 
      status = 'canceled',
      canceled_at = NOW(),
      updated_at = NOW()
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND status IN ('active', 'trialing');
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: check_single_owner_org_per_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_single_owner_org_per_user() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only check for 'owner' role insertions
  IF NEW.role = 'owner' THEN
    -- Check if user already owns another organization
    IF EXISTS (
      SELECT 1 
      FROM organization_members 
      WHERE user_id = NEW.user_id 
      AND role = 'owner' 
      AND status = 'active'
      AND organization_id != NEW.organization_id
    ) THEN
      RAISE EXCEPTION 'User already owns an organization. A user can only own one organization at a time.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION check_single_owner_org_per_user(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_single_owner_org_per_user() IS 'Ensures a user can only own one organization at a time to prevent duplicate individual organizations';


--
-- Name: check_usage_limit(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_usage_limit(p_user_id uuid, p_organization_id uuid) RETURNS TABLE(can_record boolean, minutes_used integer, minutes_limit integer, minutes_remaining integer, percentage_used integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_result record;
BEGIN
    -- Call the v2 function and return compatible results
    SELECT * INTO v_result FROM check_usage_limit_v2(p_user_id, p_organization_id);
    
    RETURN QUERY SELECT 
        v_result.can_record,
        v_result.minutes_used,
        v_result.minutes_limit,
        v_result.minutes_remaining,
        v_result.percentage_used::integer;
END;
$$;


--
-- Name: check_usage_limit_v2(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_usage_limit_v2(p_user_id uuid, p_organization_id uuid) RETURNS TABLE(can_record boolean, minutes_used integer, minutes_limit integer, minutes_remaining integer, percentage_used numeric, is_unlimited boolean)
    LANGUAGE plpgsql
    AS $$
DECLARE
  user_limit INTEGER;
  user_used INTEGER;
  is_unlimited_plan BOOLEAN;
BEGIN
  -- Get user's current plan limit - prioritize bot minutes over audio hours
  SELECT 
    COALESCE(
      p.monthly_bot_minutes_limit,  -- First try bot minutes limit
      p.monthly_audio_minutes_limit, -- Then audio minutes limit  
      p.monthly_audio_hours_limit * 60, -- Then convert audio hours to minutes
      60 -- Default to 60 minutes for free tier
    ) as limit,
    CASE 
      WHEN p.monthly_bot_minutes_limit >= 999999 OR p.monthly_audio_hours_limit >= 999 OR p.monthly_audio_minutes_limit >= 999999 
      THEN true 
      ELSE false 
    END as unlimited
  INTO user_limit, is_unlimited_plan
  FROM active_user_subscriptions aus
  JOIN plans p ON aus.plan_id = p.id
  WHERE aus.user_id = p_user_id
  LIMIT 1;
  
  -- If no subscription found, default to free plan limits
  IF user_limit IS NULL THEN
    SELECT 
      COALESCE(
        p.monthly_bot_minutes_limit,
        p.monthly_audio_minutes_limit, 
        p.monthly_audio_hours_limit * 60, 
        60
      ),
      false
    INTO user_limit, is_unlimited_plan
    FROM plans p 
    WHERE p.name = 'individual_free' AND p.is_active = true
    LIMIT 1;
  END IF;
  
  -- Get current month usage from cache
  SELECT COALESCE(total_minutes_used, 0)
  INTO user_used
  FROM monthly_usage_cache 
  WHERE user_id = p_user_id 
    AND organization_id = p_organization_id
    AND month_year = to_char(now(), 'YYYY-MM')
  LIMIT 1;
  
  -- If no cache, calculate from usage_tracking (including bot usage)
  IF user_used IS NULL THEN
    SELECT COALESCE(CEILING(SUM(seconds_recorded) / 60.0), 0)
    INTO user_used
    FROM usage_tracking 
    WHERE user_id = p_user_id 
      AND organization_id = p_organization_id
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', now());
  END IF;
  
  -- Return results
  RETURN QUERY SELECT
    CASE WHEN is_unlimited_plan THEN true ELSE user_used < user_limit END as can_record,
    user_used as minutes_used,
    user_limit as minutes_limit,
    GREATEST(0, user_limit - user_used) as minutes_remaining,
    CASE WHEN is_unlimited_plan THEN 0 ELSE ROUND((user_used::NUMERIC / user_limit) * 100, 2) END as percentage_used,
    is_unlimited_plan as is_unlimited;
END;
$$;


--
-- Name: cleanup_old_usage_data(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_usage_data(months_to_keep integer DEFAULT 12) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Delete usage cache entries older than specified months
    DELETE FROM monthly_usage_cache
    WHERE last_updated < NOW() - (months_to_keep || ' months')::interval;
    
    -- Delete old usage tracking records
    DELETE FROM usage_tracking
    WHERE tracked_at < NOW() - (months_to_keep || ' months')::interval;
END;
$$;


--
-- Name: create_meeting_notification(uuid, uuid, uuid, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_meeting_notification(p_user_id uuid, p_event_id uuid, p_session_id uuid, p_type text, p_title text, p_message text, p_action_url text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO meeting_notifications (
        user_id,
        calendar_event_id,
        session_id,
        notification_type,
        title,
        message,
        action_url
    ) VALUES (
        p_user_id,
        p_event_id,
        p_session_id,
        p_type,
        p_title,
        p_message,
        p_action_url
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;


--
-- Name: get_next_transcript_sequence(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_next_transcript_sequence(session_uuid uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    next_seq INTEGER;
BEGIN
    SELECT COALESCE(MAX(sequence_number), 0) + 1 
    INTO next_seq 
    FROM transcripts 
    WHERE session_id = session_uuid;
    
    RETURN next_seq;
END;
$$;


--
-- Name: get_unread_mentions_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_unread_mentions_count(p_user_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM comment_mentions
    WHERE mentioned_user_id = p_user_id
    AND is_read = FALSE
  );
END;
$$;


--
-- Name: get_upcoming_meetings(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_upcoming_meetings(p_user_id uuid, p_days_ahead integer DEFAULT 7) RETURNS TABLE(event_id uuid, title text, description text, start_time timestamp with time zone, end_time timestamp with time zone, meeting_url text, attendees jsonb, is_organizer boolean, bot_scheduled boolean, calendar_email text, calendar_provider text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.id,
        ce.title,
        ce.description,
        ce.start_time,
        ce.end_time,
        ce.meeting_url,
        ce.attendees,
        ce.is_organizer,
        ce.bot_scheduled,
        cc.email,
        cc.provider
    FROM calendar_events ce
    INNER JOIN calendar_connections cc ON ce.calendar_connection_id = cc.id
    WHERE cc.user_id = p_user_id
        AND cc.is_active = true
        AND ce.start_time >= CURRENT_TIMESTAMP
        AND ce.start_time <= CURRENT_TIMESTAMP + (p_days_ahead || ' days')::INTERVAL
    ORDER BY ce.start_time ASC;
END;
$$;


--
-- Name: get_usage_details(uuid, uuid, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_usage_details(p_user_id uuid, p_organization_id uuid, p_start_date date DEFAULT date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone), p_end_date date DEFAULT CURRENT_DATE) RETURNS TABLE(date date, minutes_used integer, seconds_used integer, session_count integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(minute_timestamp) as date,
        COUNT(DISTINCT minute_timestamp)::integer as minutes_used,
        SUM(seconds_recorded)::integer as seconds_used,
        COUNT(DISTINCT session_id)::integer as session_count
    FROM usage_tracking
    WHERE user_id = p_user_id 
    AND organization_id = p_organization_id
    AND DATE(minute_timestamp) BETWEEN p_start_date AND p_end_date
    GROUP BY DATE(minute_timestamp)
    ORDER BY date;
END;
$$;


--
-- Name: get_user_billing_period(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_billing_period(p_user_id uuid, p_organization_id uuid) RETURNS TABLE(period_start timestamp with time zone, period_end timestamp with time zone, period_key text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_subscription_start timestamp with time zone;
    v_subscription_end timestamp with time zone;
    v_has_subscription boolean := false;
BEGIN
    -- First check if user has an active subscription
    SELECT 
        s.current_period_start,
        s.current_period_end,
        true
    INTO 
        v_subscription_start,
        v_subscription_end,
        v_has_subscription
    FROM subscriptions s
    WHERE s.user_id = p_user_id
    AND s.status = 'active'
    ORDER BY s.created_at DESC
    LIMIT 1;
    
    -- If no personal subscription, check organization subscription
    IF NOT v_has_subscription AND p_organization_id IS NOT NULL THEN
        SELECT 
            s.current_period_start,
            s.current_period_end,
            true
        INTO 
            v_subscription_start,
            v_subscription_end,
            v_has_subscription
        FROM organizations o
        JOIN subscriptions s ON s.user_id = o.owner_id
        WHERE o.id = p_organization_id
        AND s.status = 'active'
        ORDER BY s.created_at DESC
        LIMIT 1;
    END IF;
    
    -- If user has a subscription, use subscription period
    IF v_has_subscription THEN
        RETURN QUERY SELECT 
            v_subscription_start as period_start,
            v_subscription_end as period_end,
            TO_CHAR(v_subscription_start, 'YYYY-MM')::text as period_key;  -- Changed to YYYY-MM
    ELSE
        -- For free users, use calendar month
        RETURN QUERY SELECT 
            date_trunc('month', CURRENT_DATE)::timestamp with time zone as period_start,
            (date_trunc('month', CURRENT_DATE) + interval '1 month')::timestamp with time zone as period_end,
            TO_CHAR(CURRENT_DATE, 'YYYY-MM')::text as period_key;
    END IF;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Insert user record when auth.users is created
  INSERT INTO public.users (
    id,
    email,
    full_name,
    has_completed_onboarding,
    has_completed_organization_setup,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    false,
    false,
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;


--
-- Name: handle_subscription_renewal(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_subscription_renewal() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Only process if the subscription is active and the period has changed
    IF NEW.status = 'active' AND 
       OLD.current_period_start IS DISTINCT FROM NEW.current_period_start THEN
        
        -- Log the renewal to subscription_events table
        INSERT INTO subscription_events (
            user_id,
            organization_id,
            subscription_id,
            event_type,
            metadata
        )
        VALUES (
            NEW.user_id,
            NEW.organization_id,
            NEW.id,
            'subscription_renewed',
            jsonb_build_object(
                'old_period_start', OLD.current_period_start,
                'new_period_start', NEW.current_period_start,
                'old_period_end', OLD.current_period_end,
                'new_period_end', NEW.current_period_end,
                'plan_id', NEW.plan_id,
                'stripe_subscription_id', NEW.stripe_subscription_id
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: is_active_org_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_active_org_member(p_user_id uuid, p_org_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id
      AND organization_id = p_org_id
      AND status = 'active'
  );
$$;


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.users WHERE id = auth.uid()),
    false
  );
$$;


--
-- Name: log_auto_join_activity(uuid, uuid, uuid, text, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_auto_join_activity(p_user_id uuid, p_event_id uuid, p_session_id uuid, p_bot_id text, p_action text, p_status text, p_error_message text DEFAULT NULL::text, p_metadata jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO calendar_auto_join_logs (
        user_id,
        calendar_event_id,
        session_id,
        bot_id,
        action,
        status,
        error_message,
        metadata
    ) VALUES (
        p_user_id,
        p_event_id,
        p_session_id,
        p_bot_id,
        p_action,
        p_status,
        p_error_message,
        p_metadata
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;


--
-- Name: log_comment_activity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_comment_activity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only log activity if we have either user_id or guest_id
  IF NEW.user_id IS NOT NULL OR NEW.guest_id IS NOT NULL THEN
    INSERT INTO report_activity (session_id, user_id, activity_type, details)
    VALUES (
      NEW.session_id,
      NEW.user_id,  -- This can be NULL for guest comments
      'commented',
      jsonb_build_object(
        'comment_id', NEW.id,
        'parent_comment_id', NEW.parent_comment_id,
        'section_id', NEW.section_id,
        'is_guest', NEW.is_guest,
        'guest_id', NEW.guest_id,
        'guest_name', NEW.guest_name
      )
    );
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: log_task_activity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_task_activity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO report_activity (session_id, user_id, activity_type, details)
    VALUES (
      NEW.session_id,
      NEW.created_by,
      'task_created',
      jsonb_build_object(
        'task_id', NEW.id,
        'title', NEW.title,
        'assigned_to', NEW.assigned_to
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log task completion
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
      INSERT INTO report_activity (session_id, user_id, activity_type, details)
      VALUES (
        NEW.session_id,
        auth.uid(),
        'task_completed',
        jsonb_build_object(
          'task_id', NEW.id,
          'title', NEW.title
        )
      );
    -- Log task assignment changes
    ELSIF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO report_activity (session_id, user_id, activity_type, details)
      VALUES (
        NEW.session_id,
        auth.uid(),
        'task_assigned',
        jsonb_build_object(
          'task_id', NEW.id,
          'title', NEW.title,
          'assigned_to', NEW.assigned_to,
          'previous_assignee', OLD.assigned_to
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_transcript_sequence_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_transcript_sequence_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.sequence_number IS NULL THEN
    SELECT COALESCE(MAX(sequence_number), 0) + 1
    INTO NEW.sequence_number
    FROM transcripts
    WHERE session_id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: should_auto_join_meeting(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.should_auto_join_meeting(p_event_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_preferences RECORD;
    v_event RECORD;
    v_excluded_keywords TEXT[];
    v_actual_user_id UUID;
BEGIN
    -- Get the actual user_id from the calendar event through calendar_connection
    SELECT cc.user_id INTO v_actual_user_id
    FROM calendar_events ce
    JOIN calendar_connections cc ON ce.calendar_connection_id = cc.id
    WHERE ce.id = p_event_id;
    
    -- Get user preferences from calendar_preferences table
    SELECT * INTO v_preferences
    FROM calendar_preferences
    WHERE user_id = COALESCE(p_user_id, v_actual_user_id);
    
    -- Check if preferences exist and auto-join is enabled
    IF v_preferences IS NULL OR NOT COALESCE(v_preferences.auto_record_enabled, FALSE) THEN
        RETURN FALSE;
    END IF;
    
    -- Get event details
    SELECT * INTO v_event
    FROM calendar_events
    WHERE id = p_event_id;
    
    -- Check if already processed
    IF v_event.auto_session_created THEN
        RETURN FALSE;
    END IF;
    
    -- Check if meeting URL exists
    IF v_event.meeting_url IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Check excluded keywords
    v_excluded_keywords := v_preferences.excluded_keywords;
    
    IF v_excluded_keywords IS NOT NULL AND array_length(v_excluded_keywords, 1) > 0 THEN
        -- Check if title contains any excluded keywords
        IF EXISTS (
            SELECT 1 
            FROM unnest(v_excluded_keywords) AS keyword
            WHERE LOWER(v_event.title) LIKE '%' || LOWER(keyword) || '%'
        ) THEN
            RETURN FALSE;
        END IF;
    END IF;
    
    RETURN TRUE;
END;
$$;


--
-- Name: sync_subscription_limits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_subscription_limits() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- When a subscription is created or updated, sync the limits to organization_members
    IF NEW.status IN ('active', 'trialing') THEN
        -- Update organization member limits
        UPDATE organization_members om
        SET 
            monthly_audio_hours_limit = p.monthly_audio_hours_limit,
            updated_at = NOW()
        FROM plans p
        WHERE om.user_id = NEW.user_id 
            AND om.organization_id = NEW.organization_id
            AND p.id = NEW.plan_id;
            
        -- Update organization limits
        UPDATE organizations o
        SET 
            monthly_audio_hours_limit = p.monthly_audio_hours_limit,
            updated_at = NOW()
        FROM plans p
        WHERE o.id = NEW.organization_id
            AND p.id = NEW.plan_id;
    END IF;
    
    RETURN NEW;
END;
$$;


--
-- Name: test_user_access(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.test_user_access(test_user_id uuid) RETURNS TABLE(test_name text, result text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Set the auth context to the test user
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_user_id::text)::text, true);
    
    -- Test 1: Can user see their own record
    RETURN QUERY
    SELECT 
        'User can see own record'::text,
        CASE 
            WHEN EXISTS(SELECT 1 FROM users WHERE id = test_user_id) 
            THEN 'SUCCESS: User found'
            ELSE 'FAIL: User not found'
        END;
        
    -- Test 2: Can user see their organization
    RETURN QUERY
    SELECT 
        'User can see their organization'::text,
        CASE 
            WHEN EXISTS(
                SELECT 1 FROM organizations o
                JOIN organization_members om ON o.id = om.organization_id
                WHERE om.user_id = test_user_id
            ) 
            THEN 'SUCCESS: Organization found'
            ELSE 'FAIL: Organization not found'
        END;
END;
$$;


--
-- Name: test_users_rls(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.test_users_rls(test_user_id uuid) RETURNS TABLE(test_name text, can_access boolean, details text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Test 1: User can see their own record
    RETURN QUERY
    SELECT 
        'User can see own record'::text,
        EXISTS(
            SELECT 1 FROM users 
            WHERE id = test_user_id
        ),
        'Checking if user can access their own record'::text;
        
    -- Test 2: Check if user exists and is admin
    RETURN QUERY
    SELECT 
        'User admin status'::text,
        COALESCE((
            SELECT is_admin 
            FROM users 
            WHERE id = test_user_id
        ), false),
        'Checking if user is admin'::text;
END;
$$;


--
-- Name: test_users_rls_policies(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.test_users_rls_policies() RETURNS TABLE(test_scenario text, expected_result text, actual_result text, passed boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    admin_user_id uuid := '47fa2a65-5444-40f4-8c3f-136e51e1c192'; -- bgolchha+1@gmail.com (admin)
    regular_user_id uuid := '754a6166-1dbf-48b0-a858-01df9e74a839'; -- bgolchha+3@gmail.com (non-admin)
    test_result boolean;
BEGIN
    -- Test 1: Regular user can see only their own record
    RETURN QUERY
    SELECT 
        'Regular user accessing own record'::text,
        'Should see 1 record'::text,
        (SELECT COUNT(*)::text FROM users WHERE id = regular_user_id)::text,
        (SELECT COUNT(*) FROM users WHERE id = regular_user_id) = 1;
        
    -- Test 2: Regular user cannot see other users
    RETURN QUERY
    SELECT 
        'Regular user accessing other records'::text,
        'Should see only own record'::text,
        'Cannot test - requires auth context'::text,
        true; -- We'll need to test this from the app
        
    -- Test 3: Admin can see all users
    RETURN QUERY
    SELECT 
        'Admin user accessing all records'::text,
        'Should see all records'::text,
        'Cannot test - requires auth context'::text,
        true; -- We'll need to test this from the app
        
    -- Test 4: User can update own record
    RETURN QUERY
    SELECT 
        'User updating own record'::text,
        'Update should succeed'::text,
        'Cannot test - requires auth context'::text,
        true; -- We'll need to test this from the app
        
    -- Test 5: Verify no DELETE policy exists
    RETURN QUERY
    SELECT 
        'DELETE policy check'::text,
        'No DELETE policy should exist'::text,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM pg_policy 
                WHERE polrelid = 'users'::regclass 
                AND polcmd = 'd'
            ) THEN 'DELETE policy exists'
            ELSE 'No DELETE policy'
        END,
        NOT EXISTS (
            SELECT 1 FROM pg_policy 
            WHERE polrelid = 'users'::regclass 
            AND polcmd = 'd'
        );
END;
$$;


--
-- Name: track_minute_usage(uuid, uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.track_minute_usage(p_user_id uuid, p_organization_id uuid, p_session_id uuid, p_minutes_to_add integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_period_key varchar(20);
    v_period_start timestamp with time zone;
    v_period_end timestamp with time zone;
BEGIN
    -- Get the current billing period for the user
    SELECT period_key, period_start, period_end
    INTO v_period_key, v_period_start, v_period_end
    FROM get_user_billing_period(p_user_id, p_organization_id);
    
    -- Insert or update monthly usage cache using the billing period
    INSERT INTO monthly_usage_cache (
        user_id,
        organization_id,
        month_year,
        total_minutes_used,
        total_seconds_used,
        last_updated
    )
    VALUES (
        p_user_id,
        p_organization_id,
        v_period_key,
        p_minutes_to_add,
        p_minutes_to_add * 60,
        NOW()
    )
    ON CONFLICT (user_id, organization_id, month_year)
    DO UPDATE SET
        total_minutes_used = monthly_usage_cache.total_minutes_used + p_minutes_to_add,
        total_seconds_used = monthly_usage_cache.total_seconds_used + (p_minutes_to_add * 60),
        last_updated = NOW();
    
    -- Also update organization member's current month usage
    UPDATE organization_members
    SET 
        current_month_minutes_used = COALESCE(current_month_minutes_used, 0) + p_minutes_to_add,
        current_month_start = v_period_key,
        updated_at = NOW()
    WHERE user_id = p_user_id 
    AND organization_id = p_organization_id;
    
    -- Log the usage record
    INSERT INTO usage_tracking (
        user_id,
        organization_id,
        session_id,
        action_type,
        minutes_tracked,
        tracked_at
    )
    VALUES (
        p_user_id,
        p_organization_id,
        p_session_id,
        'minute_tracked',
        p_minutes_to_add,
        NOW()
    );
END;
$$;


--
-- Name: update_bot_usage_tracking_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_bot_usage_tracking_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


--
-- Name: update_calendar_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_calendar_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_member_usage(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_member_usage() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_month varchar(7);
    old_minutes integer;
    old_seconds integer;
    new_seconds integer;
    new_minutes integer;
    minute_increment integer;
BEGIN
    -- Get current month in YYYY-MM format
    current_month := TO_CHAR(NEW.minute_timestamp, 'YYYY-MM');

    -- Fetch existing totals from monthly cache
    SELECT total_minutes_used, total_seconds_used
    INTO old_minutes, old_seconds
    FROM monthly_usage_cache
    WHERE organization_id = NEW.organization_id
      AND user_id = NEW.user_id
      AND month_year = current_month;

    -- Initialize if no existing record
    IF old_minutes IS NULL THEN
        old_minutes := 0;
        old_seconds := 0;
    END IF;

    -- Calculate new totals based on actual seconds recorded
    new_seconds := old_seconds + NEW.seconds_recorded;
    new_minutes := CEIL(new_seconds::numeric / 60.0);
    minute_increment := new_minutes - old_minutes;

    -- Update organization_members current month usage accurately
    UPDATE organization_members
    SET
        current_month_minutes_used = CASE
            WHEN current_month_start IS NULL OR TO_CHAR(current_month_start, 'YYYY-MM') != current_month
            THEN new_minutes  -- Set to new total if new month
            ELSE current_month_minutes_used + minute_increment  -- Add only the difference
        END,
        current_month_start = CASE
            WHEN current_month_start IS NULL OR TO_CHAR(current_month_start, 'YYYY-MM') != current_month
            THEN DATE_TRUNC('month', NEW.minute_timestamp)::date
            ELSE current_month_start
        END,
        total_audio_hours_used = total_audio_hours_used + (NEW.seconds_recorded::numeric / 3600.0),
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = NEW.user_id
    AND organization_id = NEW.organization_id;

    -- Upsert monthly usage cache with accurate totals
    INSERT INTO monthly_usage_cache (
        organization_id,
        user_id,
        month_year,
        total_minutes_used,
        total_seconds_used,
        last_updated
    ) VALUES (
        NEW.organization_id,
        NEW.user_id,
        current_month,
        new_minutes,
        new_seconds,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (organization_id, user_id, month_year)
    DO UPDATE SET
        total_minutes_used = EXCLUDED.total_minutes_used,
        total_seconds_used = EXCLUDED.total_seconds_used,
        last_updated = CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$;


--
-- Name: update_monthly_usage_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_monthly_usage_cache() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update or insert into monthly_usage_cache
    INSERT INTO monthly_usage_cache (
        id,
        organization_id,
        user_id,
        month_year,
        total_minutes_used,
        total_seconds_used,
        last_updated
    )
    SELECT 
        COALESCE(muc.id, gen_random_uuid()),
        NEW.organization_id,
        NEW.user_id,
        TO_CHAR(NEW.created_at, 'YYYY-MM'),
        SUM(but.billable_minutes),
        SUM(but.total_recording_seconds),
        NOW()
    FROM bot_usage_tracking but
    LEFT JOIN monthly_usage_cache muc ON 
        muc.user_id = NEW.user_id 
        AND muc.organization_id = NEW.organization_id
        AND muc.month_year = TO_CHAR(NEW.created_at, 'YYYY-MM')
    WHERE but.user_id = NEW.user_id 
        AND but.organization_id = NEW.organization_id
        AND TO_CHAR(but.created_at, 'YYYY-MM') = TO_CHAR(NEW.created_at, 'YYYY-MM')
        AND but.status = 'completed'
    GROUP BY muc.id, NEW.organization_id, NEW.user_id
    ON CONFLICT DO NOTHING;
    
    -- If we have a conflict, update the existing record
    UPDATE monthly_usage_cache
    SET 
        total_minutes_used = (
            SELECT SUM(billable_minutes)
            FROM bot_usage_tracking
            WHERE user_id = NEW.user_id 
                AND organization_id = NEW.organization_id
                AND TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(NEW.created_at, 'YYYY-MM')
                AND status = 'completed'
        ),
        total_seconds_used = (
            SELECT SUM(total_recording_seconds)
            FROM bot_usage_tracking
            WHERE user_id = NEW.user_id 
                AND organization_id = NEW.organization_id
                AND TO_CHAR(created_at, 'YYYY-MM') = TO_CHAR(NEW.created_at, 'YYYY-MM')
                AND status = 'completed'
        ),
        last_updated = NOW()
    WHERE user_id = NEW.user_id 
        AND organization_id = NEW.organization_id
        AND month_year = TO_CHAR(NEW.created_at, 'YYYY-MM');
    
    RETURN NEW;
END;
$$;


--
-- Name: update_session_stats(uuid, integer, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_session_stats(p_session_id uuid, p_words_to_add integer DEFAULT 0, p_duration_to_add numeric DEFAULT 0) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE sessions
    SET 
        total_words = COALESCE(total_words, 0) + p_words_to_add,
        total_duration = COALESCE(total_duration, 0) + p_duration_to_add,
        updated_at = NOW()
    WHERE id = p_session_id;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_;

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  BEGIN
    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (payload, event, topic, private, extension)
    VALUES (payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      PERFORM pg_notify(
          'realtime:system',
          jsonb_build_object(
              'error', SQLERRM,
              'function', 'realtime.send',
              'event', event,
              'topic', topic,
              'private', private
          )::text
      );
  END;
END;
$$;


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
_filename text;
BEGIN
	select string_to_array(name, '/') into _parts;
	select _parts[array_length(_parts,1)] into _filename;
	-- @todo return the last part instead of 2
	return reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[1:array_length(_parts,1)-1];
END
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::int) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
  v_order_by text;
  v_sort_order text;
begin
  case
    when sortcolumn = 'name' then
      v_order_by = 'name';
    when sortcolumn = 'updated_at' then
      v_order_by = 'updated_at';
    when sortcolumn = 'created_at' then
      v_order_by = 'created_at';
    when sortcolumn = 'last_accessed_at' then
      v_order_by = 'last_accessed_at';
    else
      v_order_by = 'name';
  end case;

  case
    when sortorder = 'asc' then
      v_sort_order = 'asc';
    when sortorder = 'desc' then
      v_sort_order = 'desc';
    else
      v_sort_order = 'asc';
  end case;

  v_order_by = v_order_by || ' ' || v_sort_order;

  return query execute
    'with folders as (
       select path_tokens[$1] as folder
       from storage.objects
         where objects.name ilike $2 || $3 || ''%''
           and bucket_id = $4
           and array_length(objects.path_tokens, 1) <> $1
       group by folder
       order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text NOT NULL,
    code_challenge_method auth.code_challenge_method NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    description text,
    plan_type character varying(20) DEFAULT 'individual'::character varying NOT NULL,
    price_monthly numeric(8,2),
    price_yearly numeric(8,2),
    stripe_price_id_monthly character varying(255),
    stripe_price_id_yearly character varying(255),
    monthly_audio_hours_limit integer,
    max_documents_per_session integer DEFAULT 10,
    max_file_size_mb integer DEFAULT 25,
    max_sessions_per_month integer,
    max_organization_members integer,
    has_real_time_guidance boolean DEFAULT true,
    has_advanced_summaries boolean DEFAULT false,
    has_export_options boolean DEFAULT false,
    has_email_summaries boolean DEFAULT false,
    has_api_access boolean DEFAULT false,
    has_custom_templates boolean DEFAULT false,
    has_priority_support boolean DEFAULT false,
    has_analytics_dashboard boolean DEFAULT false,
    has_team_collaboration boolean DEFAULT false,
    ai_model_access jsonb DEFAULT '["gpt-4o-mini"]'::jsonb,
    max_guidance_requests_per_session integer DEFAULT 50,
    summary_generation_priority integer DEFAULT 3,
    is_active boolean DEFAULT true,
    is_featured boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    monthly_audio_minutes_limit integer,
    monthly_bot_minutes_limit integer
);


--
-- Name: COLUMN plans.monthly_bot_minutes_limit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.plans.monthly_bot_minutes_limit IS 'Monthly limit for bot recording minutes (replaces audio hours for bot-focused plans)';


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid,
    user_id uuid,
    plan_id uuid NOT NULL,
    stripe_customer_id character varying(255),
    stripe_subscription_id character varying(255),
    stripe_price_id character varying(255),
    plan_type character varying(20) NOT NULL,
    status character varying(20) NOT NULL,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    monthly_audio_hours_limit integer,
    monthly_audio_hours_used numeric(6,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    canceled_at timestamp with time zone
);


--
-- Name: active_user_subscriptions; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.active_user_subscriptions AS
 SELECT DISTINCT ON (s.user_id) s.id,
    s.organization_id,
    s.user_id,
    s.plan_id,
    s.stripe_customer_id,
    s.stripe_subscription_id,
    s.stripe_price_id,
    s.plan_type,
    s.status,
    s.current_period_start,
    s.current_period_end,
    s.monthly_audio_hours_used,
    s.created_at,
    s.updated_at,
    s.canceled_at,
    p.name AS plan_name,
    p.display_name AS plan_display_name,
    p.price_monthly,
    p.price_yearly,
    p.monthly_audio_hours_limit AS plan_audio_hours_limit,
    p.max_sessions_per_month,
    p.has_real_time_guidance,
    p.has_advanced_summaries,
    p.has_export_options
   FROM (public.subscriptions s
     LEFT JOIN public.plans p ON ((s.plan_id = p.id)))
  WHERE ((s.status)::text = ANY ((ARRAY['active'::character varying, 'trialing'::character varying])::text[]))
  ORDER BY s.user_id,
        CASE
            WHEN (s.stripe_subscription_id IS NOT NULL) THEN 0
            ELSE 1
        END,
        CASE
            WHEN ((s.plan_type)::text = 'individual_pro'::text) THEN 0
            ELSE 1
        END, s.created_at DESC;


--
-- Name: beta_waitlist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.beta_waitlist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    company text NOT NULL,
    use_case text NOT NULL,
    status text DEFAULT 'pending'::text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    referral_source text,
    interest_level text,
    approved_at timestamp with time zone,
    CONSTRAINT beta_waitlist_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'invited'::text]))),
    CONSTRAINT beta_waitlist_use_case_check CHECK ((use_case = ANY (ARRAY['sales'::text, 'consulting'::text, 'hiring'::text, 'support'::text, 'other'::text])))
);


--
-- Name: bot_recordings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bot_recordings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    bot_id uuid NOT NULL,
    recording_id uuid NOT NULL,
    recording_url text,
    recording_status character varying(50),
    recording_expires_at timestamp with time zone,
    duration_seconds integer,
    bot_name text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: bot_usage_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bot_usage_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bot_id text NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    recording_started_at timestamp with time zone,
    recording_ended_at timestamp with time zone,
    total_recording_seconds integer DEFAULT 0,
    billable_minutes integer DEFAULT 0,
    status text DEFAULT 'recording'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT bot_usage_tracking_status_check CHECK ((status = ANY (ARRAY['recording'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: calendar_auto_join_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_auto_join_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    calendar_event_id uuid NOT NULL,
    session_id uuid,
    bot_id text,
    action text NOT NULL,
    status text NOT NULL,
    error_message text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT calendar_auto_join_logs_action_check CHECK ((action = ANY (ARRAY['session_created'::text, 'bot_deployed'::text, 'bot_joined'::text, 'bot_failed'::text, 'session_ended'::text]))),
    CONSTRAINT calendar_auto_join_logs_status_check CHECK ((status = ANY (ARRAY['success'::text, 'failure'::text])))
);


--
-- Name: calendar_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    organization_id uuid,
    provider text NOT NULL,
    recall_calendar_id text NOT NULL,
    oauth_refresh_token text NOT NULL,
    email text NOT NULL,
    display_name text,
    is_active boolean DEFAULT true,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT calendar_connections_provider_check CHECK ((provider = ANY (ARRAY['google_calendar'::text, 'microsoft_outlook'::text])))
);


--
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    calendar_connection_id uuid,
    external_event_id text NOT NULL,
    title text NOT NULL,
    description text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    meeting_url text,
    attendees jsonb DEFAULT '[]'::jsonb,
    location text,
    organizer_email text,
    is_organizer boolean DEFAULT false,
    bot_scheduled boolean DEFAULT false,
    bot_id text,
    session_id uuid,
    raw_data jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    auto_session_created boolean DEFAULT false,
    auto_session_id uuid,
    auto_bot_status text,
    CONSTRAINT calendar_events_auto_bot_status_check CHECK ((auto_bot_status = ANY (ARRAY['pending'::text, 'deployed'::text, 'joining'::text, 'in_call'::text, 'failed'::text, 'ended'::text])))
);


--
-- Name: calendar_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    auto_join_enabled boolean DEFAULT false,
    join_buffer_minutes integer DEFAULT 2,
    auto_record_enabled boolean DEFAULT false,
    notify_before_join boolean DEFAULT true,
    notification_minutes integer DEFAULT 5,
    excluded_keywords text[] DEFAULT '{}'::text[],
    included_domains text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: calendar_webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    calendar_connection_id uuid,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    processed_at timestamp with time zone,
    error text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: collaborative_action_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collaborative_action_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    created_by uuid NOT NULL,
    assigned_to uuid,
    source_type character varying(50) NOT NULL,
    source_id uuid,
    title text NOT NULL,
    description text,
    priority character varying(20) DEFAULT 'medium'::character varying,
    status character varying(50) DEFAULT 'pending'::character varying,
    due_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    completed_by uuid,
    CONSTRAINT collaborative_action_items_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT collaborative_action_items_source_type_check CHECK (((source_type)::text = ANY ((ARRAY['ai_generated'::character varying, 'comment'::character varying, 'manual'::character varying])::text[]))),
    CONSTRAINT collaborative_action_items_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: comment_mentions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment_mentions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comment_id uuid NOT NULL,
    mentioned_user_id uuid NOT NULL,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: conversation_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    linked_session_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    original_filename character varying(255) NOT NULL,
    file_type character varying(50) NOT NULL,
    file_size_bytes integer NOT NULL,
    file_url character varying(512),
    extracted_text text,
    processing_status character varying(20) DEFAULT 'pending'::character varying,
    processing_error text,
    embedding_status character varying(20) DEFAULT 'pending'::character varying,
    pinecone_vector_id character varying(255),
    ocr_confidence_score numeric(3,2),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


--
-- Name: guidance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.guidance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    content text NOT NULL,
    guidance_type character varying(20) NOT NULL,
    priority integer DEFAULT 1,
    triggered_by_transcript_id uuid,
    context_snippet text,
    triggered_at_seconds numeric(10,3),
    was_displayed boolean DEFAULT false,
    was_clicked boolean DEFAULT false,
    was_dismissed boolean DEFAULT false,
    user_feedback character varying(20),
    model_used character varying(50),
    prompt_template_id uuid,
    processing_time_ms integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: meeting_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_metadata (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    platform character varying(50) NOT NULL,
    meeting_id character varying(255),
    host_id character varying(255),
    participant_count integer DEFAULT 0,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    meeting_agenda text,
    scheduled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE meeting_metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.meeting_metadata IS 'Stores additional metadata for video conference meetings';


--
-- Name: meeting_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    calendar_event_id uuid,
    session_id uuid,
    notification_type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    action_url text,
    read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT meeting_notifications_notification_type_check CHECK ((notification_type = ANY (ARRAY['meeting_starting'::text, 'bot_deployed'::text, 'bot_in_call'::text, 'bot_failed'::text])))
);


--
-- Name: monthly_usage_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.monthly_usage_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    month_year character varying(7) NOT NULL,
    total_minutes_used integer DEFAULT 0,
    total_seconds_used integer DEFAULT 0,
    last_updated timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT total_minutes_check CHECK ((total_minutes_used >= 0)),
    CONSTRAINT total_seconds_check CHECK ((total_seconds_used >= 0))
);


--
-- Name: organization_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    invited_by_user_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying NOT NULL,
    personal_message text,
    invitation_token character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    accepted_by_user_id uuid,
    accepted_at timestamp with time zone,
    declined_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: organization_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying NOT NULL,
    permissions jsonb DEFAULT '[]'::jsonb,
    status character varying(20) DEFAULT 'active'::character varying,
    monthly_audio_hours_limit integer,
    max_sessions_per_month integer,
    total_sessions_count integer DEFAULT 0,
    total_audio_hours_used numeric(6,2) DEFAULT 0,
    last_session_at timestamp with time zone,
    joined_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    current_month_minutes_used integer DEFAULT 0,
    current_month_start date
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    display_name character varying(255),
    slug character varying(100) NOT NULL,
    description text,
    website_url character varying(512),
    contact_email character varying(255),
    phone character varying(50),
    address_line_1 character varying(255),
    address_line_2 character varying(255),
    city character varying(100),
    state_province character varying(100),
    postal_code character varying(20),
    country_code character varying(2),
    default_timezone character varying(50) DEFAULT 'UTC'::character varying,
    default_language character varying(10) DEFAULT 'en'::character varying,
    branding_logo_url character varying(512),
    branding_primary_color character varying(7),
    tax_id character varying(100),
    billing_email character varying(255),
    monthly_audio_hours_limit integer,
    max_members integer DEFAULT 10,
    max_sessions_per_month integer,
    is_active boolean DEFAULT true,
    is_verified boolean DEFAULT false,
    verification_requested_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


--
-- Name: prep_checklist; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prep_checklist (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    text text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid NOT NULL,
    CONSTRAINT prep_checklist_status_check CHECK ((status = ANY (ARRAY['open'::text, 'done'::text])))
);


--
-- Name: TABLE prep_checklist; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.prep_checklist IS 'Checklist items for conversation preparation and task management';


--
-- Name: COLUMN prep_checklist.id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.prep_checklist.id IS 'Unique identifier for the checklist item';


--
-- Name: COLUMN prep_checklist.session_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.prep_checklist.session_id IS 'Foreign key to sessions table';


--
-- Name: COLUMN prep_checklist.text; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.prep_checklist.text IS 'The checklist item text/description';


--
-- Name: COLUMN prep_checklist.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.prep_checklist.status IS 'Item status: open or done';


--
-- Name: COLUMN prep_checklist.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.prep_checklist.created_at IS 'Timestamp when item was created';


--
-- Name: COLUMN prep_checklist.updated_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.prep_checklist.updated_at IS 'Timestamp when item was last updated';


--
-- Name: COLUMN prep_checklist.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.prep_checklist.created_by IS 'Foreign key to users table - who created the item';


--
-- Name: recall_ai_webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recall_ai_webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    bot_id uuid NOT NULL,
    event_type text NOT NULL,
    event_data jsonb,
    processed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: report_activity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_activity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid,
    activity_type character varying(50) NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    guest_id text,
    guest_name text,
    CONSTRAINT report_activity_activity_type_check CHECK (((activity_type)::text = ANY ((ARRAY['viewed'::character varying, 'commented'::character varying, 'resolved_comment'::character varying, 'mentioned_user'::character varying, 'task_created'::character varying, 'task_assigned'::character varying, 'task_completed'::character varying, 'task_updated'::character varying, 'report_shared'::character varying, 'bookmark_added'::character varying, 'reaction_added'::character varying])::text[])))
);


--
-- Name: report_bookmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_bookmarks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    section_id character varying(100),
    content_snippet text,
    color character varying(20) DEFAULT 'yellow'::character varying,
    position_data jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT report_bookmarks_color_check CHECK (((color)::text = ANY ((ARRAY['yellow'::character varying, 'green'::character varying, 'blue'::character varying, 'pink'::character varying, 'purple'::character varying])::text[])))
);


--
-- Name: report_collaborators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_collaborators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shared_report_id uuid,
    session_id uuid NOT NULL,
    user_email character varying(255) NOT NULL,
    user_id uuid,
    role character varying(50) DEFAULT 'viewer'::character varying,
    invited_by uuid NOT NULL,
    invited_at timestamp with time zone DEFAULT now(),
    accepted_at timestamp with time zone,
    last_viewed_at timestamp with time zone,
    CONSTRAINT report_collaborators_role_check CHECK (((role)::text = ANY ((ARRAY['viewer'::character varying, 'commenter'::character varying, 'editor'::character varying])::text[])))
);


--
-- Name: report_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid,
    parent_comment_id uuid,
    content text NOT NULL,
    selected_text text,
    section_id character varying(100),
    element_path character varying(255),
    is_resolved boolean DEFAULT false,
    is_edited boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    reactions jsonb DEFAULT '{}'::jsonb,
    guest_id text,
    guest_name text,
    is_guest boolean DEFAULT false,
    CONSTRAINT report_comments_author_check CHECK ((((user_id IS NOT NULL) AND (guest_id IS NULL) AND (is_guest = false)) OR ((user_id IS NULL) AND (guest_id IS NOT NULL) AND (guest_name IS NOT NULL) AND (is_guest = true))))
);


--
-- Name: session_context; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_context (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    text_context text,
    context_metadata jsonb,
    processing_status character varying(20) DEFAULT 'completed'::character varying,
    processing_error text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: session_timeline_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_timeline_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    event_timestamp timestamp with time zone NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    type character varying(50) NOT NULL,
    importance character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    title character varying(255),
    conversation_type character varying(50),
    status character varying(20) DEFAULT 'draft'::character varying,
    selected_template_id uuid,
    audio_file_url character varying(512),
    recording_duration_seconds integer DEFAULT 0,
    recording_started_at timestamp with time zone,
    recording_ended_at timestamp with time zone,
    total_words_spoken integer DEFAULT 0,
    user_talk_time_seconds integer DEFAULT 0,
    silence_periods_count integer DEFAULT 0,
    audio_deleted_at timestamp with time zone,
    data_retention_days integer DEFAULT 30,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    realtime_summary_cache jsonb,
    finalized_at timestamp with time zone,
    participant_me character varying(255),
    participant_them character varying(255),
    meeting_url text,
    meeting_platform text,
    recall_bot_id uuid,
    recall_recording_id uuid,
    transcription_provider text DEFAULT 'deepgram'::text,
    recall_bot_status text,
    recall_bot_error text,
    bot_recording_minutes integer DEFAULT 0,
    bot_billable_amount numeric(10,2) DEFAULT 0.00,
    realtime_summary_last_processed_index integer DEFAULT '-1'::integer,
    recall_sdk_upload_id text,
    recording_type text DEFAULT 'local'::text,
    recall_recording_url text,
    recall_recording_status character varying(50),
    recall_recording_expires_at timestamp with time zone,
    CONSTRAINT sessions_meeting_platform_check CHECK ((meeting_platform = ANY (ARRAY['zoom'::text, 'google_meet'::text, 'teams'::text, 'local'::text, NULL::text]))),
    CONSTRAINT sessions_recording_type_check CHECK ((recording_type = ANY (ARRAY['local'::text, 'meeting'::text, 'desktop'::text]))),
    CONSTRAINT sessions_transcription_provider_check CHECK ((transcription_provider = ANY (ARRAY['deepgram'::text, 'recall_ai'::text, 'hybrid'::text])))
);


--
-- Name: COLUMN sessions.participant_me; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sessions.participant_me IS 'Name of the primary user/speaker (defaults to user full name)';


--
-- Name: COLUMN sessions.participant_them; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sessions.participant_them IS 'Name of the other participant(s) in the conversation';


--
-- Name: COLUMN sessions.realtime_summary_last_processed_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sessions.realtime_summary_last_processed_index IS 'Index of the last transcript message that was processed for the realtime summary. -1 means no summary generated yet.';


--
-- Name: COLUMN sessions.recall_recording_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sessions.recall_recording_url IS 'Direct URL to the Recall.ai recording video file';


--
-- Name: COLUMN sessions.recall_recording_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sessions.recall_recording_status IS 'Status of the recording: processing, done, failed';


--
-- Name: COLUMN sessions.recall_recording_expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.sessions.recall_recording_expires_at IS 'Expiration timestamp for the recording URL';


--
-- Name: shared_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shared_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    share_token character varying(255) NOT NULL,
    shared_tabs text[] DEFAULT '{}'::text[] NOT NULL,
    message text,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    accessed_count integer DEFAULT 0,
    last_accessed_at timestamp with time zone
);


--
-- Name: smart_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.smart_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    category character varying(100) NOT NULL,
    content text NOT NULL,
    importance character varying(20) DEFAULT 'medium'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_manual boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE smart_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.smart_notes IS 'Stores AI-generated and manual notes categorized by type';


--
-- Name: COLUMN smart_notes.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smart_notes.category IS 'Type of note: key_point, action_item, decision, question, insight';


--
-- Name: COLUMN smart_notes.importance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smart_notes.importance IS 'Priority level: high, medium, low';


--
-- Name: COLUMN smart_notes.is_manual; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.smart_notes.is_manual IS 'Whether the note was manually created by user or AI-generated';


--
-- Name: subscription_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid,
    subscription_id uuid,
    event_type text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: summaries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.summaries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    title character varying(255),
    tldr text,
    key_decisions jsonb,
    action_items jsonb,
    follow_up_questions jsonb,
    conversation_highlights jsonb,
    full_transcript text,
    structured_notes text,
    generation_status character varying(20) DEFAULT 'pending'::character varying,
    generation_error text,
    model_used character varying(50),
    generation_time_seconds numeric(6,2),
    export_count integer DEFAULT 0,
    last_exported_at timestamp with time zone,
    is_marked_done boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    memory_json jsonb
);


--
-- Name: system_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    level character varying(10) NOT NULL,
    logger_name character varying(100),
    message text NOT NULL,
    user_id uuid,
    session_id uuid,
    module character varying(100),
    function_name character varying(100),
    line_number integer,
    exception_traceback text,
    request_id character varying(100),
    ip_address inet,
    endpoint character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    organization_id uuid,
    name character varying(255) NOT NULL,
    description text,
    conversation_type character varying(50),
    is_system_template boolean DEFAULT false,
    is_organization_template boolean DEFAULT false,
    is_public boolean DEFAULT false,
    guidance_prompts jsonb,
    context_instructions text,
    summary_template text,
    usage_count integer DEFAULT 0,
    last_used_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone
);


--
-- Name: transcripts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transcripts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    content text NOT NULL,
    speaker character varying(50) DEFAULT 'user'::character varying,
    confidence_score numeric(3,2),
    start_time_seconds numeric(10,3) NOT NULL,
    stt_provider character varying(50),
    is_final boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    client_id character varying(255),
    sequence_number integer DEFAULT 1 NOT NULL,
    is_owner boolean DEFAULT false
);


--
-- Name: COLUMN transcripts.start_time_seconds; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transcripts.start_time_seconds IS 'Time offset in seconds from the start of the recording session';


--
-- Name: COLUMN transcripts.sequence_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transcripts.sequence_number IS 'Sequential order of transcript segments within a session, used for proper ordering';


--
-- Name: COLUMN transcripts.is_owner; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.transcripts.is_owner IS 'Indicates if this transcript line was spoken by the meeting organizer/initiator';


--
-- Name: usage_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    subscription_id uuid,
    session_id uuid,
    usage_type character varying(50) NOT NULL,
    quantity numeric(10,3) NOT NULL,
    unit character varying(20) NOT NULL,
    billing_period_start timestamp with time zone,
    billing_period_end timestamp with time zone,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: usage_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    session_id uuid NOT NULL,
    minute_timestamp timestamp with time zone NOT NULL,
    seconds_recorded integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    source text DEFAULT 'browser_recording'::text,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT seconds_recorded_check CHECK (((seconds_recorded >= 0) AND (seconds_recorded <= 60)))
);


--
-- Name: user_app_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_app_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    session_token character varying(255),
    ip_address inet,
    user_agent text,
    country_code character varying(2),
    city character varying(100),
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_activity_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    ended_at timestamp with time zone,
    duration_seconds integer,
    page_views integer DEFAULT 0,
    device_type character varying(20),
    browser character varying(50),
    os character varying(50)
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    email_verified boolean DEFAULT false,
    full_name character varying(255),
    timezone character varying(50) DEFAULT 'UTC'::character varying,
    password_hash character varying(255),
    google_id character varying(255),
    last_login_at timestamp with time zone,
    has_completed_onboarding boolean DEFAULT false,
    has_completed_organization_setup boolean DEFAULT false,
    default_microphone_id character varying(255),
    default_speaker_id character varying(255),
    is_active boolean DEFAULT true,
    is_email_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    current_organization_id uuid,
    personal_context text,
    is_admin boolean DEFAULT false NOT NULL,
    stripe_customer_id character varying(255),
    use_case character varying(50),
    acquisition_source character varying(50),
    onboarding_completed_at timestamp with time zone
);


--
-- Name: COLUMN users.personal_context; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.personal_context IS 'User-defined personal context that will be used across all conversations for personalized AI guidance';


--
-- Name: COLUMN users.is_admin; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.is_admin IS 'Flag to indicate if user has admin privileges';


--
-- Name: user_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_stats AS
 SELECT u.id,
    u.email,
    u.full_name,
    om.organization_id,
    om.role,
    om.total_sessions_count,
    om.total_audio_hours_used,
    om.current_month_minutes_used,
    (COALESCE(om.monthly_audio_hours_limit, o.monthly_audio_hours_limit, 0) * 60) AS monthly_minutes_limit,
    (((om.current_month_minutes_used)::numeric / (NULLIF((COALESCE(om.monthly_audio_hours_limit, o.monthly_audio_hours_limit, 0) * 60), 0))::numeric) * (100)::numeric) AS usage_percentage,
    om.last_session_at,
    u.created_at,
    u.updated_at
   FROM ((public.users u
     LEFT JOIN public.organization_members om ON (((u.id = om.user_id) AND (u.current_organization_id = om.organization_id))))
     LEFT JOIN public.organizations o ON ((om.organization_id = o.id)))
  WHERE (u.deleted_at IS NULL);


--
-- Name: webhook_dead_letter_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_dead_letter_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_webhook_id uuid,
    webhook_type character varying(100) NOT NULL,
    event_type character varying(100) NOT NULL,
    url text NOT NULL,
    payload jsonb NOT NULL,
    retry_count integer NOT NULL,
    errors jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE webhook_dead_letter_queue; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.webhook_dead_letter_queue IS 'Dead letter queue for failed webhooks after max retries';


--
-- Name: webhook_retry_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_retry_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    webhook_type character varying(100) NOT NULL,
    event_type character varying(100) NOT NULL,
    url text NOT NULL,
    payload jsonb NOT NULL,
    retry_count integer DEFAULT 0,
    max_retries integer DEFAULT 3,
    last_error text,
    next_retry_at timestamp with time zone,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT webhook_retry_queue_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'failed'::character varying, 'completed'::character varying])::text[])))
);


--
-- Name: TABLE webhook_retry_queue; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.webhook_retry_queue IS 'Queue for webhook retries with exponential backoff';


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


--
-- Name: messages_2025_06_30; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_06_30 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_07_01; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_07_01 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_07_02; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_07_02 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_07_03; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_07_03 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_07_04; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_07_04 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_07_05; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_07_05 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: messages_2025_07_06; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages_2025_07_06 (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: schema_migrations; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.schema_migrations (
    version text NOT NULL,
    statements text[],
    name text,
    created_by text,
    idempotency_key text
);


--
-- Name: seed_files; Type: TABLE; Schema: supabase_migrations; Owner: -
--

CREATE TABLE supabase_migrations.seed_files (
    path text NOT NULL,
    hash text NOT NULL
);


--
-- Name: messages_2025_06_30; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_06_30 FOR VALUES FROM ('2025-06-30 00:00:00') TO ('2025-07-01 00:00:00');


--
-- Name: messages_2025_07_01; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_07_01 FOR VALUES FROM ('2025-07-01 00:00:00') TO ('2025-07-02 00:00:00');


--
-- Name: messages_2025_07_02; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_07_02 FOR VALUES FROM ('2025-07-02 00:00:00') TO ('2025-07-03 00:00:00');


--
-- Name: messages_2025_07_03; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_07_03 FOR VALUES FROM ('2025-07-03 00:00:00') TO ('2025-07-04 00:00:00');


--
-- Name: messages_2025_07_04; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_07_04 FOR VALUES FROM ('2025-07-04 00:00:00') TO ('2025-07-05 00:00:00');


--
-- Name: messages_2025_07_05; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_07_05 FOR VALUES FROM ('2025-07-05 00:00:00') TO ('2025-07-06 00:00:00');


--
-- Name: messages_2025_07_06; Type: TABLE ATTACH; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages ATTACH PARTITION realtime.messages_2025_07_06 FOR VALUES FROM ('2025-07-06 00:00:00') TO ('2025-07-07 00:00:00');


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: beta_waitlist beta_waitlist_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beta_waitlist
    ADD CONSTRAINT beta_waitlist_email_key UNIQUE (email);


--
-- Name: beta_waitlist beta_waitlist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.beta_waitlist
    ADD CONSTRAINT beta_waitlist_pkey PRIMARY KEY (id);


--
-- Name: bot_recordings bot_recordings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_recordings
    ADD CONSTRAINT bot_recordings_pkey PRIMARY KEY (id);


--
-- Name: bot_recordings bot_recordings_session_id_bot_id_recording_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_recordings
    ADD CONSTRAINT bot_recordings_session_id_bot_id_recording_id_key UNIQUE (session_id, bot_id, recording_id);


--
-- Name: bot_usage_tracking bot_usage_tracking_bot_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_usage_tracking
    ADD CONSTRAINT bot_usage_tracking_bot_id_key UNIQUE (bot_id);


--
-- Name: bot_usage_tracking bot_usage_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_usage_tracking
    ADD CONSTRAINT bot_usage_tracking_pkey PRIMARY KEY (id);


--
-- Name: calendar_auto_join_logs calendar_auto_join_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_auto_join_logs
    ADD CONSTRAINT calendar_auto_join_logs_pkey PRIMARY KEY (id);


--
-- Name: calendar_connections calendar_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_connections
    ADD CONSTRAINT calendar_connections_pkey PRIMARY KEY (id);


--
-- Name: calendar_connections calendar_connections_recall_calendar_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_connections
    ADD CONSTRAINT calendar_connections_recall_calendar_id_key UNIQUE (recall_calendar_id);


--
-- Name: calendar_connections calendar_connections_user_id_provider_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_connections
    ADD CONSTRAINT calendar_connections_user_id_provider_email_key UNIQUE (user_id, provider, email);


--
-- Name: calendar_events calendar_events_calendar_connection_id_external_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_calendar_connection_id_external_event_id_key UNIQUE (calendar_connection_id, external_event_id);


--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: calendar_preferences calendar_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_preferences
    ADD CONSTRAINT calendar_preferences_pkey PRIMARY KEY (id);


--
-- Name: calendar_preferences calendar_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_preferences
    ADD CONSTRAINT calendar_preferences_user_id_key UNIQUE (user_id);


--
-- Name: calendar_webhooks calendar_webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_webhooks
    ADD CONSTRAINT calendar_webhooks_pkey PRIMARY KEY (id);


--
-- Name: collaborative_action_items collaborative_action_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collaborative_action_items
    ADD CONSTRAINT collaborative_action_items_pkey PRIMARY KEY (id);


--
-- Name: comment_mentions comment_mentions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_mentions
    ADD CONSTRAINT comment_mentions_pkey PRIMARY KEY (id);


--
-- Name: conversation_links conversation_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_links
    ADD CONSTRAINT conversation_links_pkey PRIMARY KEY (id);


--
-- Name: conversation_links conversation_links_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_links
    ADD CONSTRAINT conversation_links_unique UNIQUE (session_id, linked_session_id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: guidance guidance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guidance
    ADD CONSTRAINT guidance_pkey PRIMARY KEY (id);


--
-- Name: meeting_metadata meeting_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_metadata
    ADD CONSTRAINT meeting_metadata_pkey PRIMARY KEY (id);


--
-- Name: meeting_notifications meeting_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_notifications
    ADD CONSTRAINT meeting_notifications_pkey PRIMARY KEY (id);


--
-- Name: monthly_usage_cache monthly_usage_cache_organization_id_user_id_month_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_usage_cache
    ADD CONSTRAINT monthly_usage_cache_organization_id_user_id_month_year_key UNIQUE (organization_id, user_id, month_year);


--
-- Name: monthly_usage_cache monthly_usage_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_usage_cache
    ADD CONSTRAINT monthly_usage_cache_pkey PRIMARY KEY (id);


--
-- Name: monthly_usage_cache monthly_usage_cache_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_usage_cache
    ADD CONSTRAINT monthly_usage_cache_unique UNIQUE (organization_id, user_id, month_year);


--
-- Name: organization_invitations organization_invitations_invitation_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invitations
    ADD CONSTRAINT organization_invitations_invitation_token_key UNIQUE (invitation_token);


--
-- Name: organization_invitations organization_invitations_organization_id_email_status_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invitations
    ADD CONSTRAINT organization_invitations_organization_id_email_status_key UNIQUE (organization_id, email, status) DEFERRABLE INITIALLY DEFERRED;


--
-- Name: organization_invitations organization_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invitations
    ADD CONSTRAINT organization_invitations_pkey PRIMARY KEY (id);


--
-- Name: organization_members organization_members_organization_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_user_id_key UNIQUE (organization_id, user_id);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: plans plans_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_name_key UNIQUE (name);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: prep_checklist prep_checklist_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prep_checklist
    ADD CONSTRAINT prep_checklist_pkey PRIMARY KEY (id);


--
-- Name: recall_ai_webhooks recall_ai_webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recall_ai_webhooks
    ADD CONSTRAINT recall_ai_webhooks_pkey PRIMARY KEY (id);


--
-- Name: report_activity report_activity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_activity
    ADD CONSTRAINT report_activity_pkey PRIMARY KEY (id);


--
-- Name: report_bookmarks report_bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_bookmarks
    ADD CONSTRAINT report_bookmarks_pkey PRIMARY KEY (id);


--
-- Name: report_bookmarks report_bookmarks_session_id_user_id_section_id_title_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_bookmarks
    ADD CONSTRAINT report_bookmarks_session_id_user_id_section_id_title_key UNIQUE (session_id, user_id, section_id, title);


--
-- Name: report_collaborators report_collaborators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_collaborators
    ADD CONSTRAINT report_collaborators_pkey PRIMARY KEY (id);


--
-- Name: report_comments report_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_comments
    ADD CONSTRAINT report_comments_pkey PRIMARY KEY (id);


--
-- Name: session_context session_context_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_context
    ADD CONSTRAINT session_context_pkey PRIMARY KEY (id);


--
-- Name: session_timeline_events session_timeline_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_timeline_events
    ADD CONSTRAINT session_timeline_events_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: shared_reports shared_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_reports
    ADD CONSTRAINT shared_reports_pkey PRIMARY KEY (id);


--
-- Name: shared_reports shared_reports_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_reports
    ADD CONSTRAINT shared_reports_share_token_key UNIQUE (share_token);


--
-- Name: smart_notes smart_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smart_notes
    ADD CONSTRAINT smart_notes_pkey PRIMARY KEY (id);


--
-- Name: subscription_events subscription_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_events
    ADD CONSTRAINT subscription_events_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_stripe_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_customer_id_key UNIQUE (stripe_customer_id);


--
-- Name: subscriptions subscriptions_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);


--
-- Name: summaries summaries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.summaries
    ADD CONSTRAINT summaries_pkey PRIMARY KEY (id);


--
-- Name: system_logs system_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: transcripts transcripts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transcripts
    ADD CONSTRAINT transcripts_pkey PRIMARY KEY (id);


--
-- Name: transcripts transcripts_session_sequence_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transcripts
    ADD CONSTRAINT transcripts_session_sequence_unique UNIQUE (session_id, sequence_number);


--
-- Name: session_context unique_session_context; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_context
    ADD CONSTRAINT unique_session_context UNIQUE (session_id);


--
-- Name: usage_records usage_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT usage_records_pkey PRIMARY KEY (id);


--
-- Name: usage_tracking usage_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_tracking
    ADD CONSTRAINT usage_tracking_pkey PRIMARY KEY (id);


--
-- Name: usage_tracking usage_tracking_session_id_minute_timestamp_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_tracking
    ADD CONSTRAINT usage_tracking_session_id_minute_timestamp_key UNIQUE (session_id, minute_timestamp);


--
-- Name: user_app_sessions user_app_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_app_sessions
    ADD CONSTRAINT user_app_sessions_pkey PRIMARY KEY (id);


--
-- Name: user_app_sessions user_app_sessions_session_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_app_sessions
    ADD CONSTRAINT user_app_sessions_session_token_key UNIQUE (session_token);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_google_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_google_id_key UNIQUE (google_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webhook_dead_letter_queue webhook_dead_letter_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_dead_letter_queue
    ADD CONSTRAINT webhook_dead_letter_queue_pkey PRIMARY KEY (id);


--
-- Name: webhook_retry_queue webhook_retry_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_retry_queue
    ADD CONSTRAINT webhook_retry_queue_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_06_30 messages_2025_06_30_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_06_30
    ADD CONSTRAINT messages_2025_06_30_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_07_01 messages_2025_07_01_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_07_01
    ADD CONSTRAINT messages_2025_07_01_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_07_02 messages_2025_07_02_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_07_02
    ADD CONSTRAINT messages_2025_07_02_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_07_03 messages_2025_07_03_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_07_03
    ADD CONSTRAINT messages_2025_07_03_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_07_04 messages_2025_07_04_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_07_04
    ADD CONSTRAINT messages_2025_07_04_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_07_05 messages_2025_07_05_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_07_05
    ADD CONSTRAINT messages_2025_07_05_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: messages_2025_07_06 messages_2025_07_06_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages_2025_07_06
    ADD CONSTRAINT messages_2025_07_06_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_idempotency_key_key; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: seed_files seed_files_pkey; Type: CONSTRAINT; Schema: supabase_migrations; Owner: -
--

ALTER TABLE ONLY supabase_migrations.seed_files
    ADD CONSTRAINT seed_files_pkey PRIMARY KEY (path);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: conversation_links_linked_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX conversation_links_linked_idx ON public.conversation_links USING btree (linked_session_id);


--
-- Name: conversation_links_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX conversation_links_session_idx ON public.conversation_links USING btree (session_id);


--
-- Name: idx_auto_join_logs_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auto_join_logs_event ON public.calendar_auto_join_logs USING btree (calendar_event_id);


--
-- Name: idx_auto_join_logs_user_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auto_join_logs_user_time ON public.calendar_auto_join_logs USING btree (user_id, created_at DESC);


--
-- Name: idx_beta_waitlist_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beta_waitlist_created_at ON public.beta_waitlist USING btree (created_at);


--
-- Name: idx_beta_waitlist_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beta_waitlist_email ON public.beta_waitlist USING btree (email);


--
-- Name: idx_beta_waitlist_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_beta_waitlist_status ON public.beta_waitlist USING btree (status);


--
-- Name: idx_bot_recordings_bot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_recordings_bot_id ON public.bot_recordings USING btree (bot_id);


--
-- Name: idx_bot_recordings_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_recordings_session_id ON public.bot_recordings USING btree (session_id);


--
-- Name: idx_bot_recordings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_recordings_status ON public.bot_recordings USING btree (recording_status);


--
-- Name: idx_bot_usage_tracking_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_usage_tracking_created_at ON public.bot_usage_tracking USING btree (created_at);


--
-- Name: idx_bot_usage_tracking_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_usage_tracking_org_id ON public.bot_usage_tracking USING btree (organization_id);


--
-- Name: idx_bot_usage_tracking_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_usage_tracking_session_id ON public.bot_usage_tracking USING btree (session_id);


--
-- Name: idx_bot_usage_tracking_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_usage_tracking_status ON public.bot_usage_tracking USING btree (status);


--
-- Name: idx_bot_usage_tracking_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_usage_tracking_user_id ON public.bot_usage_tracking USING btree (user_id);


--
-- Name: idx_calendar_connections_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_connections_organization_id ON public.calendar_connections USING btree (organization_id);


--
-- Name: idx_calendar_connections_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_connections_user_id ON public.calendar_connections USING btree (user_id);


--
-- Name: idx_calendar_events_auto_join; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_events_auto_join ON public.calendar_events USING btree (calendar_connection_id, start_time, auto_session_created) WHERE (meeting_url IS NOT NULL);


--
-- Name: idx_calendar_events_connection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_events_connection_id ON public.calendar_events USING btree (calendar_connection_id);


--
-- Name: idx_calendar_events_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_events_session_id ON public.calendar_events USING btree (session_id);


--
-- Name: idx_calendar_events_start_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_events_start_time ON public.calendar_events USING btree (start_time);


--
-- Name: idx_calendar_webhooks_connection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_webhooks_connection_id ON public.calendar_webhooks USING btree (calendar_connection_id);


--
-- Name: idx_calendar_webhooks_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_webhooks_created_at ON public.calendar_webhooks USING btree (created_at);


--
-- Name: idx_collaborative_action_items_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collaborative_action_items_assigned_to ON public.collaborative_action_items USING btree (assigned_to);


--
-- Name: idx_collaborative_action_items_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collaborative_action_items_due_date ON public.collaborative_action_items USING btree (due_date);


--
-- Name: idx_collaborative_action_items_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collaborative_action_items_session_id ON public.collaborative_action_items USING btree (session_id);


--
-- Name: idx_collaborative_action_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collaborative_action_items_status ON public.collaborative_action_items USING btree (status);


--
-- Name: idx_comment_mentions_is_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_mentions_is_read ON public.comment_mentions USING btree (is_read);


--
-- Name: idx_comment_mentions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_mentions_user_id ON public.comment_mentions USING btree (mentioned_user_id);


--
-- Name: idx_documents_file_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_file_type ON public.documents USING btree (file_type);


--
-- Name: idx_documents_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_organization_id ON public.documents USING btree (organization_id);


--
-- Name: idx_documents_processing_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_processing_status ON public.documents USING btree (processing_status);


--
-- Name: idx_documents_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_session_id ON public.documents USING btree (session_id);


--
-- Name: idx_documents_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_user_id ON public.documents USING btree (user_id);


--
-- Name: idx_guidance_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guidance_session_id ON public.guidance USING btree (session_id);


--
-- Name: idx_guidance_triggered_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guidance_triggered_at ON public.guidance USING btree (triggered_at_seconds);


--
-- Name: idx_guidance_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guidance_type ON public.guidance USING btree (guidance_type);


--
-- Name: idx_guidance_was_displayed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_guidance_was_displayed ON public.guidance USING btree (was_displayed);


--
-- Name: idx_meeting_metadata_platform; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_metadata_platform ON public.meeting_metadata USING btree (platform);


--
-- Name: idx_meeting_metadata_scheduled_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_metadata_scheduled_at ON public.meeting_metadata USING btree (scheduled_at);


--
-- Name: idx_meeting_metadata_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_metadata_session_id ON public.meeting_metadata USING btree (session_id);


--
-- Name: idx_meeting_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_notifications_user_unread ON public.meeting_notifications USING btree (user_id, read, created_at DESC);


--
-- Name: idx_monthly_usage_cache_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_monthly_usage_cache_lookup ON public.monthly_usage_cache USING btree (organization_id, user_id, month_year);


--
-- Name: idx_organization_invitations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organization_invitations_email ON public.organization_invitations USING btree (email);


--
-- Name: idx_organization_invitations_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organization_invitations_expires_at ON public.organization_invitations USING btree (expires_at);


--
-- Name: idx_organization_invitations_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organization_invitations_org_id ON public.organization_invitations USING btree (organization_id);


--
-- Name: idx_organization_invitations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organization_invitations_status ON public.organization_invitations USING btree (status);


--
-- Name: idx_organization_invitations_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organization_invitations_token ON public.organization_invitations USING btree (invitation_token);


--
-- Name: idx_organization_members_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organization_members_org_id ON public.organization_members USING btree (organization_id);


--
-- Name: idx_organization_members_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organization_members_role ON public.organization_members USING btree (role);


--
-- Name: idx_organization_members_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organization_members_status ON public.organization_members USING btree (status);


--
-- Name: idx_organization_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organization_members_user_id ON public.organization_members USING btree (user_id);


--
-- Name: idx_organizations_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_created_at ON public.organizations USING btree (created_at);


--
-- Name: idx_organizations_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_is_active ON public.organizations USING btree (is_active);


--
-- Name: idx_organizations_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizations_slug ON public.organizations USING btree (slug);


--
-- Name: idx_plans_bot_minutes; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_bot_minutes ON public.plans USING btree (monthly_bot_minutes_limit) WHERE (monthly_bot_minutes_limit IS NOT NULL);


--
-- Name: idx_plans_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_is_active ON public.plans USING btree (is_active);


--
-- Name: idx_plans_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_name ON public.plans USING btree (name);


--
-- Name: idx_plans_sort_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_sort_order ON public.plans USING btree (sort_order);


--
-- Name: idx_plans_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_plans_type ON public.plans USING btree (plan_type);


--
-- Name: idx_prep_checklist_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prep_checklist_created_at ON public.prep_checklist USING btree (created_at);


--
-- Name: idx_prep_checklist_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prep_checklist_created_by ON public.prep_checklist USING btree (created_by);


--
-- Name: idx_prep_checklist_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prep_checklist_session_id ON public.prep_checklist USING btree (session_id);


--
-- Name: idx_prep_checklist_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prep_checklist_status ON public.prep_checklist USING btree (status);


--
-- Name: idx_recall_ai_webhooks_processed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recall_ai_webhooks_processed ON public.recall_ai_webhooks USING btree (processed);


--
-- Name: idx_recall_ai_webhooks_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recall_ai_webhooks_session_id ON public.recall_ai_webhooks USING btree (session_id);


--
-- Name: idx_recall_webhooks_processed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recall_webhooks_processed ON public.recall_ai_webhooks USING btree (processed);


--
-- Name: idx_recall_webhooks_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recall_webhooks_session_id ON public.recall_ai_webhooks USING btree (session_id);


--
-- Name: idx_report_activity_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_activity_created_at ON public.report_activity USING btree (created_at DESC);


--
-- Name: idx_report_activity_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_activity_session_id ON public.report_activity USING btree (session_id);


--
-- Name: idx_report_activity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_activity_type ON public.report_activity USING btree (activity_type);


--
-- Name: idx_report_activity_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_activity_user_id ON public.report_activity USING btree (user_id);


--
-- Name: idx_report_bookmarks_session_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_bookmarks_session_user ON public.report_bookmarks USING btree (session_id, user_id);


--
-- Name: idx_report_collaborators_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_collaborators_session_id ON public.report_collaborators USING btree (session_id);


--
-- Name: idx_report_collaborators_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_report_collaborators_unique ON public.report_collaborators USING btree (session_id, user_email);


--
-- Name: idx_report_collaborators_user_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_collaborators_user_email ON public.report_collaborators USING btree (user_email);


--
-- Name: idx_report_comments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_comments_created_at ON public.report_comments USING btree (created_at DESC);


--
-- Name: idx_report_comments_guest_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_comments_guest_id ON public.report_comments USING btree (guest_id) WHERE (guest_id IS NOT NULL);


--
-- Name: idx_report_comments_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_comments_parent_id ON public.report_comments USING btree (parent_comment_id);


--
-- Name: idx_report_comments_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_comments_session_id ON public.report_comments USING btree (session_id);


--
-- Name: idx_report_comments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_report_comments_user_id ON public.report_comments USING btree (user_id);


--
-- Name: idx_session_context_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_context_organization_id ON public.session_context USING btree (organization_id);


--
-- Name: idx_session_context_processing_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_context_processing_status ON public.session_context USING btree (processing_status);


--
-- Name: idx_session_context_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_context_session_id ON public.session_context USING btree (session_id);


--
-- Name: idx_session_context_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_context_user_id ON public.session_context USING btree (user_id);


--
-- Name: idx_session_timeline_events_event_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_timeline_events_event_timestamp ON public.session_timeline_events USING btree (event_timestamp DESC);


--
-- Name: idx_session_timeline_events_importance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_timeline_events_importance ON public.session_timeline_events USING btree (importance);


--
-- Name: idx_session_timeline_events_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_timeline_events_session_id ON public.session_timeline_events USING btree (session_id);


--
-- Name: idx_session_timeline_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_session_timeline_events_type ON public.session_timeline_events USING btree (type);


--
-- Name: idx_sessions_conversation_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_conversation_type ON public.sessions USING btree (conversation_type);


--
-- Name: idx_sessions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_created_at ON public.sessions USING btree (created_at);


--
-- Name: idx_sessions_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_organization_id ON public.sessions USING btree (organization_id);


--
-- Name: idx_sessions_recall_bot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_recall_bot_id ON public.sessions USING btree (recall_bot_id);


--
-- Name: idx_sessions_recall_recording_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_recall_recording_id ON public.sessions USING btree (recall_recording_id);


--
-- Name: idx_sessions_recall_sdk_upload_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_recall_sdk_upload_id ON public.sessions USING btree (recall_sdk_upload_id);


--
-- Name: idx_sessions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_status ON public.sessions USING btree (status);


--
-- Name: idx_sessions_summary_processed_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_summary_processed_index ON public.sessions USING btree (realtime_summary_last_processed_index);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- Name: idx_shared_reports_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shared_reports_expires_at ON public.shared_reports USING btree (expires_at);


--
-- Name: idx_shared_reports_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shared_reports_session_id ON public.shared_reports USING btree (session_id);


--
-- Name: idx_shared_reports_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shared_reports_token ON public.shared_reports USING btree (share_token);


--
-- Name: idx_shared_reports_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shared_reports_user_id ON public.shared_reports USING btree (user_id);


--
-- Name: idx_smart_notes_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_smart_notes_category ON public.smart_notes USING btree (category);


--
-- Name: idx_smart_notes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_smart_notes_created_at ON public.smart_notes USING btree (created_at DESC);


--
-- Name: idx_smart_notes_importance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_smart_notes_importance ON public.smart_notes USING btree (importance);


--
-- Name: idx_smart_notes_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_smart_notes_session_id ON public.smart_notes USING btree (session_id);


--
-- Name: idx_subscription_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_events_created_at ON public.subscription_events USING btree (created_at);


--
-- Name: idx_subscription_events_subscription_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_events_subscription_id ON public.subscription_events USING btree (subscription_id);


--
-- Name: idx_subscription_events_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_events_user_id ON public.subscription_events USING btree (user_id);


--
-- Name: idx_subscriptions_current_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_current_period ON public.subscriptions USING btree (current_period_start, current_period_end);


--
-- Name: idx_subscriptions_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_organization_id ON public.subscriptions USING btree (organization_id);


--
-- Name: idx_subscriptions_plan_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_plan_id ON public.subscriptions USING btree (plan_id);


--
-- Name: idx_subscriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);


--
-- Name: idx_subscriptions_stripe_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions USING btree (stripe_customer_id);


--
-- Name: idx_subscriptions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);


--
-- Name: idx_subscriptions_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscriptions_user_status ON public.subscriptions USING btree (user_id, status);


--
-- Name: idx_summaries_marked_done; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_summaries_marked_done ON public.summaries USING btree (is_marked_done);


--
-- Name: idx_summaries_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_summaries_organization_id ON public.summaries USING btree (organization_id);


--
-- Name: idx_summaries_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_summaries_session_id ON public.summaries USING btree (session_id);


--
-- Name: idx_summaries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_summaries_status ON public.summaries USING btree (generation_status);


--
-- Name: idx_summaries_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_summaries_user_id ON public.summaries USING btree (user_id);


--
-- Name: idx_system_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_logs_created_at ON public.system_logs USING btree (created_at);


--
-- Name: idx_system_logs_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_logs_level ON public.system_logs USING btree (level);


--
-- Name: idx_system_logs_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_logs_session_id ON public.system_logs USING btree (session_id);


--
-- Name: idx_system_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_logs_user_id ON public.system_logs USING btree (user_id);


--
-- Name: idx_templates_conversation_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_conversation_type ON public.templates USING btree (conversation_type);


--
-- Name: idx_templates_is_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_is_organization ON public.templates USING btree (is_organization_template);


--
-- Name: idx_templates_is_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_is_public ON public.templates USING btree (is_public);


--
-- Name: idx_templates_is_system; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_is_system ON public.templates USING btree (is_system_template);


--
-- Name: idx_templates_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_organization_id ON public.templates USING btree (organization_id);


--
-- Name: idx_templates_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_user_id ON public.templates USING btree (user_id);


--
-- Name: idx_transcripts_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transcripts_client_id ON public.transcripts USING btree (client_id);


--
-- Name: idx_transcripts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transcripts_created_at ON public.transcripts USING btree (created_at);


--
-- Name: idx_transcripts_is_final; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transcripts_is_final ON public.transcripts USING btree (is_final);


--
-- Name: idx_transcripts_is_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transcripts_is_owner ON public.transcripts USING btree (is_owner) WHERE (is_owner = true);


--
-- Name: idx_transcripts_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transcripts_sequence ON public.transcripts USING btree (session_id, sequence_number);


--
-- Name: idx_transcripts_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transcripts_session_id ON public.transcripts USING btree (session_id);


--
-- Name: idx_transcripts_session_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transcripts_session_sequence ON public.transcripts USING btree (session_id, sequence_number);


--
-- Name: idx_transcripts_start_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transcripts_start_time ON public.transcripts USING btree (start_time_seconds);


--
-- Name: idx_usage_records_billing_period; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_records_billing_period ON public.usage_records USING btree (billing_period_start, billing_period_end);


--
-- Name: idx_usage_records_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_records_organization_id ON public.usage_records USING btree (organization_id);


--
-- Name: idx_usage_records_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_records_session_id ON public.usage_records USING btree (session_id);


--
-- Name: idx_usage_records_subscription_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_records_subscription_id ON public.usage_records USING btree (subscription_id);


--
-- Name: idx_usage_records_usage_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_records_usage_type ON public.usage_records USING btree (usage_type);


--
-- Name: idx_usage_records_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_records_user_id ON public.usage_records USING btree (user_id);


--
-- Name: idx_usage_tracking_org_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_tracking_org_month ON public.usage_tracking USING btree (organization_id, minute_timestamp);


--
-- Name: idx_usage_tracking_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_tracking_session ON public.usage_tracking USING btree (session_id);


--
-- Name: idx_usage_tracking_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_tracking_source ON public.usage_tracking USING btree (source);


--
-- Name: idx_usage_tracking_user_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_tracking_user_month ON public.usage_tracking USING btree (user_id, minute_timestamp);


--
-- Name: idx_user_app_sessions_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_app_sessions_started_at ON public.user_app_sessions USING btree (started_at);


--
-- Name: idx_user_app_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_app_sessions_user_id ON public.user_app_sessions USING btree (user_id);


--
-- Name: idx_users_acquisition_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_acquisition_source ON public.users USING btree (acquisition_source);


--
-- Name: idx_users_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_created_at ON public.users USING btree (created_at);


--
-- Name: idx_users_current_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_current_organization ON public.users USING btree (current_organization_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_google_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_google_id ON public.users USING btree (google_id);


--
-- Name: idx_users_is_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_is_admin ON public.users USING btree (is_admin) WHERE (is_admin = true);


--
-- Name: idx_users_use_case; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_use_case ON public.users USING btree (use_case);


--
-- Name: idx_webhook_retry_queue_next_retry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_retry_queue_next_retry ON public.webhook_retry_queue USING btree (next_retry_at) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_webhook_retry_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_retry_queue_status ON public.webhook_retry_queue USING btree (status);


--
-- Name: unique_session_sequence; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_session_sequence ON public.transcripts USING btree (session_id, sequence_number);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: subscription_subscription_id_entity_filters_key; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: messages_2025_06_30_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_06_30_pkey;


--
-- Name: messages_2025_07_01_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_07_01_pkey;


--
-- Name: messages_2025_07_02_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_07_02_pkey;


--
-- Name: messages_2025_07_03_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_07_03_pkey;


--
-- Name: messages_2025_07_04_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_07_04_pkey;


--
-- Name: messages_2025_07_05_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_07_05_pkey;


--
-- Name: messages_2025_07_06_pkey; Type: INDEX ATTACH; Schema: realtime; Owner: -
--

ALTER INDEX realtime.messages_pkey ATTACH PARTITION realtime.messages_2025_07_06_pkey;


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


--
-- Name: bot_usage_tracking auto_calculate_bot_usage; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auto_calculate_bot_usage BEFORE INSERT OR UPDATE ON public.bot_usage_tracking FOR EACH ROW EXECUTE FUNCTION public.calculate_bot_usage_metrics();


--
-- Name: subscriptions cancel_old_subscriptions_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER cancel_old_subscriptions_trigger AFTER INSERT OR UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.cancel_old_subscriptions();


--
-- Name: organization_members enforce_single_owner_org; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER enforce_single_owner_org BEFORE INSERT OR UPDATE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.check_single_owner_org_per_user();


--
-- Name: subscriptions handle_subscription_renewal_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER handle_subscription_renewal_trigger AFTER UPDATE ON public.subscriptions FOR EACH ROW WHEN ((old.current_period_start IS DISTINCT FROM new.current_period_start)) EXECUTE FUNCTION public.handle_subscription_renewal();


--
-- Name: subscriptions sync_subscription_limits_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_subscription_limits_trigger AFTER INSERT OR UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.sync_subscription_limits();


--
-- Name: transcripts transcript_sequence_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER transcript_sequence_trigger BEFORE INSERT ON public.transcripts FOR EACH ROW EXECUTE FUNCTION public.set_transcript_sequence_number();


--
-- Name: report_comments trigger_log_comment_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_log_comment_activity AFTER INSERT ON public.report_comments FOR EACH ROW EXECUTE FUNCTION public.log_comment_activity();


--
-- Name: collaborative_action_items trigger_log_task_activity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_log_task_activity AFTER INSERT OR UPDATE ON public.collaborative_action_items FOR EACH ROW EXECUTE FUNCTION public.log_task_activity();


--
-- Name: beta_waitlist update_beta_waitlist_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_beta_waitlist_updated_at BEFORE UPDATE ON public.beta_waitlist FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bot_recordings update_bot_recordings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bot_recordings_updated_at BEFORE UPDATE ON public.bot_recordings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bot_usage_tracking update_bot_usage_tracking_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bot_usage_tracking_updated_at BEFORE UPDATE ON public.bot_usage_tracking FOR EACH ROW EXECUTE FUNCTION public.update_bot_usage_tracking_updated_at();


--
-- Name: bot_usage_tracking update_cache_on_bot_usage; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cache_on_bot_usage AFTER INSERT OR UPDATE ON public.bot_usage_tracking FOR EACH ROW WHEN ((new.status = 'completed'::text)) EXECUTE FUNCTION public.update_monthly_usage_cache();


--
-- Name: calendar_connections update_calendar_connections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_calendar_connections_updated_at BEFORE UPDATE ON public.calendar_connections FOR EACH ROW EXECUTE FUNCTION public.update_calendar_updated_at();


--
-- Name: calendar_events update_calendar_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_calendar_updated_at();


--
-- Name: calendar_preferences update_calendar_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_calendar_preferences_updated_at BEFORE UPDATE ON public.calendar_preferences FOR EACH ROW EXECUTE FUNCTION public.update_calendar_updated_at();


--
-- Name: collaborative_action_items update_collaborative_action_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_collaborative_action_items_updated_at BEFORE UPDATE ON public.collaborative_action_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: documents update_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: guidance update_guidance_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_guidance_updated_at BEFORE UPDATE ON public.guidance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: meeting_metadata update_meeting_metadata_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_meeting_metadata_updated_at BEFORE UPDATE ON public.meeting_metadata FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: organization_invitations update_organization_invitations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_organization_invitations_updated_at BEFORE UPDATE ON public.organization_invitations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: organization_members update_organization_members_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON public.organization_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: organizations update_organizations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: plans update_plans_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: prep_checklist update_prep_checklist_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_prep_checklist_updated_at BEFORE UPDATE ON public.prep_checklist FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: report_comments update_report_comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_report_comments_updated_at BEFORE UPDATE ON public.report_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: session_context update_session_context_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_session_context_updated_at BEFORE UPDATE ON public.session_context FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sessions update_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: smart_notes update_smart_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_smart_notes_updated_at BEFORE UPDATE ON public.smart_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscriptions update_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: summaries update_summaries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_summaries_updated_at BEFORE UPDATE ON public.summaries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: templates update_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: transcripts update_transcripts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_transcripts_updated_at BEFORE UPDATE ON public.transcripts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: usage_tracking update_usage_stats_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_usage_stats_trigger AFTER INSERT ON public.usage_tracking FOR EACH ROW EXECUTE FUNCTION public.update_member_usage();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: bot_recordings bot_recordings_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_recordings
    ADD CONSTRAINT bot_recordings_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: bot_usage_tracking bot_usage_tracking_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_usage_tracking
    ADD CONSTRAINT bot_usage_tracking_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: bot_usage_tracking bot_usage_tracking_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_usage_tracking
    ADD CONSTRAINT bot_usage_tracking_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: bot_usage_tracking bot_usage_tracking_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_usage_tracking
    ADD CONSTRAINT bot_usage_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: calendar_auto_join_logs calendar_auto_join_logs_calendar_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_auto_join_logs
    ADD CONSTRAINT calendar_auto_join_logs_calendar_event_id_fkey FOREIGN KEY (calendar_event_id) REFERENCES public.calendar_events(id) ON DELETE CASCADE;


--
-- Name: calendar_auto_join_logs calendar_auto_join_logs_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_auto_join_logs
    ADD CONSTRAINT calendar_auto_join_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;


--
-- Name: calendar_auto_join_logs calendar_auto_join_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_auto_join_logs
    ADD CONSTRAINT calendar_auto_join_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: calendar_connections calendar_connections_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_connections
    ADD CONSTRAINT calendar_connections_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: calendar_connections calendar_connections_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_connections
    ADD CONSTRAINT calendar_connections_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: calendar_events calendar_events_auto_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_auto_session_id_fkey FOREIGN KEY (auto_session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;


--
-- Name: calendar_events calendar_events_calendar_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_calendar_connection_id_fkey FOREIGN KEY (calendar_connection_id) REFERENCES public.calendar_connections(id) ON DELETE CASCADE;


--
-- Name: calendar_events calendar_events_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id);


--
-- Name: calendar_preferences calendar_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_preferences
    ADD CONSTRAINT calendar_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: calendar_webhooks calendar_webhooks_calendar_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_webhooks
    ADD CONSTRAINT calendar_webhooks_calendar_connection_id_fkey FOREIGN KEY (calendar_connection_id) REFERENCES public.calendar_connections(id) ON DELETE CASCADE;


--
-- Name: collaborative_action_items collaborative_action_items_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collaborative_action_items
    ADD CONSTRAINT collaborative_action_items_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: collaborative_action_items collaborative_action_items_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collaborative_action_items
    ADD CONSTRAINT collaborative_action_items_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES public.users(id);


--
-- Name: collaborative_action_items collaborative_action_items_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collaborative_action_items
    ADD CONSTRAINT collaborative_action_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: collaborative_action_items collaborative_action_items_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collaborative_action_items
    ADD CONSTRAINT collaborative_action_items_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: comment_mentions comment_mentions_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_mentions
    ADD CONSTRAINT comment_mentions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.report_comments(id) ON DELETE CASCADE;


--
-- Name: comment_mentions comment_mentions_mentioned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_mentions
    ADD CONSTRAINT comment_mentions_mentioned_user_id_fkey FOREIGN KEY (mentioned_user_id) REFERENCES public.users(id);


--
-- Name: conversation_links conversation_links_linked_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_links
    ADD CONSTRAINT conversation_links_linked_session_id_fkey FOREIGN KEY (linked_session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: conversation_links conversation_links_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_links
    ADD CONSTRAINT conversation_links_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: documents documents_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: documents documents_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: documents documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: prep_checklist fk_prep_checklist_created_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prep_checklist
    ADD CONSTRAINT fk_prep_checklist_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: prep_checklist fk_prep_checklist_session_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prep_checklist
    ADD CONSTRAINT fk_prep_checklist_session_id FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: guidance guidance_prompt_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guidance
    ADD CONSTRAINT guidance_prompt_template_id_fkey FOREIGN KEY (prompt_template_id) REFERENCES public.templates(id);


--
-- Name: guidance guidance_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guidance
    ADD CONSTRAINT guidance_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: guidance guidance_triggered_by_transcript_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.guidance
    ADD CONSTRAINT guidance_triggered_by_transcript_id_fkey FOREIGN KEY (triggered_by_transcript_id) REFERENCES public.transcripts(id);


--
-- Name: meeting_metadata meeting_metadata_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_metadata
    ADD CONSTRAINT meeting_metadata_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: meeting_notifications meeting_notifications_calendar_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_notifications
    ADD CONSTRAINT meeting_notifications_calendar_event_id_fkey FOREIGN KEY (calendar_event_id) REFERENCES public.calendar_events(id) ON DELETE SET NULL;


--
-- Name: meeting_notifications meeting_notifications_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_notifications
    ADD CONSTRAINT meeting_notifications_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;


--
-- Name: meeting_notifications meeting_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_notifications
    ADD CONSTRAINT meeting_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: monthly_usage_cache monthly_usage_cache_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_usage_cache
    ADD CONSTRAINT monthly_usage_cache_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: monthly_usage_cache monthly_usage_cache_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.monthly_usage_cache
    ADD CONSTRAINT monthly_usage_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: organization_invitations organization_invitations_accepted_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invitations
    ADD CONSTRAINT organization_invitations_accepted_by_user_id_fkey FOREIGN KEY (accepted_by_user_id) REFERENCES public.users(id);


--
-- Name: organization_invitations organization_invitations_invited_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invitations
    ADD CONSTRAINT organization_invitations_invited_by_user_id_fkey FOREIGN KEY (invited_by_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: organization_invitations organization_invitations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_invitations
    ADD CONSTRAINT organization_invitations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: recall_ai_webhooks recall_ai_webhooks_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recall_ai_webhooks
    ADD CONSTRAINT recall_ai_webhooks_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: report_activity report_activity_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_activity
    ADD CONSTRAINT report_activity_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: report_activity report_activity_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_activity
    ADD CONSTRAINT report_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: report_bookmarks report_bookmarks_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_bookmarks
    ADD CONSTRAINT report_bookmarks_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: report_bookmarks report_bookmarks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_bookmarks
    ADD CONSTRAINT report_bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: report_collaborators report_collaborators_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_collaborators
    ADD CONSTRAINT report_collaborators_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);


--
-- Name: report_collaborators report_collaborators_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_collaborators
    ADD CONSTRAINT report_collaborators_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: report_collaborators report_collaborators_shared_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_collaborators
    ADD CONSTRAINT report_collaborators_shared_report_id_fkey FOREIGN KEY (shared_report_id) REFERENCES public.shared_reports(id) ON DELETE CASCADE;


--
-- Name: report_collaborators report_collaborators_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_collaborators
    ADD CONSTRAINT report_collaborators_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: report_comments report_comments_parent_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_comments
    ADD CONSTRAINT report_comments_parent_comment_id_fkey FOREIGN KEY (parent_comment_id) REFERENCES public.report_comments(id) ON DELETE CASCADE;


--
-- Name: report_comments report_comments_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_comments
    ADD CONSTRAINT report_comments_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: report_comments report_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_comments
    ADD CONSTRAINT report_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: session_context session_context_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_context
    ADD CONSTRAINT session_context_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: session_context session_context_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_context
    ADD CONSTRAINT session_context_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: session_context session_context_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_context
    ADD CONSTRAINT session_context_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: session_timeline_events session_timeline_events_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_timeline_events
    ADD CONSTRAINT session_timeline_events_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_selected_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_selected_template_id_fkey FOREIGN KEY (selected_template_id) REFERENCES public.templates(id);


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: shared_reports shared_reports_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_reports
    ADD CONSTRAINT shared_reports_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: shared_reports shared_reports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_reports
    ADD CONSTRAINT shared_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: smart_notes smart_notes_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smart_notes
    ADD CONSTRAINT smart_notes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: smart_notes smart_notes_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smart_notes
    ADD CONSTRAINT smart_notes_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: smart_notes smart_notes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smart_notes
    ADD CONSTRAINT smart_notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: subscription_events subscription_events_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_events
    ADD CONSTRAINT subscription_events_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: subscription_events subscription_events_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_events
    ADD CONSTRAINT subscription_events_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;


--
-- Name: subscription_events subscription_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_events
    ADD CONSTRAINT subscription_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: summaries summaries_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.summaries
    ADD CONSTRAINT summaries_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: summaries summaries_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.summaries
    ADD CONSTRAINT summaries_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: summaries summaries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.summaries
    ADD CONSTRAINT summaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: system_logs system_logs_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;


--
-- Name: system_logs system_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_logs
    ADD CONSTRAINT system_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: templates templates_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: templates templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: transcripts transcripts_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transcripts
    ADD CONSTRAINT transcripts_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: usage_records usage_records_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT usage_records_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: usage_records usage_records_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT usage_records_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;


--
-- Name: usage_records usage_records_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT usage_records_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;


--
-- Name: usage_records usage_records_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT usage_records_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: usage_tracking usage_tracking_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_tracking
    ADD CONSTRAINT usage_tracking_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: usage_tracking usage_tracking_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_tracking
    ADD CONSTRAINT usage_tracking_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: usage_tracking usage_tracking_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_tracking
    ADD CONSTRAINT usage_tracking_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_app_sessions user_app_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_app_sessions
    ADD CONSTRAINT user_app_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_current_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_current_organization_id_fkey FOREIGN KEY (current_organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: webhook_dead_letter_queue webhook_dead_letter_queue_original_webhook_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_dead_letter_queue
    ADD CONSTRAINT webhook_dead_letter_queue_original_webhook_id_fkey FOREIGN KEY (original_webhook_id) REFERENCES public.webhook_retry_queue(id);


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: report_activity Activity inserted by authenticated users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Activity inserted by authenticated users" ON public.report_activity FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: system_settings Admin upsert system settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin upsert system settings" ON public.system_settings USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.is_admin = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.is_admin = true)))));


--
-- Name: system_logs Admins can delete system logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete system logs" ON public.system_logs FOR DELETE USING (public.is_admin());


--
-- Name: system_settings Admins can delete system settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete system settings" ON public.system_settings FOR DELETE USING (public.is_admin());


--
-- Name: system_settings Admins can insert system settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert system settings" ON public.system_settings FOR INSERT WITH CHECK (public.is_admin());


--
-- Name: system_settings Admins can update system settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update system settings" ON public.system_settings FOR UPDATE USING (public.is_admin());


--
-- Name: system_logs Admins can view system logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view system logs" ON public.system_logs FOR SELECT USING (public.is_admin());


--
-- Name: beta_waitlist Allow authenticated users to read waitlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to read waitlist" ON public.beta_waitlist FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: beta_waitlist Allow authenticated users to update waitlist; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow authenticated users to update waitlist" ON public.beta_waitlist FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: beta_waitlist Allow public to insert waitlist entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public to insert waitlist entries" ON public.beta_waitlist FOR INSERT WITH CHECK (true);


--
-- Name: system_settings Anyone can read system settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read system settings" ON public.system_settings FOR SELECT USING (true);


--
-- Name: plans Anyone can view plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view plans" ON public.plans FOR SELECT USING (true);


--
-- Name: plans Authenticated users can view plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view plans" ON public.plans FOR SELECT USING ((auth.uid() IS NOT NULL));


--
-- Name: report_collaborators Collaborators can view their records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Collaborators can view their records" ON public.report_collaborators FOR SELECT USING (((user_id = auth.uid()) OR ((user_email)::text = (( SELECT users.email
   FROM auth.users
  WHERE (users.id = auth.uid())))::text)));


--
-- Name: subscriptions Organization members can view subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Organization members can view subscription" ON public.subscriptions FOR SELECT USING (((user_id = auth.uid()) OR (organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND ((organization_members.status)::text = 'active'::text))))));


--
-- Name: organization_invitations Owners can create invitations for their organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can create invitations for their organizations" ON public.organization_invitations FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.organization_members
  WHERE ((organization_members.organization_id = organization_invitations.organization_id) AND (organization_members.user_id = auth.uid()) AND ((organization_members.role)::text = 'owner'::text)))));


--
-- Name: organization_invitations Owners can delete invitations for their organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can delete invitations for their organizations" ON public.organization_invitations FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.organization_members
  WHERE ((organization_members.organization_id = organization_invitations.organization_id) AND (organization_members.user_id = auth.uid()) AND ((organization_members.role)::text = 'owner'::text)))));


--
-- Name: organizations Owners can delete their organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can delete their organizations" ON public.organizations FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.organization_members
  WHERE ((organization_members.organization_id = organizations.id) AND (organization_members.user_id = auth.uid()) AND ((organization_members.role)::text = 'owner'::text)))));


--
-- Name: organization_invitations Owners can update invitations for their organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can update invitations for their organizations" ON public.organization_invitations FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.organization_members
  WHERE ((organization_members.organization_id = organization_invitations.organization_id) AND (organization_members.user_id = auth.uid()) AND ((organization_members.role)::text = 'owner'::text)))));


--
-- Name: organizations Owners can update their organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can update their organizations" ON public.organizations FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.organization_members
  WHERE ((organization_members.organization_id = organizations.id) AND (organization_members.user_id = auth.uid()) AND ((organization_members.role)::text = 'owner'::text)))));


--
-- Name: system_settings Read system settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Read system settings" ON public.system_settings FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: bot_recordings Service role can manage all recordings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage all recordings" ON public.bot_recordings USING ((auth.role() = 'service_role'::text)) WITH CHECK ((auth.role() = 'service_role'::text));


--
-- Name: calendar_events Service role can manage calendar events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage calendar events" ON public.calendar_events USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: subscription_events Service role can manage subscription events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage subscription events" ON public.subscription_events TO service_role USING (true) WITH CHECK (true);


--
-- Name: calendar_webhooks Service role can manage webhooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage webhooks" ON public.calendar_webhooks USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: report_collaborators Session owners can manage collaborators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Session owners can manage collaborators" ON public.report_collaborators USING ((EXISTS ( SELECT 1
   FROM public.sessions
  WHERE ((sessions.id = report_collaborators.session_id) AND (sessions.user_id = auth.uid())))));


--
-- Name: usage_records System can insert usage records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert usage records" ON public.usage_records FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: collaborative_action_items Users can create action items with permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create action items with permissions" ON public.collaborative_action_items FOR INSERT WITH CHECK (((auth.uid() = created_by) AND (EXISTS ( SELECT 1
   FROM public.sessions
  WHERE ((sessions.id = collaborative_action_items.session_id) AND ((sessions.user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.report_collaborators rc
          WHERE ((rc.session_id = sessions.id) AND (rc.user_id = auth.uid()) AND ((rc.role)::text = ANY ((ARRAY['commenter'::character varying, 'editor'::character varying])::text[])))))))))));


--
-- Name: report_comments Users can create comments with proper permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create comments with proper permissions" ON public.report_comments FOR INSERT WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.sessions
  WHERE ((sessions.id = report_comments.session_id) AND ((sessions.user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.report_collaborators rc
          WHERE ((rc.session_id = sessions.id) AND (rc.user_id = auth.uid()) AND ((rc.role)::text = ANY ((ARRAY['commenter'::character varying, 'editor'::character varying])::text[])))))))))));


--
-- Name: organizations Users can create organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create organizations" ON public.organizations FOR INSERT WITH CHECK (true);


--
-- Name: user_app_sessions Users can create own app sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own app sessions" ON public.user_app_sessions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: documents Users can create own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own documents" ON public.documents FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: subscriptions Users can create own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own subscriptions" ON public.subscriptions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: templates Users can create own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own templates" ON public.templates FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: sessions Users can create sessions in their current org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create sessions in their current org" ON public.sessions FOR INSERT WITH CHECK (((user_id = auth.uid()) AND (organization_id = ( SELECT users.current_organization_id
   FROM public.users
  WHERE (users.id = auth.uid())))));


--
-- Name: shared_reports Users can create shares for their sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create shares for their sessions" ON public.shared_reports FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.sessions
  WHERE ((sessions.id = shared_reports.session_id) AND (sessions.user_id = auth.uid())))));


--
-- Name: summaries Users can create summaries for sessions in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create summaries for sessions in their org" ON public.summaries FOR INSERT WITH CHECK ((session_id IN ( SELECT sessions.id
   FROM public.sessions
  WHERE (sessions.organization_id = ( SELECT users.current_organization_id
           FROM public.users
          WHERE (users.id = auth.uid()))))));


--
-- Name: calendar_connections Users can create their own calendar connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own calendar connections" ON public.calendar_connections FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: calendar_preferences Users can create their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own preferences" ON public.calendar_preferences FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: transcripts Users can create transcripts for sessions in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create transcripts for sessions in their org" ON public.transcripts FOR INSERT WITH CHECK ((session_id IN ( SELECT sessions.id
   FROM public.sessions
  WHERE (sessions.organization_id = ( SELECT users.current_organization_id
           FROM public.users
          WHERE (users.id = auth.uid()))))));


--
-- Name: user_app_sessions Users can delete own app sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own app sessions" ON public.user_app_sessions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: documents Users can delete own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own documents" ON public.documents FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: subscriptions Users can delete own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own subscriptions" ON public.subscriptions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: templates Users can delete own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own templates" ON public.templates FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: calendar_connections Users can delete their own calendar connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own calendar connections" ON public.calendar_connections FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: report_comments Users can delete their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own comments" ON public.report_comments FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: documents Users can delete their own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own documents" ON public.documents FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: calendar_preferences Users can delete their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own preferences" ON public.calendar_preferences FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: sessions Users can delete their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own sessions" ON public.sessions FOR DELETE USING (((user_id = auth.uid()) AND (organization_id = ( SELECT users.current_organization_id
   FROM public.users
  WHERE (users.id = auth.uid())))));


--
-- Name: shared_reports Users can delete their own shares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own shares" ON public.shared_reports FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: usage_tracking Users can insert own usage tracking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own usage tracking" ON public.usage_tracking FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: report_activity Users can insert their own activity; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own activity" ON public.report_activity FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: report_bookmarks Users can manage their bookmarks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their bookmarks" ON public.report_bookmarks USING ((user_id = auth.uid()));


--
-- Name: comment_mentions Users can mark mentions as read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can mark mentions as read" ON public.comment_mentions FOR UPDATE USING ((mentioned_user_id = auth.uid()));


--
-- Name: collaborative_action_items Users can update action items they created or are assigned to; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update action items they created or are assigned to" ON public.collaborative_action_items FOR UPDATE USING (((created_by = auth.uid()) OR (assigned_to = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.sessions
  WHERE ((sessions.id = collaborative_action_items.session_id) AND (sessions.user_id = auth.uid()))))));


--
-- Name: user_app_sessions Users can update own app sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own app sessions" ON public.user_app_sessions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: documents Users can update own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own documents" ON public.documents FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: subscriptions Users can update own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own subscriptions" ON public.subscriptions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: templates Users can update own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own templates" ON public.templates FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: usage_tracking Users can update own usage tracking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own usage tracking" ON public.usage_tracking FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: summaries Users can update summaries for sessions in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update summaries for sessions in their org" ON public.summaries FOR UPDATE USING ((session_id IN ( SELECT sessions.id
   FROM public.sessions
  WHERE (sessions.organization_id = ( SELECT users.current_organization_id
           FROM public.users
          WHERE (users.id = auth.uid()))))));


--
-- Name: calendar_connections Users can update their own calendar connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own calendar connections" ON public.calendar_connections FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: report_comments Users can update their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own comments" ON public.report_comments FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: meeting_notifications Users can update their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own notifications" ON public.meeting_notifications FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: calendar_preferences Users can update their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own preferences" ON public.calendar_preferences FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: sessions Users can update their own sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own sessions" ON public.sessions FOR UPDATE USING (((user_id = auth.uid()) AND (organization_id = ( SELECT users.current_organization_id
   FROM public.users
  WHERE (users.id = auth.uid())))));


--
-- Name: shared_reports Users can update their own shares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own shares" ON public.shared_reports FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: transcripts Users can update transcripts for sessions in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update transcripts for sessions in their org" ON public.transcripts FOR UPDATE USING ((session_id IN ( SELECT sessions.id
   FROM public.sessions
  WHERE (sessions.organization_id = ( SELECT users.current_organization_id
           FROM public.users
          WHERE (users.id = auth.uid()))))));


--
-- Name: documents Users can upload documents to their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can upload documents to their organization" ON public.documents FOR INSERT WITH CHECK (((organization_id IN ( SELECT users.current_organization_id
   FROM public.users
  WHERE (users.id = auth.uid()))) AND (user_id = auth.uid())));


--
-- Name: collaborative_action_items Users can view action items on accessible sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view action items on accessible sessions" ON public.collaborative_action_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.sessions
  WHERE ((sessions.id = collaborative_action_items.session_id) AND ((sessions.user_id = auth.uid()) OR (collaborative_action_items.assigned_to = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.report_collaborators rc
          WHERE ((rc.session_id = sessions.id) AND (rc.user_id = auth.uid())))))))));


--
-- Name: report_activity Users can view activity for accessible sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view activity for accessible sessions" ON public.report_activity FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = report_activity.session_id) AND (s.user_id = auth.uid())))));


--
-- Name: report_activity Users can view activity on accessible sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view activity on accessible sessions" ON public.report_activity FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.sessions
  WHERE ((sessions.id = report_activity.session_id) AND ((sessions.user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.report_collaborators rc
          WHERE ((rc.session_id = sessions.id) AND (rc.user_id = auth.uid())))))))));


--
-- Name: report_comments Users can view comments on accessible sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view comments on accessible sessions" ON public.report_comments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.sessions
  WHERE ((sessions.id = report_comments.session_id) AND ((sessions.user_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.report_collaborators rc
          WHERE ((rc.session_id = sessions.id) AND (rc.user_id = auth.uid()) AND ((rc.role)::text = ANY ((ARRAY['viewer'::character varying, 'commenter'::character varying, 'editor'::character varying])::text[]))))) OR (EXISTS ( SELECT 1
           FROM public.shared_reports sr
          WHERE ((sr.session_id = sessions.id) AND ((sr.expires_at IS NULL) OR (sr.expires_at > now()))))))))));


--
-- Name: calendar_events Users can view events from their calendar connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view events from their calendar connections" ON public.calendar_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.calendar_connections
  WHERE ((calendar_connections.id = calendar_events.calendar_connection_id) AND (calendar_connections.user_id = auth.uid())))));


--
-- Name: organization_invitations Users can view invitations sent to them; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view invitations sent to them" ON public.organization_invitations FOR SELECT USING (((email)::text = (auth.jwt() ->> 'email'::text)));


--
-- Name: organization_members Users can view members of their organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view members of their organizations" ON public.organization_members FOR SELECT USING ((organization_id IN ( SELECT users.current_organization_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: user_app_sessions Users can view own app sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own app sessions" ON public.user_app_sessions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: documents Users can view own documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own documents" ON public.documents FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: monthly_usage_cache Users can view own monthly usage; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own monthly usage" ON public.monthly_usage_cache FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: subscription_events Users can view own subscription events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own subscription events" ON public.subscription_events FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: subscriptions Users can view own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: templates Users can view own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own templates" ON public.templates FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: usage_records Users can view own usage records; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own usage records" ON public.usage_records FOR SELECT USING (((user_id = auth.uid()) OR (organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND ((organization_members.status)::text = 'active'::text))))));


--
-- Name: usage_tracking Users can view own usage tracking; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own usage tracking" ON public.usage_tracking FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: sessions Users can view sessions in their current org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view sessions in their current org" ON public.sessions FOR SELECT USING ((organization_id = ( SELECT users.current_organization_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: summaries Users can view summaries for sessions in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view summaries for sessions in their org" ON public.summaries FOR SELECT USING ((session_id IN ( SELECT sessions.id
   FROM public.sessions
  WHERE (sessions.organization_id = ( SELECT users.current_organization_id
           FROM public.users
          WHERE (users.id = auth.uid()))))));


--
-- Name: organizations Users can view their current organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their current organization" ON public.organizations FOR SELECT USING ((id = ( SELECT users.current_organization_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: comment_mentions Users can view their mentions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their mentions" ON public.comment_mentions FOR SELECT USING ((mentioned_user_id = auth.uid()));


--
-- Name: documents Users can view their organization documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their organization documents" ON public.documents FOR SELECT USING ((organization_id IN ( SELECT users.current_organization_id
   FROM public.users
  WHERE (users.id = auth.uid()))));


--
-- Name: calendar_auto_join_logs Users can view their own auto-join logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own auto-join logs" ON public.calendar_auto_join_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: calendar_connections Users can view their own calendar connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own calendar connections" ON public.calendar_connections FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: organization_members Users can view their own memberships; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own memberships" ON public.organization_members FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: meeting_notifications Users can view their own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own notifications" ON public.meeting_notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: calendar_preferences Users can view their own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own preferences" ON public.calendar_preferences FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: shared_reports Users can view their own shares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own shares" ON public.shared_reports FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: subscriptions Users can view their own subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own subscriptions" ON public.subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: bot_recordings Users can view their session recordings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their session recordings" ON public.bot_recordings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = bot_recordings.session_id) AND (s.user_id = auth.uid())))));


--
-- Name: transcripts Users can view transcripts for sessions in their org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view transcripts for sessions in their org" ON public.transcripts FOR SELECT USING ((session_id IN ( SELECT sessions.id
   FROM public.sessions
  WHERE (sessions.organization_id = ( SELECT users.current_organization_id
           FROM public.users
          WHERE (users.id = auth.uid()))))));


--
-- Name: users allow_authenticated_select_users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_authenticated_select_users ON public.users FOR SELECT TO authenticated USING (true);


--
-- Name: users allow_users_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY allow_users_update_own ON public.users FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: beta_waitlist beta_waitlist_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY beta_waitlist_insert ON public.beta_waitlist FOR INSERT WITH CHECK (true);


--
-- Name: bot_recordings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bot_recordings ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_auto_join_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_auto_join_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_webhooks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_webhooks ENABLE ROW LEVEL SECURITY;

--
-- Name: collaborative_action_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.collaborative_action_items ENABLE ROW LEVEL SECURITY;

--
-- Name: collaborative_action_items collaborative_action_items_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY collaborative_action_items_delete_policy ON public.collaborative_action_items FOR DELETE TO authenticated USING ((auth.uid() = created_by));


--
-- Name: collaborative_action_items collaborative_action_items_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY collaborative_action_items_insert_policy ON public.collaborative_action_items FOR INSERT TO authenticated WITH CHECK (((auth.uid() = created_by) AND (EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = collaborative_action_items.session_id) AND (s.user_id = auth.uid()))))));


--
-- Name: collaborative_action_items collaborative_action_items_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY collaborative_action_items_select_policy ON public.collaborative_action_items FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = collaborative_action_items.session_id) AND (s.user_id = auth.uid())))));


--
-- Name: collaborative_action_items collaborative_action_items_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY collaborative_action_items_update_policy ON public.collaborative_action_items FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = collaborative_action_items.session_id) AND (s.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = collaborative_action_items.session_id) AND (s.user_id = auth.uid())))));


--
-- Name: comment_mentions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: documents documents_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY documents_insert ON public.documents FOR INSERT WITH CHECK (((user_id = auth.uid()) AND public.is_active_org_member(auth.uid(), organization_id)));


--
-- Name: documents documents_insert_own_session; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY documents_insert_own_session ON public.documents FOR INSERT WITH CHECK ((session_id IN ( SELECT sessions.id
   FROM public.sessions
  WHERE (sessions.user_id = auth.uid()))));


--
-- Name: documents documents_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY documents_select ON public.documents FOR SELECT USING (public.is_active_org_member(auth.uid(), organization_id));


--
-- Name: documents documents_select_via_session; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY documents_select_via_session ON public.documents FOR SELECT USING ((session_id IN ( SELECT sessions.id
   FROM public.sessions)));


--
-- Name: documents documents_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY documents_update ON public.documents FOR UPDATE USING (((user_id = auth.uid()) AND public.is_active_org_member(auth.uid(), organization_id)));


--
-- Name: documents documents_update_own_session; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY documents_update_own_session ON public.documents FOR UPDATE USING ((session_id IN ( SELECT sessions.id
   FROM public.sessions
  WHERE (sessions.user_id = auth.uid())))) WITH CHECK ((session_id IN ( SELECT sessions.id
   FROM public.sessions
  WHERE (sessions.user_id = auth.uid()))));


--
-- Name: guidance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.guidance ENABLE ROW LEVEL SECURITY;

--
-- Name: guidance guidance_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY guidance_delete ON public.guidance FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = guidance.session_id) AND public.is_active_org_member(auth.uid(), s.organization_id)))));


--
-- Name: guidance guidance_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY guidance_insert ON public.guidance FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = guidance.session_id) AND public.is_active_org_member(auth.uid(), s.organization_id)))));


--
-- Name: guidance guidance_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY guidance_select ON public.guidance FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = guidance.session_id) AND public.is_active_org_member(auth.uid(), s.organization_id)))));


--
-- Name: guidance guidance_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY guidance_update ON public.guidance FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = guidance.session_id) AND public.is_active_org_member(auth.uid(), s.organization_id)))));


--
-- Name: meeting_metadata; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meeting_metadata ENABLE ROW LEVEL SECURITY;

--
-- Name: meeting_metadata meeting_metadata_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meeting_metadata_delete ON public.meeting_metadata FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = meeting_metadata.session_id) AND public.is_active_org_member(auth.uid(), s.organization_id)))));


--
-- Name: meeting_metadata meeting_metadata_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meeting_metadata_insert ON public.meeting_metadata FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = meeting_metadata.session_id) AND public.is_active_org_member(auth.uid(), s.organization_id)))));


--
-- Name: meeting_metadata meeting_metadata_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meeting_metadata_select ON public.meeting_metadata FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = meeting_metadata.session_id) AND public.is_active_org_member(auth.uid(), s.organization_id)))));


--
-- Name: meeting_metadata meeting_metadata_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY meeting_metadata_update ON public.meeting_metadata FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = meeting_metadata.session_id) AND public.is_active_org_member(auth.uid(), s.organization_id)))));


--
-- Name: meeting_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meeting_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: monthly_usage_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.monthly_usage_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_invitations org_invitations_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_invitations_insert ON public.organization_invitations FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.organization_id = om.organization_id) AND (om.user_id = auth.uid()) AND ((om.status)::text = 'active'::text) AND ((om.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[]))))));


--
-- Name: organization_invitations org_invitations_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_invitations_select ON public.organization_invitations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.organization_id = om.organization_id) AND (om.user_id = auth.uid()) AND ((om.status)::text = 'active'::text) AND ((om.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[]))))));


--
-- Name: organization_invitations org_invitations_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_invitations_update ON public.organization_invitations FOR UPDATE USING (((invited_by_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.organization_id = om.organization_id) AND (om.user_id = auth.uid()) AND ((om.status)::text = 'active'::text) AND ((om.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[])))))));


--
-- Name: organization_invitations organization_invitations_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY organization_invitations_policy ON public.organization_invitations USING ((organization_id IN ( SELECT organization_members.organization_id
   FROM public.organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND ((organization_members.status)::text = 'active'::text)))));


--
-- Name: organization_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations organizations_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY organizations_insert ON public.organizations FOR INSERT WITH CHECK (true);


--
-- Name: organizations organizations_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY organizations_update_admin ON public.organizations FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.organization_id = om.id) AND (om.user_id = auth.uid()) AND ((om.status)::text = 'active'::text) AND ((om.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[]))))));


--
-- Name: plans plans_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plans_select_all ON public.plans FOR SELECT USING ((is_active = true));


--
-- Name: prep_checklist; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prep_checklist ENABLE ROW LEVEL SECURITY;

--
-- Name: prep_checklist prep_checklist_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prep_checklist_delete ON public.prep_checklist FOR DELETE USING (((created_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = prep_checklist.session_id) AND public.is_active_org_member(auth.uid(), s.organization_id))))));


--
-- Name: prep_checklist prep_checklist_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prep_checklist_insert ON public.prep_checklist FOR INSERT WITH CHECK (((created_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = prep_checklist.session_id) AND public.is_active_org_member(auth.uid(), s.organization_id))))));


--
-- Name: prep_checklist prep_checklist_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prep_checklist_select ON public.prep_checklist FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = prep_checklist.session_id) AND public.is_active_org_member(auth.uid(), s.organization_id)))));


--
-- Name: prep_checklist prep_checklist_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prep_checklist_update ON public.prep_checklist FOR UPDATE USING (((created_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = prep_checklist.session_id) AND public.is_active_org_member(auth.uid(), s.organization_id))))));


--
-- Name: report_activity; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.report_activity ENABLE ROW LEVEL SECURITY;

--
-- Name: report_activity report_activity_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY report_activity_insert_policy ON public.report_activity FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = report_activity.session_id) AND (s.user_id = auth.uid()))))));


--
-- Name: report_activity report_activity_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY report_activity_select_policy ON public.report_activity FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = report_activity.session_id) AND (s.user_id = auth.uid())))));


--
-- Name: report_bookmarks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.report_bookmarks ENABLE ROW LEVEL SECURITY;

--
-- Name: report_collaborators; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.report_collaborators ENABLE ROW LEVEL SECURITY;

--
-- Name: report_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.report_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: report_comments report_comments_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY report_comments_delete_policy ON public.report_comments FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: report_comments report_comments_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY report_comments_insert_policy ON public.report_comments FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = report_comments.session_id) AND (s.user_id = auth.uid()))))));


--
-- Name: report_comments report_comments_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY report_comments_select_policy ON public.report_comments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = report_comments.session_id) AND (s.user_id = auth.uid())))));


--
-- Name: report_comments report_comments_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY report_comments_update_policy ON public.report_comments FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: session_context; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session_context ENABLE ROW LEVEL SECURITY;

--
-- Name: session_context session_context_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY session_context_delete ON public.session_context FOR DELETE USING (((user_id = auth.uid()) AND public.is_active_org_member(auth.uid(), organization_id)));


--
-- Name: session_context session_context_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY session_context_insert ON public.session_context FOR INSERT WITH CHECK (((user_id = auth.uid()) AND public.is_active_org_member(auth.uid(), organization_id)));


--
-- Name: session_context session_context_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY session_context_select ON public.session_context FOR SELECT USING (public.is_active_org_member(auth.uid(), organization_id));


--
-- Name: session_context session_context_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY session_context_update ON public.session_context FOR UPDATE USING (((user_id = auth.uid()) AND public.is_active_org_member(auth.uid(), organization_id)));


--
-- Name: session_timeline_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session_timeline_events ENABLE ROW LEVEL SECURITY;

--
-- Name: session_timeline_events session_timeline_events_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY session_timeline_events_delete ON public.session_timeline_events FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = session_timeline_events.session_id) AND public.is_active_org_member(auth.uid(), s.organization_id)))));


--
-- Name: session_timeline_events session_timeline_events_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY session_timeline_events_insert ON public.session_timeline_events FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = session_timeline_events.session_id) AND public.is_active_org_member(auth.uid(), s.organization_id)))));


--
-- Name: session_timeline_events session_timeline_events_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY session_timeline_events_select ON public.session_timeline_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = session_timeline_events.session_id) AND public.is_active_org_member(auth.uid(), s.organization_id)))));


--
-- Name: session_timeline_events session_timeline_events_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY session_timeline_events_update ON public.session_timeline_events FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.sessions s
  WHERE ((s.id = session_timeline_events.session_id) AND public.is_active_org_member(auth.uid(), s.organization_id)))));


--
-- Name: sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: shared_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shared_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: smart_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.smart_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: smart_notes smart_notes_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY smart_notes_delete ON public.smart_notes FOR DELETE USING (((user_id = auth.uid()) AND public.is_active_org_member(auth.uid(), organization_id)));


--
-- Name: smart_notes smart_notes_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY smart_notes_insert ON public.smart_notes FOR INSERT WITH CHECK (((user_id = auth.uid()) AND public.is_active_org_member(auth.uid(), organization_id)));


--
-- Name: smart_notes smart_notes_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY smart_notes_select ON public.smart_notes FOR SELECT USING (((user_id = auth.uid()) OR public.is_active_org_member(auth.uid(), organization_id)));


--
-- Name: smart_notes smart_notes_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY smart_notes_update ON public.smart_notes FOR UPDATE USING (((user_id = auth.uid()) AND public.is_active_org_member(auth.uid(), organization_id)));


--
-- Name: subscription_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions subscriptions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subscriptions_insert ON public.subscriptions FOR INSERT WITH CHECK ((((organization_id IS NOT NULL) AND public.is_active_org_member(auth.uid(), organization_id)) OR (user_id = auth.uid())));


--
-- Name: subscriptions subscriptions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subscriptions_select ON public.subscriptions FOR SELECT USING ((((organization_id IS NOT NULL) AND public.is_active_org_member(auth.uid(), organization_id)) OR (user_id = auth.uid())));


--
-- Name: subscriptions subscriptions_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY subscriptions_update ON public.subscriptions FOR UPDATE USING (((user_id = auth.uid()) OR ((organization_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.organization_id = om.organization_id) AND (om.user_id = auth.uid()) AND ((om.status)::text = 'active'::text) AND ((om.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[]))))))));


--
-- Name: summaries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

--
-- Name: system_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: system_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: templates templates_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY templates_insert ON public.templates FOR INSERT WITH CHECK ((((user_id = auth.uid()) AND (organization_id IS NULL)) OR ((organization_id IS NOT NULL) AND public.is_active_org_member(auth.uid(), organization_id))));


--
-- Name: templates templates_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY templates_select ON public.templates FOR SELECT USING (((is_public = true) OR (is_system_template = true) OR ((organization_id IS NOT NULL) AND public.is_active_org_member(auth.uid(), organization_id)) OR (user_id = auth.uid())));


--
-- Name: templates templates_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY templates_update ON public.templates FOR UPDATE USING (((user_id = auth.uid()) OR ((organization_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.organization_members om
  WHERE ((om.organization_id = om.organization_id) AND (om.user_id = auth.uid()) AND ((om.status)::text = 'active'::text) AND ((om.role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying])::text[]))))))));


--
-- Name: transcripts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;

--
-- Name: transcripts transcripts_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY transcripts_policy ON public.transcripts USING ((session_id IN ( SELECT s.id
   FROM public.sessions s
  WHERE ((s.id = transcripts.session_id) AND ((s.user_id = auth.uid()) OR (s.organization_id IN ( SELECT om.organization_id
           FROM public.organization_members om
          WHERE ((om.user_id = auth.uid()) AND ((om.status)::text = 'active'::text))))))))) WITH CHECK ((session_id IN ( SELECT s.id
   FROM public.sessions s
  WHERE ((s.id = transcripts.session_id) AND ((s.user_id = auth.uid()) OR (s.organization_id IN ( SELECT om.organization_id
           FROM public.organization_members om
          WHERE ((om.user_id = auth.uid()) AND ((om.status)::text = 'active'::text)))))))));


--
-- Name: usage_records usage_records_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY usage_records_insert ON public.usage_records FOR INSERT WITH CHECK (public.is_active_org_member(auth.uid(), organization_id));


--
-- Name: usage_records usage_records_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY usage_records_select ON public.usage_records FOR SELECT USING (public.is_active_org_member(auth.uid(), organization_id));


--
-- Name: usage_tracking; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

--
-- Name: user_app_sessions user_app_sessions_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_app_sessions_insert_own ON public.user_app_sessions FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_app_sessions user_app_sessions_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_app_sessions_policy ON public.user_app_sessions USING ((user_id = auth.uid()));


--
-- Name: user_app_sessions user_app_sessions_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_app_sessions_select_own ON public.user_app_sessions FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: user_app_sessions user_app_sessions_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_app_sessions_update_own ON public.user_app_sessions FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime_messages_publication; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime_messages_publication WITH (publish = 'insert, update, delete, truncate');


--
-- Name: supabase_realtime_messages_publication messages; Type: PUBLICATION TABLE; Schema: realtime; Owner: -
--

ALTER PUBLICATION supabase_realtime_messages_publication ADD TABLE ONLY realtime.messages;


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

