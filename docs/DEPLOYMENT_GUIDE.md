# LiveConvo - Vercel Deployment Guide

## 🚀 Quick Deployment Setup

### 1. Vercel Project Setup

1. **Connect Repository to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your LiveConvo repository
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

### 2. Environment Variables

Configure these in Vercel Dashboard → Settings → Environment Variables:

#### **Production Environment Variables:**
```bash
# Supabase (Current Database)
NEXT_PUBLIC_SUPABASE_URL=https://ucvfgfbjcrxbzppwjpuu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_current_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_current_service_key

# AI & Transcription APIs
OPENROUTER_API_KEY=sk-or-your-openrouter-key
DEEPGRAM_API_KEY=your-deepgram-key

# Email Service
RESEND_API_KEY=re-your-resend-key

# App Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### 3. Domain Setup

1. **Custom Domain** (Optional):
   - In Vercel Dashboard → Domains
   - Add your custom domain (e.g., `liveprompt.ai`)
   - Update `NEXT_PUBLIC_APP_URL` to match

### 4. Database Configuration

**Current Setup:** Using your existing VoiceConvo Dev database
- **Project ID:** `ucvfgfbjcrxbzppwjpuu`
- **Region:** ap-southeast-1
- **Status:** Production-ready

## 📋 Pre-Deployment Checklist

- [ ] **API Keys Ready:** OpenRouter, Deepgram, Resend
- [ ] **Database Schema Applied:** All tables and RLS policies
- [ ] **Environment Variables Set:** In Vercel dashboard
- [ ] **Domain Configured:** Custom domain (optional)
- [ ] **Build Testing:** `npm run build` works locally

## 🔄 Deployment Process

### **Deploy to Vercel:**

1. **Push to main branch** → Automatic deployment
2. **Monitor build logs** in Vercel dashboard
3. **Test production URL** when deployment completes

### **Verify Deployment:**

- [ ] App loads correctly
- [ ] Authentication works (login/signup)
- [ ] Database connections successful
- [ ] AI guidance functioning
- [ ] Transcription working
- [ ] Admin dashboard accessible

## 🎯 Post-Deployment Setup

### **1. Update TASK.md**
```markdown
- [x] **🚀 Deploy LiveConvo to Vercel** (2025-01-30) ✅ **COMPLETED**
  - **Production URL:** https://your-domain.vercel.app
  - **Database:** VoiceConvo Dev (ucvfgfbjcrxbzppwjpuu)
  - **Environment:** Single database with production configuration
  - **Status:** Live and functional
```

### **2. Database Monitoring**
- Set up **Supabase alerts** for high usage
- Monitor **API usage** in OpenRouter/Deepgram dashboards
- Check **error logs** in Vercel Functions

### **3. Performance Optimization**
- Enable **Vercel Analytics** for performance monitoring
- Set up **Edge Functions** for global performance
- Configure **Caching** for API responses

## 🔮 Future Environment Separation

### **When to Upgrade:**
- **User Growth:** 100+ active users
- **Revenue Generated:** $500+ monthly
- **Team Size:** 3+ developers

### **Upgrade Path:**
1. **Supabase Pro Plan:** $25/month per project
2. **Create Staging Project:** For safe testing
3. **Create Production Project:** For live users
4. **Migrate Data:** Using Supabase migration tools

## 🚨 Important Notes

### **Current Database Usage:**
- **Name:** VoiceConvo Dev (transitioning to production)
- **Backup Strategy:** Enable daily backups in Supabase
- **Scaling:** Monitor usage and upgrade when needed

### **Security Considerations:**
- **RLS Policies:** Already configured
- **API Key Rotation:** Schedule regular key updates
- **Environment Variables:** Never commit to repository

## 🛟 Troubleshooting

### **Common Issues:**

**Build Failures:**
```bash
# Check Node.js version compatibility
node --version  # Should be 18+
npm run build   # Test locally first
```

**API Connection Issues:**
```bash
# Verify environment variables in Vercel
# Check API key validity in respective dashboards
```

**Database Connection:**
```bash
# Verify Supabase URL and keys
# Check RLS policies for proper access
```

## 📞 Support Resources

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **Next.js Deployment:** [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)

---

## 🎉 Ready to Deploy!

Your LiveConvo app is configured and ready for production deployment. The single database approach is perfect for getting started, and you can always upgrade to separate environments later as your user base grows.

**Next Step:** Push your code to main branch and watch it deploy automatically! 🚀 