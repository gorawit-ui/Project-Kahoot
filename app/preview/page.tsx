import PreviewClient from "./preview-client";

type PreviewPageProps = {
  searchParams: Promise<{ question?: string }>;
};

export default async function PreviewPage({ searchParams }: PreviewPageProps) {
  const { question } = await searchParams;
  const questionId = Number(question);
  return <PreviewClient initialQuestionId={Number.isInteger(questionId) ? questionId : undefined} />;
}
