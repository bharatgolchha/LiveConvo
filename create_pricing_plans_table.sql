-- Create pricing_plans table for managing subscription pricing
CREATE TABLE IF NOT EXISTS pricing_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Plan Identity
    slug VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'starter', 'professional', 'enterprise'
    name VARCHAR(100) NOT NULL, -- Display name
    description TEXT,
    tagline VARCHAR(255), -- Short marketing tagline
    
    -- Pricing
    price_monthly DECIMAL(10,2),
    price_yearly DECIMAL(10,2),
    discount_percentage INTEGER, -- For yearly plans
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Stripe Integration
    stripe_price_id_monthly VARCHAR(255),
    stripe_price_id_yearly VARCHAR(255),
    
    -- Features
    features JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of feature objects
    -- Example: [{"name": "Real-time transcription", "included": true}, {"name": "API Access", "included": false}]
    
    -- Limits
    monthly_minutes INTEGER, -- NULL for unlimited
    max_sessions_per_month INTEGER, -- NULL for unlimited
    max_file_uploads_per_session INTEGER DEFAULT 10,
    max_file_size_mb INTEGER DEFAULT 25,
    
    -- Advanced Features
    ai_model_tier VARCHAR(50) DEFAULT 'basic', -- 'basic', 'advanced', 'premium'
    has_api_access BOOLEAN DEFAULT FALSE,
    has_team_features BOOLEAN DEFAULT FALSE,
    has_priority_support BOOLEAN DEFAULT FALSE,
    has_custom_branding BOOLEAN DEFAULT FALSE,
    has_advanced_analytics BOOLEAN DEFAULT FALSE,
    
    -- Display Settings
    is_popular BOOLEAN DEFAULT FALSE,
    is_enterprise BOOLEAN DEFAULT FALSE,
    display_order INTEGER DEFAULT 0,
    button_text VARCHAR(50) DEFAULT 'Get Started',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_beta BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_pricing_plans_slug ON pricing_plans(slug);
CREATE INDEX idx_pricing_plans_is_active ON pricing_plans(is_active);
CREATE INDEX idx_pricing_plans_display_order ON pricing_plans(display_order);

-- Insert default pricing plans
INSERT INTO pricing_plans (
    slug, name, tagline, description,
    price_monthly, price_yearly, discount_percentage,
    features, monthly_minutes, max_sessions_per_month,
    ai_model_tier, has_api_access, has_team_features,
    has_priority_support, has_custom_branding, has_advanced_analytics,
    is_popular, display_order, button_text
) VALUES
(
    'starter',
    'Starter',
    'Perfect for individuals',
    'Get started with AI-powered conversation coaching',
    0, 0, 0,
    '[
        {"name": "Real-time transcription", "included": true},
        {"name": "AI conversation guidance", "included": true},
        {"name": "Session summaries", "included": true},
        {"name": "60 minutes/month", "included": true},
        {"name": "Basic export options", "included": true},
        {"name": "Email support", "included": true}
    ]'::jsonb,
    60, 10,
    'basic', false, false, false, false, false,
    false, 1, 'Start Free'
),
(
    'professional',
    'Professional',
    'Most popular for professionals',
    'Advanced features for power users and small teams',
    29, 290, 17,
    '[
        {"name": "Everything in Starter", "included": true},
        {"name": "Unlimited minutes", "included": true},
        {"name": "Unlimited sessions", "included": true},
        {"name": "Advanced AI models", "included": true},
        {"name": "Custom conversation templates", "included": true},
        {"name": "Priority processing", "included": true},
        {"name": "Advanced export formats", "included": true},
        {"name": "API access", "included": true},
        {"name": "Email & chat support", "included": true}
    ]'::jsonb,
    NULL, NULL,
    'advanced', true, false, true, false, true,
    true, 2, 'Go Pro'
),
(
    'team',
    'Team',
    'Built for collaboration',
    'Perfect for teams that need to share insights and collaborate',
    79, 790, 17,
    '[
        {"name": "Everything in Professional", "included": true},
        {"name": "Up to 10 team members", "included": true},
        {"name": "Team workspace", "included": true},
        {"name": "Shared conversation library", "included": true},
        {"name": "Team analytics dashboard", "included": true},
        {"name": "Role-based permissions", "included": true},
        {"name": "Custom branding", "included": true},
        {"name": "Priority support", "included": true},
        {"name": "Onboarding assistance", "included": true}
    ]'::jsonb,
    NULL, NULL,
    'premium', true, true, true, true, true,
    false, 3, 'Start Team Trial'
),
(
    'enterprise',
    'Enterprise',
    'Tailored for your organization',
    'Custom solutions for large organizations with specific needs',
    NULL, NULL, NULL,
    '[
        {"name": "Everything in Team", "included": true},
        {"name": "Unlimited team members", "included": true},
        {"name": "Dedicated account manager", "included": true},
        {"name": "Custom AI model training", "included": true},
        {"name": "SSO/SAML integration", "included": true},
        {"name": "Advanced security features", "included": true},
        {"name": "SLA guarantee", "included": true},
        {"name": "Custom integrations", "included": true},
        {"name": "White-label options", "included": true}
    ]'::jsonb,
    NULL, NULL,
    'premium', true, true, true, true, true,
    false, 4, 'Contact Sales'
);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_pricing_plans_updated_at BEFORE UPDATE
    ON pricing_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant appropriate permissions
GRANT SELECT ON pricing_plans TO authenticated;
GRANT ALL ON pricing_plans TO service_role;