'use client';

export default function ConvoTestPage({ params }: { params: { id: string } }) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Convo Test Page</h1>
      <p>ID: {params.id}</p>
    </div>
  );
}