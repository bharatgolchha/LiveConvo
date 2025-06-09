interface PageProps {
  params: {
    id: string;
  };
}

export default function ConvPage({ params }: PageProps) {
  return (
    <div>
      <h1>Conv Page</h1>
      <p>ID: {params.id}</p>
    </div>
  );
}