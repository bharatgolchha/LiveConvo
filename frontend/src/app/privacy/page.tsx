'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">
            Effective Date: January 16, 2025 | Last Updated: January 16, 2025
          </p>

          <div className="bg-muted/50 p-6 rounded-lg mb-8">
            <p className="text-sm">
              NexGenAI LLC ("Company", "we", "us", or "our") is committed to protecting your privacy. This Privacy Policy 
              explains how we collect, use, disclose, and safeguard your information when you use our service liveprompt.ai 
              (the "Service"). Please read this privacy policy carefully. If you do not agree with the terms of this privacy 
              policy, please do not access the Service.
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
            
            <h3 className="text-xl font-semibold mb-2">1.1 Personal Information</h3>
            <p>We collect personal information that you provide directly to us, including:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Name and email address when you create an account</li>
              <li>Payment information when you subscribe to paid plans (processed securely by Stripe)</li>
              <li>Profile information you choose to provide</li>
              <li>Communications you send to us</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 mt-4">1.2 Conversation Data</h3>
            <p>When you use our Service, we collect:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Audio recordings of conversations you choose to record</li>
              <li>Transcripts generated from your conversations</li>
              <li>AI-generated summaries and insights</li>
              <li>Documents and context you upload</li>
              <li>Session metadata (duration, participants count, etc.)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 mt-4">1.3 Usage Information</h3>
            <p>We automatically collect certain information about your device and usage, including:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Browser type and version</li>
              <li>Operating system</li>
              <li>IP address</li>
              <li>Pages visited and features used</li>
              <li>Date and time of visits</li>
              <li>Referring website addresses</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 mt-4">1.4 Cookies and Similar Technologies</h3>
            <p>
              We use cookies and similar tracking technologies to track activity on our Service and hold certain information. 
              You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Provide, maintain, and improve our Service</li>
              <li>Process your transactions and manage your subscriptions</li>
              <li>Generate transcripts, summaries, and AI-powered insights</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and customer service requests</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, prevent, and address technical issues</li>
              <li>Comply with legal obligations</li>
            </ul>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg my-4">
              <p className="font-semibold text-blue-800 dark:text-blue-200">AI Training Notice:</p>
              <p className="text-blue-700 dark:text-blue-300 mt-2">
                We do not use your conversation recordings, transcripts, or any personal data to train our AI models 
                without your explicit consent. Any data used for model improvement is anonymized and aggregated.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Google API Services and Limited Use Disclosure</h2>
            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg mb-6">
              <h3 className="text-xl font-semibold mb-3 text-green-800 dark:text-green-200">Google API Services User Data Policy</h3>
              <p className="text-green-700 dark:text-green-300 font-medium">
                liveprompt.ai's use and transfer to any other app of information received from Google APIs will adhere to 
                <a href="https://developers.google.com/terms/api-services-user-data-policy" className="underline ml-1" target="_blank" rel="noopener noreferrer">
                  Google API Services User Data Policy
                </a>, including the Limited Use requirements.
              </p>
              
              <div className="mt-4 space-y-3">
                <p className="text-green-700 dark:text-green-300">
                  <strong>How we use Google user data:</strong>
                </p>
                <ul className="list-disc ml-6 text-green-700 dark:text-green-300">
                  <li>We access your Google Calendar events (read-only) to help you automatically join meetings</li>
                  <li>We use your Google profile information (name and email) for account creation and authentication</li>
                  <li>Calendar event data is processed by our AI models to provide contextual conversation guidance</li>
                  <li>We store minimal calendar data (event titles, times, meeting links) to enable automatic meeting joining</li>
                </ul>
                
                <p className="text-green-700 dark:text-green-300 mt-3">
                  <strong>We do NOT:</strong>
                </p>
                <ul className="list-disc ml-6 text-green-700 dark:text-green-300">
                  <li>Use Google user data for advertising or marketing purposes</li>
                  <li>Share Google user data with third parties except as necessary to provide our core service functionality</li>
                  <li>Use Google user data for any purpose other than providing and improving liveprompt.ai features</li>
                  <li>Transfer Google user data to third parties without your explicit consent</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. How We Share Your Information</h2>
            <p>We do not sell, trade, or rent your personal information. We may share your information in the following situations:</p>
            
            <h3 className="text-xl font-semibold mb-2">4.1 Service Providers</h3>
            <p>We share information with third-party service providers that help us operate our Service:</p>
            <ul className="list-disc ml-6 mt-2">
              <li><strong>Deepgram</strong> - for speech-to-text transcription</li>
              <li><strong>OpenRouter/Google Gemini</strong> - for AI processing</li>
              <li><strong>Supabase</strong> - for database and authentication</li>
              <li><strong>Stripe</strong> - for payment processing</li>
            </ul>
            <p className="mt-2">
              These providers are bound by contractual obligations to keep personal information confidential and use it 
              only for the purposes for which we disclose it to them.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">4.2 Legal Requirements</h3>
            <p>
              We may disclose your information if required to do so by law or in response to valid requests by public 
              authorities (e.g., a court or government agency).
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">4.3 Business Transfers</h3>
            <p>
              If we are involved in a merger, acquisition, or asset sale, your personal information may be transferred. 
              We will provide notice before your personal information is transferred and becomes subject to a different 
              privacy policy.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">4.4 With Your Consent</h3>
            <p>
              We may share your information with your consent or at your direction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational security measures to protect your personal information 
              against accidental or unlawful destruction, loss, alteration, unauthorized disclosure, or access. These measures include:
            </p>
            <ul className="list-disc ml-6 mt-2">
              <li>Encryption of data in transit and at rest</li>
              <li>Regular security assessments and audits</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Employee training on data protection</li>
              <li>Incident response procedures</li>
            </ul>
            <p className="mt-4">
              However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot 
              guarantee absolute security.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <p>
              We retain your personal information for as long as necessary to provide you with our Service and as 
              necessary to comply with our legal obligations, resolve disputes, and enforce our policies. When we no 
              longer need to use your information, we will delete it from our systems and records or anonymize it so 
              that it can no longer identify you.
            </p>
            <p className="mt-4">Specifically:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Account information is retained while your account is active</li>
              <li>Conversation recordings and transcripts are retained for 90 days after creation unless you delete them sooner</li>
              <li>Usage analytics are retained for 24 months</li>
              <li>Billing records are retained as required by tax and accounting rules</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Your Privacy Rights</h2>
            
            <h3 className="text-xl font-semibold mb-2">7.1 Access and Portability</h3>
            <p>
              You have the right to access the personal information we hold about you and to receive a copy of your 
              personal data in a structured, commonly used, and machine-readable format.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">7.2 Correction</h3>
            <p>
              You have the right to request that we correct any inaccurate or incomplete personal information about you.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">7.3 Deletion</h3>
            <p>
              You have the right to request that we delete your personal information, subject to certain exceptions 
              such as compliance with legal obligations.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">7.4 Objection and Restriction</h3>
            <p>
              You have the right to object to or request that we restrict certain processing of your personal information.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">7.5 Withdraw Consent</h3>
            <p>
              Where we rely on your consent to process your personal information, you have the right to withdraw that 
              consent at any time.
            </p>

            <p className="mt-4">
              To exercise any of these rights, please contact us at hello@liveprompt.ai. We will respond to your request 
              within 30 days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. International Data Transfers</h2>
            <p>
              Your information may be transferred to and maintained on servers located outside of your state, province, 
              country, or other governmental jurisdiction where data protection laws may differ from those in your 
              jurisdiction. We ensure that such transfers are subject to appropriate safeguards.
            </p>
            <p className="mt-4">
              For users in the European Economic Area (EEA), we rely on Standard Contractual Clauses approved by the 
              European Commission for data transfers outside the EEA.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Children's Privacy</h2>
            <p>
              Our Service is not intended for use by children under the age of 13. We do not knowingly collect personal 
              information from children under 13. If we become aware that we have collected personal information from a 
              child under 13, we will take steps to delete such information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. California Privacy Rights (CCPA)</h2>
            <p>If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA):</p>
            
            <h3 className="text-xl font-semibold mb-2">10.1 Right to Know</h3>
            <p>You have the right to request that we disclose:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>The categories of personal information we have collected about you</li>
              <li>The categories of sources from which personal information is collected</li>
              <li>Our business or commercial purpose for collecting personal information</li>
              <li>The categories of third parties with whom we share personal information</li>
              <li>The specific pieces of personal information we have collected about you</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 mt-4">10.2 Right to Delete</h3>
            <p>
              You have the right to request that we delete your personal information, subject to certain exceptions.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">10.3 Right to Non-Discrimination</h3>
            <p>
              We will not discriminate against you for exercising any of your CCPA rights.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">10.4 Sale of Personal Information</h3>
            <p className="font-semibold">
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. European Privacy Rights (GDPR)</h2>
            <p>If you are in the European Economic Area (EEA), you have additional rights under the General Data Protection Regulation (GDPR):</p>
            
            <h3 className="text-xl font-semibold mb-2">11.1 Legal Basis for Processing</h3>
            <p>We process your personal information based on the following legal grounds:</p>
            <ul className="list-disc ml-6 mt-2">
              <li><strong>Consent:</strong> You have given consent for processing</li>
              <li><strong>Contract:</strong> Processing is necessary for the performance of our contract with you</li>
              <li><strong>Legal obligations:</strong> Processing is necessary for compliance with legal obligations</li>
              <li><strong>Legitimate interests:</strong> Processing is necessary for our legitimate interests</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 mt-4">11.2 Data Protection Officer</h3>
            <p>
              For questions about our privacy practices or to exercise your rights, you can contact our Data Protection 
              Officer at hello@liveprompt.ai.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">11.3 Right to Lodge a Complaint</h3>
            <p>
              You have the right to lodge a complaint with your local supervisory authority if you believe we have 
              violated your privacy rights.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Third-Party Links</h2>
            <p>
              Our Service may contain links to third-party websites or services that are not owned or controlled by us. 
              We have no control over and assume no responsibility for the content, privacy policies, or practices of 
              any third-party websites or services. We encourage you to review the privacy policies of any third-party 
              sites you visit.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Changes to This Privacy Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new 
              Privacy Policy on this page and updating the "Last Updated" date. For material changes, we will provide 
              more prominent notice (including, for certain services, email notification of privacy policy changes).
            </p>
            <p className="mt-4">
              You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy 
              are effective when they are posted on this page.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">14. Contact Information</h2>
            <p>
              If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
            </p>
            <div className="bg-muted p-4 rounded-lg mt-4">
              <p><strong>NexGenAI LLC</strong></p>
              <p>Email: hello@liveprompt.ai</p>
              <p>State of Incorporation: Delaware, United States</p>
            </div>
            <p className="mt-4">
              When contacting us, please include sufficient information for us to identify you and respond to your request.
            </p>
          </section>

          <div className="border-t pt-8 mt-12">
            <p className="text-sm text-muted-foreground text-center">
              By using liveprompt.ai, you acknowledge that you have read, understood, and agree to this Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}