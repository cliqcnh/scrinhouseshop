"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HomeSlide } from "@/types/catalog";
import { deleteSlide, saveSlide } from "@/actions/admin/slides";

export function SlideManager({ slides }: { slides: HomeSlide[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HomeSlide | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [title, setTitle]             = useState("");
  const [subtitle, setSubtitle]       = useState("");
  const [linkUrl, setLinkUrl]         = useState("/");
  const [buttonText, setButtonText]   = useState("Shop Now");
  const [displayOrder, setDisplayOrder] = useState(0);
  const [isActive, setIsActive]       = useState(true);
  const [imageFile, setImageFile]     = useState<File | null>(null);

  function openCreate() {
    setEditing(null);
    setTitle("");
    setSubtitle("");
    setLinkUrl("/");
    setButtonText("Shop Now");
    setDisplayOrder(0);
    setIsActive(true);
    setImageFile(null);
    setOpen(true);
  }

  function openEdit(slide: HomeSlide) {
    setEditing(slide);
    setTitle(slide.title ?? "");
    setSubtitle(slide.subtitle ?? "");
    setLinkUrl(slide.linkUrl);
    setButtonText(slide.buttonText);
    setDisplayOrder(slide.displayOrder);
    setIsActive(slide.isActive);
    setImageFile(null);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      if (editing) {
        formData.append("id", editing.id);
        formData.append("imageUrl", editing.imageUrl);
      }
      formData.append("title", title);
      formData.append("subtitle", subtitle);
      formData.append("linkUrl", linkUrl);
      formData.append("buttonText", buttonText);
      formData.append("displayOrder", displayOrder.toString());
      formData.append("isActive", isActive ? "true" : "false");
      
      if (imageFile) {
        formData.append("imageFile", imageFile);
      } else if (!editing) {
        toast.error("Please select an image file.");
        setLoading(false);
        return;
      }

      const result = await saveSlide(formData);
      if (!result.success) {
        toast.error(result.error ?? "Failed to save slide");
      } else {
        toast.success(editing ? "Slide updated" : "Slide created");
        setOpen(false);
        router.refresh();
      }
    } catch (err) {
      toast.error("An error occurred while saving the slide.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this slide?")) return;
    const result = await deleteSlide(id);
    if (!result.success) {
      toast.error(result.error ?? "Delete failed");
      return;
    }
    toast.success("Slide deleted");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="gap-1.5 rounded-none">
          <Plus className="size-4" /> Add slide
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit homepage slide" : "New homepage slide"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-4">
            <div className="space-y-1.5">
              <Label htmlFor="slide-image">Slide Image *</Label>
              {editing && !imageFile && (
                <div className="relative h-24 w-40 overflow-hidden rounded-md border border-border bg-muted mb-2">
                  <Image src={editing.imageUrl} alt="Current slide image" fill className="object-cover" />
                </div>
              )}
              <Input
                id="slide-image"
                type="file"
                accept="image/*"
                required={!editing}
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-[10px] text-muted-foreground">Recommended ratio: 16:9 or 4:3. Under 5MB.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slide-title">Caption Title</Label>
              <Input
                id="slide-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Phones & Repairs, Done Right."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slide-subtitle">Caption Description</Label>
              <Input
                id="slide-subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Brand new and UK-used smartphones..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="slide-link">Link URL</Label>
                <Input
                  id="slide-link"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="e.g. /category/phones"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slide-btn">Button Text</Label>
                <Input
                  id="slide-btn"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="e.g. Shop Now"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-center pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="slide-order">Display Order</Label>
                <Input
                  id="slide-order"
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value || "0", 10))}
                />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <Checkbox
                  checked={isActive}
                  onCheckedChange={(v) => setIsActive(v === true)}
                  id="slide-active"
                />
                <Label htmlFor="slide-active" className="cursor-pointer">Active</Label>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full rounded-none mt-2">
              {loading ? "Saving..." : editing ? "Save changes" : "Create slide"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto rounded-lg border border-border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 w-32">Image</th>
              <th className="px-4 py-3">Caption</th>
              <th className="px-4 py-3">Link & Action</th>
              <th className="px-4 py-3 w-24">Order</th>
              <th className="px-4 py-3 w-24">Status</th>
              <th className="px-4 py-3 w-24" />
            </tr>
          </thead>
          <tbody>
            {slides.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No slides uploaded. Homepage will display the fallback default hero banner.
                </td>
              </tr>
            ) : (
              slides.map((slide) => (
                <tr key={slide.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <div className="relative h-14 w-24 overflow-hidden rounded-md border border-border bg-[#f7f7f7]">
                      <Image src={slide.imageUrl} alt={slide.title ?? ""} fill className="object-cover" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="max-w-xs space-y-0.5">
                      <p className="font-semibold text-foreground truncate">{slide.title || "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{slide.subtitle || "—"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs space-y-0.5">
                      <p className="text-foreground"><span className="text-muted-foreground">Link:</span> {slide.linkUrl}</p>
                      <p className="text-foreground"><span className="text-muted-foreground">Btn:</span> {slide.buttonText}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {slide.displayOrder}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      slide.isActive
                        ? "bg-green-500/10 text-green-700"
                        : "bg-yellow-500/10 text-yellow-700"
                    }`}>
                      {slide.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(slide)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleDelete(slide.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
