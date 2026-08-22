import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/post-editor";
import { getPostForAdmin } from "@/lib/cms";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric)) notFound();

  const post = await getPostForAdmin(numeric);
  if (!post) notFound();

  return <PostEditor post={post} />;
}
