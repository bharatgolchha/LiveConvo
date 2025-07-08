'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
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
          <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">
            Effective Date: January 16, 2025 | Last Updated: January 16, 2025
          </p>

          <div className="bg-muted/50 p-6 rounded-lg mb-8">
            <p className="text-sm">
              These Terms of Service ("Terms") govern your use of liveprompt.ai (the "Service") operated by InnoventuresAI Inc., 
              a Delaware limited liability company ("Company", "we", "us", or "our"). By accessing or using our Service, 
              you agree to be bound by these Terms. If you disagree with any part of these terms, then you may not access the Service.
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Service Description</h2>
            <p>
              liveprompt.ai is a real-time conversation coaching application that provides AI-powered guidance during live conversations. 
              Our Service includes:
            </p>
            <ul className="list-disc ml-6 mt-2">
              <li>Real-time speech-to-text transcription using third-party services</li>
              <li>AI-powered conversation guidance and suggestions</li>
              <li>Document and context upload capabilities</li>
              <li>Session recording, management, and analytics</li>
              <li>Post-conversation summaries and timeline generation</li>
              <li>Interactive checklist and task management features</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. User Accounts</h2>
            
            <h3 className="text-xl font-semibold mb-2">2.1 Registration</h3>
            <p>
              To use certain features of the Service, you must register for an account. You agree to:
            </p>
            <ul className="list-disc ml-6 mt-2">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and account</li>
              <li>Accept responsibility for all activities that occur under your account</li>
              <li>Notify us immediately of any unauthorized use of your account</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 mt-4">2.2 Age Requirements</h3>
            <p>
              You must be at least 13 years old to use this Service. By using the Service, you represent and warrant that you 
              meet this age requirement. If you are under 18 years old, you must have your parent or legal guardian's permission 
              to use the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Subscriptions and Payment</h2>
            
            <h3 className="text-xl font-semibold mb-2">3.1 Subscription Plans</h3>
            <p>
              We offer various subscription plans including Free, Pro, and Enterprise tiers. Each plan includes different features 
              and usage limits as described on our pricing page.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">3.2 Billing</h3>
            <ul className="list-disc ml-6">
              <li>Paid subscriptions are billed in advance on a monthly or annual basis</li>
              <li>Subscription fees are non-refundable except as required by law</li>
              <li>We use Stripe as our payment processor. By providing payment information, you agree to Stripe's terms of service</li>
              <li>You authorize us to charge your payment method for all fees and charges</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 mt-4">3.3 Auto-Renewal</h3>
            <p>
              Unless you cancel your subscription before the end of the current billing period, your subscription will automatically 
              renew and you authorize us to charge the payment method on file.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">3.4 Cancellation</h3>
            <p>
              You may cancel your subscription at any time through your account settings. Cancellation will take effect at the end 
              of the current billing period. You will continue to have access to paid features until the end of your billing period.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Privacy and Data Protection</h2>
            
            <h3 className="text-xl font-semibold mb-2">4.1 Data Collection and Use</h3>
            <p>
              Our collection and use of your personal information is governed by our Privacy Policy. By using our Service, 
              you consent to our data practices as described in the Privacy Policy.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">4.2 Recording Consent</h3>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg my-4">
              <p className="font-semibold text-yellow-800 dark:text-yellow-200">Important Notice:</p>
              <p className="text-yellow-700 dark:text-yellow-300 mt-2">
                By using our conversation recording features, you represent and warrant that you have obtained all necessary 
                consents from all participants in any conversation that you record or transcribe using our Service. You are 
                solely responsible for complying with all applicable laws regarding recording conversations, including but not 
                limited to one-party and two-party consent laws in your jurisdiction.
              </p>
            </div>

            <h3 className="text-xl font-semibold mb-2 mt-4">4.3 GDPR Compliance (European Users)</h3>
            <p>
              For users in the European Economic Area (EEA), we process personal data in accordance with the General Data 
              Protection Regulation (GDPR). This includes:
            </p>
            <ul className="list-disc ml-6 mt-2">
              <li>Obtaining explicit consent before processing personal data</li>
              <li>Providing access to your personal data upon request</li>
              <li>Allowing you to correct, delete, or port your personal data</li>
              <li>Implementing appropriate technical and organizational security measures</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 mt-4">4.4 CCPA Compliance (California Users)</h3>
            <p>
              For California residents, we comply with the California Consumer Privacy Act (CCPA). You have the right to:
            </p>
            <ul className="list-disc ml-6 mt-2">
              <li>Know what personal information we collect about you</li>
              <li>Request deletion of your personal information</li>
              <li>Opt-out of the sale of your personal information (we do not sell personal information)</li>
              <li>Non-discrimination for exercising your privacy rights</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 mt-4">4.5 Data Retention</h3>
            <p>
              We retain your personal data and conversation recordings for as long as your account is active or as needed to 
              provide you services. You may request deletion of your data at any time by contacting us at hello@liveprompt.ai.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Acceptable Use Policy</h2>
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc ml-6 mt-2">
              <li>Violate any laws or regulations</li>
              <li>Record conversations without proper consent from all participants</li>
              <li>Infringe upon the rights of others, including privacy and intellectual property rights</li>
              <li>Transmit any harmful, offensive, or illegal content</li>
              <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
              <li>Use the Service for any illegal or unauthorized purpose</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Attempt to reverse engineer or extract source code from our Service</li>
              <li>Use automated systems or software to extract data from the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property Rights</h2>
            
            <h3 className="text-xl font-semibold mb-2">6.1 Our Property</h3>
            <p>
              The Service and its original content (excluding content provided by users), features, and functionality are and 
              will remain the exclusive property of InnoventuresAI Inc. and its licensors. The Service is protected by copyright, 
              trademark, and other laws. Our trademarks and trade dress may not be used in connection with any product or 
              service without our prior written consent.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">6.2 Your Content</h3>
            <p>
              You retain all rights to the content you upload, record, or create using our Service ("User Content"). By using 
              our Service, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and display 
              your User Content solely for the purpose of providing and improving the Service.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">6.3 AI Training</h3>
            <p>
              We do not use your conversation recordings or transcripts to train our AI models without your explicit consent. 
              Any use of data for model improvement will be anonymized and aggregated, and you may opt-out of such use in your 
              account settings.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">6.4 Feedback</h3>
            <p>
              Any feedback, suggestions, or ideas you provide about the Service becomes our property and may be used without 
              restriction or compensation to you.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Third-Party Services</h2>
            <p>
              Our Service integrates with various third-party services including but not limited to:
            </p>
            <ul className="list-disc ml-6 mt-2">
              <li><strong>Deepgram</strong> for speech-to-text transcription</li>
              <li><strong>OpenRouter/Google Gemini</strong> for AI processing</li>
              <li><strong>Supabase</strong> for database and authentication</li>
              <li><strong>Stripe</strong> for payment processing</li>
            </ul>
            <p className="mt-4">
              Your use of these integrated services is subject to their respective terms of service and privacy policies. 
              We are not responsible for the practices of these third-party services.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Disclaimers and Limitations</h2>
            
            <h3 className="text-xl font-semibold mb-2">8.1 No Professional Advice</h3>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg my-4">
              <p className="font-semibold text-red-800 dark:text-red-200">Disclaimer:</p>
              <p className="text-red-700 dark:text-red-300 mt-2">
                The AI-generated guidance provided by our Service is for informational purposes only and should not be 
                considered professional advice. We do not provide legal, medical, financial, or other professional advice. 
                Always consult with qualified professionals for specific advice related to your situation.
              </p>
            </div>

            <h3 className="text-xl font-semibold mb-2 mt-4">8.2 Service Availability</h3>
            <p>
              We strive to provide reliable service but do not guarantee uninterrupted or error-free operation. The Service 
              is provided "as is" and "as available" without warranties of any kind.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">8.3 Accuracy</h3>
            <p>
              While we use advanced AI and transcription technologies, we do not guarantee 100% accuracy in transcriptions, 
              AI suggestions, or any other output from the Service. Users should verify important information independently.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">8.4 Usage Limits</h3>
            <p>
              Each subscription plan includes specific usage limits for audio hours, sessions, and storage. Exceeding these 
              limits may result in service interruption or additional charges.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL INNOVENTURESAI INC., ITS DIRECTORS, EMPLOYEES, PARTNERS, 
              AGENTS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE 
              DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, 
              RESULTING FROM YOUR USE OF THE SERVICE.
            </p>
            <p className="mt-4">
              IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE AMOUNT PAID BY YOU TO US IN THE TWELVE (12) MONTHS PRECEDING 
              THE EVENT GIVING RISE TO THE LIABILITY.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Indemnification</h2>
            <p>
              You agree to defend, indemnify, and hold harmless InnoventuresAI Inc. and its officers, directors, employees, agents, 
              and affiliates from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, 
              or fees arising out of or relating to your violation of these Terms or your use of the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Termination</h2>
            
            <h3 className="text-xl font-semibold mb-2">11.1 Termination by You</h3>
            <p>
              You may terminate your account at any time by contacting us at hello@liveprompt.ai or through your account settings.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">11.2 Termination by Us</h3>
            <p>
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, 
              including without limitation if you breach the Terms.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">11.3 Effect of Termination</h3>
            <p>
              Upon termination, your right to use the Service will cease immediately. We may delete your account and data after 
              a reasonable period, unless retention is required by law. You may request an export of your data before termination.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Dispute Resolution</h2>
            
            <h3 className="text-xl font-semibold mb-2">12.1 Governing Law</h3>
            <p>
              These Terms shall be governed and construed in accordance with the laws of the State of Delaware, United States, 
              without regard to its conflict of law provisions.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">12.2 Arbitration</h3>
            <p>
              Any dispute arising out of or relating to these Terms or the Service shall be resolved through binding arbitration 
              in accordance with the rules of the American Arbitration Association. The arbitration shall be conducted in 
              Delaware, and judgment on the arbitration award may be entered into any court having jurisdiction thereof.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">12.3 Class Action Waiver</h3>
            <p>
              You agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a 
              class, consolidated, or representative action.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. General Provisions</h2>
            
            <h3 className="text-xl font-semibold mb-2">13.1 Changes to Terms</h3>
            <p>
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide 
              at least 30 days notice prior to any new terms taking effect. Continued use of the Service after changes 
              constitutes acceptance of the new Terms.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">13.2 Severability</h3>
            <p>
              If any provision of these Terms is held to be unenforceable or invalid, such provision will be changed and 
              interpreted to accomplish the objectives of such provision to the greatest extent possible under applicable law, 
              and the remaining provisions will continue in full force and effect.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">13.3 Entire Agreement</h3>
            <p>
              These Terms constitute the entire agreement between you and InnoventuresAI Inc. regarding the use of the Service, 
              superseding any prior agreements.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">13.4 Waiver</h3>
            <p>
              Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">13.5 Assignment</h3>
            <p>
              You may not assign or transfer these Terms or your rights under them without our prior written consent. We may 
              assign our rights and obligations without restriction.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">14. Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="bg-muted p-4 rounded-lg mt-4">
              <p><strong>InnoventuresAI Inc.</strong></p>
              <p>Email: hello@liveprompt.ai</p>
              <p>State of Incorporation: Delaware, United States</p>
            </div>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">15. Special Provisions</h2>
            
            <h3 className="text-xl font-semibold mb-2">15.1 HIPAA Compliance</h3>
            <p>
              Our Service is not HIPAA-compliant by default. If you require HIPAA compliance for healthcare-related conversations, 
              please contact us for our Enterprise plan which includes a Business Associate Agreement (BAA).
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">15.2 Export Controls</h3>
            <p>
              You may not use or export the Service in violation of U.S. export laws and regulations.
            </p>

            <h3 className="text-xl font-semibold mb-2 mt-4">15.3 Government Use</h3>
            <p>
              If you are a U.S. government entity, these Terms shall be governed by the laws of the United States of America 
              without reference to conflict of laws. You acknowledge that the Service is "commercial computer software" and 
              "commercial computer software documentation."
            </p>
          </section>

          <div className="border-t pt-8 mt-12">
            <p className="text-sm text-muted-foreground text-center">
              By using liveprompt.ai, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}