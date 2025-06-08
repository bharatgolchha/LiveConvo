#!/bin/bash

# Test script to verify the subscription fix for bgolchha+4@gmail.com

echo "Testing subscription fix for bgolchha+4@gmail.com..."
echo "=============================================="

# Test the database function directly
echo -e "\n1. Testing check_usage_limit_v2 function:"
psql "$DATABASE_URL" <<EOF
SELECT * FROM check_usage_limit_v2(
    'e0feb2fa-b9cc-46bd-8a34-c6f8eb444af4'::uuid,
    'b3a8b32d-9d76-4cf8-8bed-814be0752b84'::uuid
);
EOF

# Check organization member limits
echo -e "\n2. Checking organization_members limits:"
psql "$DATABASE_URL" <<EOF
SELECT 
    om.monthly_audio_hours_limit,
    om.monthly_audio_hours_limit * 60 as minutes_limit,
    om.current_month_minutes_used
FROM organization_members om
WHERE om.user_id = 'e0feb2fa-b9cc-46bd-8a34-c6f8eb444af4'
AND om.organization_id = 'b3a8b32d-9d76-4cf8-8bed-814be0752b84';
EOF

# Check active subscription
echo -e "\n3. Checking active subscription:"
psql "$DATABASE_URL" <<EOF
SELECT 
    s.plan_type,
    s.status,
    p.display_name,
    p.monthly_audio_hours_limit,
    p.monthly_audio_hours_limit * 60 as minutes_limit
FROM subscriptions s
JOIN plans p ON p.id = s.plan_id
WHERE s.user_id = 'e0feb2fa-b9cc-46bd-8a34-c6f8eb444af4'
AND s.status = 'active';
EOF

echo -e "\n=============================================="
echo "If all values show 420 minutes (7 hours), the fix is working correctly."
echo "Clear your browser cache and reload the dashboard to see the updated limits."