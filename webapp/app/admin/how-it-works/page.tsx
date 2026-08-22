import { HowItWorksEditor } from "@/components/admin/hiw-editor";
import { getHowItWorksForAdmin } from "@/lib/cms";

export default async function AdminHowItWorksPage() {
  // Defaults come from the seed when `site_content` has never been written, so
  // the form opens populated with exactly what the live page is showing rather
  // than empty — the editor edits reality, not a blank slate.
  const content = await getHowItWorksForAdmin();
  return <HowItWorksEditor initial={content} />;
}
