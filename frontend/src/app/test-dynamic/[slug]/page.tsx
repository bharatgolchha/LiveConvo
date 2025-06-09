export default function TestDynamicPage({ params }: { params: { slug: string } }) {
  return <h1>Test Dynamic: {params.slug}</h1>;
}