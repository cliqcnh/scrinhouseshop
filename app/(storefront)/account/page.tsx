import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, Heart, MapPin, ShieldCheck, User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { signOut } from "@/actions/auth/customer";
import { formatDate, formatPrice } from "@/utils/format";
import { getCustomerOrders, getCustomerWarranties } from "@/actions/storefront/dashboard";
import { getWishlistProducts } from "@/actions/storefront/wishlist";
import { getAddresses } from "@/actions/storefront/addresses";
import { AddressManagerClient } from "@/components/account/address-manager-client";
import { ProductCard } from "@/components/shared/product-card";

export const metadata: Metadata = { title: "My Account" };

interface Props {
  searchParams: Promise<{ welcome?: string; tab?: string }>;
}

export default async function AccountPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?next=/account");

  const { welcome, tab = "orders" } = await searchParams;

  // Parallel loading of all dashboard data
  const [profile, orders, wishlistProducts, addresses, warranties] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone, created_at")
      .eq("id", user.id)
      .maybeSingle()
      .then((r) => r.data),
    getCustomerOrders(),
    getWishlistProducts(),
    getAddresses(),
    getCustomerWarranties(),
  ]);

  // Tab links
  const tabs = [
    { id: "orders", label: "Orders", icon: Package, count: orders.length },
    { id: "wishlist", label: "Wishlist", icon: Heart, count: wishlistProducts.length },
    { id: "addresses", label: "Addresses", icon: MapPin, count: addresses.length },
    { id: "warranties", label: "Warranties", icon: ShieldCheck, count: warranties.length },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {welcome === "1" && (
        <div className="mb-6 rounded border border-border bg-muted px-4 py-3 text-sm text-foreground">
          Welcome to ScrinHouse! Your account is ready.
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">My Account</h1>
          <p className="text-xs text-muted-foreground mt-1">Manage your orders, wishlist, addresses and device warranties.</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-12">
        {/* ── Left Sidebar (col-span-3): Navigation & Profile info ── */}
        <aside className="md:col-span-3 space-y-6">
          {/* Tabs Menu */}
          <nav className="flex flex-row md:flex-col gap-1 border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 md:pr-4 overflow-x-auto">
            {tabs.map((t) => {
              const active = tab === t.id;
              return (
                <Link
                  key={t.id}
                  href={`/account?tab=${t.id}`}
                  className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors shrink-0 ${
                    active
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <t.icon className="size-4" />
                  <span>{t.label}</span>
                  {t.count > 0 && (
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      active ? "bg-background text-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {t.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Profile Card */}
          <section className="border border-border p-5 space-y-3 bg-background">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <User className="size-4 text-muted-foreground" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">My Profile</h2>
            </div>
            <dl className="space-y-2 text-xs">
              <div>
                <dt className="text-muted-foreground">Full Name</dt>
                <dd className="text-foreground font-medium mt-0.5">{profile?.full_name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Email</dt>
                <dd className="text-foreground font-medium mt-0.5 truncate">{user.email}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="text-foreground font-medium mt-0.5">{profile?.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Member Since</dt>
                <dd className="text-foreground font-medium mt-0.5">
                  {profile?.created_at ? formatDate(profile.created_at) : "—"}
                </dd>
              </div>
            </dl>
          </section>
        </aside>

        {/* ── Right Content Area (col-span-9) ── */}
        <main className="md:col-span-9">
          {/* TAB: ORDERS */}
          {tab === "orders" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Order History</h2>
              {orders.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center border border-border">
                  <Package className="size-9 text-muted-foreground/30" strokeWidth={1} />
                  <p className="text-sm text-muted-foreground">You haven&apos;t placed any orders yet.</p>
                  <Button size="sm" className="mt-1 rounded-none" render={<Link href="/category/phones" />}>
                    Shop now
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border border border-border">
                  {orders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/order/${order.id}`}
                      className="flex items-center justify-between px-5 py-4 text-sm hover:bg-muted/40 transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-semibold text-foreground">{formatPrice(order.total)}</p>
                        <p className={`text-xs font-medium capitalize rounded-full px-2 py-0.5 inline-block ${
                          order.status === "paid" || order.status === "delivered"
                            ? "bg-green-500/10 text-green-700"
                            : order.status === "cancelled"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-yellow-500/10 text-yellow-700"
                        }`}>
                          {order.status.replace(/_/g, " ")}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: WISHLIST */}
          {tab === "wishlist" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">My Wishlist</h2>
              {wishlistProducts.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center border border-border">
                  <Heart className="size-9 text-muted-foreground/30" strokeWidth={1} />
                  <p className="text-sm text-muted-foreground">Your wishlist is empty.</p>
                  <Button size="sm" className="mt-1 rounded-none" render={<Link href="/category/phones" />}>
                    Add items
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
                  {wishlistProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: ADDRESSES */}
          {tab === "addresses" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Saved Addresses</h2>
              <AddressManagerClient initialAddresses={addresses} />
            </div>
          )}

          {/* TAB: WARRANTIES */}
          {tab === "warranties" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground">Product Warranties</h2>
              {warranties.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center border border-border">
                  <ShieldCheck className="size-9 text-muted-foreground/30" strokeWidth={1} />
                  <p className="text-sm text-muted-foreground">You don&apos;t have any active warranties registered.</p>
                  <p className="text-xs text-muted-foreground max-w-xs">Warranties are automatically generated and linked to your account when purchasing phones.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-border bg-background rounded">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/20">
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">IMEI / Serial</th>
                        <th className="px-4 py-3">Duration</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {warranties.map((w) => {
                        const daysLeft = Math.max(
                          0,
                          Math.ceil((new Date(w.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        );
                        return (
                          <tr key={w.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3.5 font-medium text-foreground">
                              {w.productSlug ? (
                                <Link href={`/products/${w.productSlug}`} className="hover:underline">
                                  {w.productName}
                                </Link>
                              ) : (
                                w.productName
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground font-mono text-xs">{w.imeiSerial}</td>
                            <td className="px-4 py-3.5 text-muted-foreground">
                              <p className="text-xs">{formatDate(w.startsAt)} to</p>
                              <p className="text-xs font-semibold text-foreground">{formatDate(w.endsAt)}</p>
                            </td>
                            <td className="px-4 py-3.5">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                w.status === "active" && daysLeft > 0
                                  ? "bg-green-500/10 text-green-700"
                                  : "bg-yellow-500/10 text-yellow-700"
                              }`}>
                                {w.status === "active" && daysLeft > 0 ? `Active (${daysLeft}d left)` : "Expired"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
