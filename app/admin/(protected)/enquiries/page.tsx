import { listEnquiries } from "@/actions/admin/enquiries";
import { EnquiriesClient } from "@/components/admin/enquiries-client";

export const metadata = { title: "Enquiries" };

export default async function EnquiriesPage() {
  const enquiries = await listEnquiries();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Customer Enquiries</h1>
        <p className="text-sm text-muted-foreground">
          View and respond to inquiries about catalog products from storefront customers.
        </p>
      </div>

      <EnquiriesClient initialEnquiries={enquiries} />
    </div>
  );
}
