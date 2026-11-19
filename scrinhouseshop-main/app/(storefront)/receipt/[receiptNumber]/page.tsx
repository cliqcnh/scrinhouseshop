import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ receiptNumber: string }>;
}

export default async function ShortReceiptRedirectPage({ params }: Props) {
  const { receiptNumber } = await params;
  redirect(`/verify/receipt/${receiptNumber}`);
}
