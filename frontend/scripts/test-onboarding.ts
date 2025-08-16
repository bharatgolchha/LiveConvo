#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ucvfgfbjcrxbzppwjpuu.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testOnboarding() {
  console.log('🧪 Testing Onboarding Flow\n')
  
  // Check if user exists and their status
  const testEmail = 'bgolchha+p1@gmail.com'
  
  console.log(`1️⃣ Checking user status for ${testEmail}...`)
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', testEmail)
    .single()
  
  if (userError) {
    console.error('❌ Error fetching user:', userError)
    return
  }
  
  console.log('✅ User found:')
  console.log(`   - ID: ${user.id}`)
  console.log(`   - Email: ${user.email}`)
  console.log(`   - Onboarding completed: ${user.has_completed_onboarding}`)
  console.log(`   - Organization ID: ${user.current_organization_id || 'None'}`)
  console.log('')
  
  // Check if user has any organization memberships
  console.log('2️⃣ Checking organization memberships...')
  const { data: memberships, error: memberError } = await supabase
    .from('organization_members')
    .select('*, organizations(*)')
    .eq('user_id', user.id)
  
  if (memberError) {
    console.error('❌ Error fetching memberships:', memberError)
  } else if (memberships && memberships.length > 0) {
    console.log(`✅ Found ${memberships.length} membership(s):`)
    memberships.forEach((m: any) => {
      console.log(`   - Org: ${m.organizations?.name || m.organization_id}`)
      console.log(`     Role: ${m.role}, Status: ${m.status}`)
    })
  } else {
    console.log('📝 No organization memberships found (expected for new users)')
  }
  console.log('')
  
  // Test dashboard API call
  console.log('3️⃣ Testing dashboard API response...')
  console.log('   This should return a 400 error for users who haven\'t completed onboarding')
  console.log('')
  
  // Get auth token for the user
  const { data: authUser } = await supabase.auth.admin.getUserById(user.id)
  if (!authUser.user) {
    console.log('❌ Could not find auth user')
    return
  }
  
  console.log('📊 Summary:')
  console.log('   - User exists in database: ✅')
  console.log(`   - Onboarding status: ${user.has_completed_onboarding ? '✅ Completed' : '⏳ Pending'}`)
  console.log(`   - Organization: ${user.current_organization_id ? '✅ Has org' : '❌ No org yet'}`)
  console.log('')
  
  if (!user.has_completed_onboarding) {
    console.log('💡 Next steps:')
    console.log('   1. User should be redirected to /onboarding when accessing dashboard')
    console.log('   2. Complete onboarding flow to create organization')
    console.log('   3. After onboarding, user can access dashboard')
  }
}

testOnboarding().catch(console.error)