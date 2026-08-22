import { PostEditor } from "@/components/admin/post-editor";

export default function NewPostPage() {
  // `null` puts the editor in create mode: no delete button, no "view post"
  // link, and the slug tracks the title until it is edited by hand.
  return <PostEditor post={null} />;
}
