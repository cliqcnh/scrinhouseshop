import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminPostById } from "@/actions/admin/blog";
import { BlogEditor } from "@/components/admin/blog-editor";

interface EditBlogPostPageProps {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Edit Blog Post - Admin",
};

export default async function EditBlogPostPage({ params }: EditBlogPostPageProps) {
  const { id } = await params;
  const post = await getAdminPostById(id);

  if (!post) {
    notFound();
  }

  return <BlogEditor initialValues={post} />;
}
