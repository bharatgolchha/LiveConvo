'use client';

export default function ConversationTestPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Conversation Route Test</h1>
        <p className="text-muted-foreground">
          If you can see this, the /conversation route is working!
        </p>
        <div className="mt-8">
          <a href="/conversation" className="text-blue-500 hover:underline">
            Go to Conversation Page →
          </a>
        </div>
      </div>
    </div>
  );
}