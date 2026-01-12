import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function NewTeamRedirect({ params }: PageProps) {
  const { id } = await params
  redirect(`/leagues/${id}/join`)
}
