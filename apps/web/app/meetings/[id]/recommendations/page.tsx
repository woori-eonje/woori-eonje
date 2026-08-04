import { redirect } from "next/navigation";

export default async function RecommendationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/meetings/${id}/dashboard?tab=recommendations`);
}
