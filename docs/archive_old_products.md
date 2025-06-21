# Archive Old Stripe Products Script

This document contains the steps to archive old Stripe products that are no longer needed for the LiveConvo Pro-only setup.

## Products to Archive

The following products need to be set to `active: false`:

1. **LiveConvo Extra Minutes** (`prod_SSMOiQ0uLtLWeO`)
2. **LiveConvo Enterprise** (`prod_SSMOSQtxS9E7wr`) 
3. **LiveConvo Professional** (`prod_SSMOP4EmUOKmKh`)
4. **LiveConvo Starter** (`prod_SSMNO55BbnfTOQ`)
5. **Pro** - old (`prod_SFPduKwiuMZbN8`)
6. **Starter** - old (`prod_SFOIhBPcSNZ3c8`)

## Product to Keep Active

- **LiveConvo Pro** (`prod_SSMQpSGAstcxB3`) - NEW Pro plan product

## Manual Steps Required

Since the Stripe MCP tools don't have a direct "update product" function to set active=false, this needs to be done via:

### Option 1: Stripe Dashboard
1. Go to [Stripe Dashboard > Products](https://dashboard.stripe.com/products)
2. For each product listed above, click the "..." menu
3. Select "Archive product"

### Option 2: Direct API Calls
```bash
# Archive LiveConvo Extra Minutes
curl -X POST https://api.stripe.com/v1/products/prod_SSMOiQ0uLtLWeO \
  -u "sk_test_YOUR_SECRET_KEY:" \
  -d active=false

# Archive LiveConvo Enterprise
curl -X POST https://api.stripe.com/v1/products/prod_SSMOSQtxS9E7wr \
  -u "sk_test_YOUR_SECRET_KEY:" \
  -d active=false

# Archive LiveConvo Professional
curl -X POST https://api.stripe.com/v1/products/prod_SSMOP4EmUOKmKh \
  -u "sk_test_YOUR_SECRET_KEY:" \
  -d active=false

# Archive LiveConvo Starter
curl -X POST https://api.stripe.com/v1/products/prod_SSMNO55BbnfTOQ \
  -u "sk_test_YOUR_SECRET_KEY:" \
  -d active=false

# Archive Pro (old)
curl -X POST https://api.stripe.com/v1/products/prod_SFPduKwiuMZbN8 \
  -u "sk_test_YOUR_SECRET_KEY:" \
  -d active=false

# Archive Starter (old)
curl -X POST https://api.stripe.com/v1/products/prod_SFOIhBPcSNZ3c8 \
  -u "sk_test_YOUR_SECRET_KEY:" \
  -d active=false
```

## Verification

After archiving, run this to verify only the new LiveConvo Pro product is active:

```bash
curl -G https://api.stripe.com/v1/products \
  -u "sk_test_YOUR_SECRET_KEY:" \
  -d active=true
```

Should only return `prod_SSMQpSGAstcxB3` (LiveConvo Pro).

---

**Note**: Archiving products doesn't delete them - they remain in your Stripe account for historical purposes but can't be used for new purchases. 