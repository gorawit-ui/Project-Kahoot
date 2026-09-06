import PreviewClient from "./preview-client";
import { cookies } from "next/headers";
import { HOST_SESSION_COOKIE, isValidHostSession } from "@/lib/host-auth";

type PreviewPageProps = {
  searchParams: Promise<{ question?: string }>;
};

export default async function PreviewPage({ searchParams }: PreviewPageProps) {
  const session = (await cookies()).get(HOST_SESSION_COOKIE)?.value;
  if (!isValidHostSession(session)) return <main className="page-shell"><section className="shell-content host-login-shell"><div className="panel host-login-card"><div className="eyebrow-small">HOST ONLY</div><h1 className="title">Preview สำหรับ Host</h1><p className="waiting">กรุณาเข้าสู่ Host Control ก่อนจึงจะดู Preview คำถามได้</p><a className="button primary" href="/host">ไปหน้า Host Login</a></div></section></main>;
  const { question } = await searchParams;
  const questionId = Number(question);
  return <PreviewClient initialQuestionId={Number.isInteger(questionId) ? questionId : undefined} />;
}
