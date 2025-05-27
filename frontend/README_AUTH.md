# Authentication Setup for LiveConvo

## Environment Variables

To enable authentication, add these variables to your `.env.local` file:

```bash
# Supabase Configuration (Required for Authentication)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Existing Configuration
OPENAI_API_KEY=your_openai_api_key
DEEPGRAM_API_KEY=your_deepgram_api_key
```

## Supabase Setup

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Copy your project URL and anon key from Settings > API

2. **Configure Google OAuth (Optional)**
   - In Supabase Dashboard: Authentication > Providers
   - Enable Google provider
   - Add your Google OAuth credentials
   - Set redirect URL to: `http://localhost:3004/auth/callback` (for development)

3. **Database Schema**
   - The authentication system uses Supabase's built-in auth tables
   - Additional user profile data will be stored in your custom `users` table
   - Make sure to apply the database schema from `supabase_schema.sql`

## Features

- ✅ Email/Password authentication
- ✅ Google OAuth login
- ✅ Protected routes
- ✅ User session management
- ✅ Beautiful responsive design
- ✅ Form validation
- ✅ Password strength indicator
- ✅ Loading states and error handling

## Usage

1. Visit `/auth/login` to sign in
2. Visit `/auth/signup` to create an account
3. Users are redirected to `/dashboard` after successful authentication
4. Protected routes automatically redirect to login if not authenticated

## Components Created

- `AuthContext.tsx` - React context for auth state management
- `auth/login/page.tsx` - Beautiful login page with email and Google options
- `auth/signup/page.tsx` - Registration page with validation and features list
- `lib/supabase.ts` - Supabase client configuration

## Next Steps

1. Add your Supabase credentials to `.env.local`
2. Test the authentication flow
3. Customize the redirect URLs for your production domain
4. Add additional user profile fields as needed 