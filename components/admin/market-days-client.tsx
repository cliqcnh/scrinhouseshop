"use client";

import { useEffect, useState } from "react";
import {
  saveMarketEvent,
  deleteMarketEvent,
  getEventProducts,
  addEventProduct,
  deleteEventProduct,
  type AdminEventRow,
  type AdminMarketStats,
} from "@/actions/admin/market-days";
import { formatPrice } from "@/utils/format";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Calendar,
  Hammer,
  Percent,
  TrendingUp,
  DollarSign,
  TrendingDown,
  Loader2,
  Trash,
  Plus,
  Edit2,
  ToggleLeft,
  Users,
  Award,
} from "lucide-react";

interface EventProduct {
  id: string;
  sale_type: string;
  products: {
    id: string;
    name: string;
    sku: string;
    base_price: number;
  } | null;
  discount_rules: Array<{
    id: string;
    discount_percent: number | null;
    fixed_price: number | null;
    limit_quantity: number;
    limit_per_customer: number;
    stock_remaining: number;
    is_featured: boolean;
    priority: number;
  }> | null;
  auction_items: Array<{
    id: string;
    starting_price: number;
    reserve_price: number;
    min_increment: number;
    start_time: string;
    end_time: string;
    buy_now_price: number | null;
    auto_extend_minutes: number;
    is_featured: boolean;
    status: string;
  }> | null;
}

interface MarketDaysAdminClientProps {
  initialStats: AdminMarketStats;
  initialEvents: AdminEventRow[];
  availableProducts: Array<{ id: string; name: string; sku: string; base_price: number }>;
}

export function MarketDaysAdminClient({
  initialStats,
  initialEvents,
  availableProducts,
}: MarketDaysAdminClientProps) {
  const [stats, setStats] = useState<AdminMarketStats>(initialStats);
  const [events, setEvents] = useState<AdminEventRow[]>(initialEvents);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [eventProducts, setEventProducts] = useState<EventProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [activeTab, setActiveTab] = useState<"events" | "items">("events");

  // Event modal state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    id: "",
    day: "tuesday",
    startTime: "09:00:00",
    endTime: "21:00:00",
    title: "",
    bannerUrl: "",
    announcement: "",
    isEnabled: true,
  });

  // Product assignment modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState({
    productId: "",
    saleType: "discount" as "discount" | "auction",
    discountPercent: 10,
    fixedPrice: 0,
    limitQuantity: 10,
    limitPerCustomer: 1,
    isFeatured: false,
    priority: 0,
    startingPrice: 10,
    reservePrice: 10,
    minIncrement: 5,
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    buyNowPrice: 0,
    autoExtendMinutes: 5,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set default selected event
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  // Load products for selected event
  useEffect(() => {
    if (selectedEventId) {
      loadEventProducts(selectedEventId);
    }
  }, [selectedEventId]);

  async function loadEventProducts(eventId: string) {
    setIsLoadingProducts(true);
    try {
      const data = await getEventProducts(eventId);
      setEventProducts(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load products for this event.");
    } finally {
      setIsLoadingProducts(false);
    }
  }

  // Handle Event Submit
  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await saveMarketEvent({
        id: eventForm.id || undefined,
        day: eventForm.day,
        startTime: eventForm.startTime,
        endTime: eventForm.endTime,
        title: eventForm.title,
        bannerUrl: eventForm.bannerUrl || null,
        announcement: eventForm.announcement || null,
        isEnabled: eventForm.isEnabled,
      });

      if (res.success) {
        toast.success(eventForm.id ? "Event updated successfully!" : "Event created successfully!");
        setIsEventModalOpen(false);
        // Refresh listings
        window.location.reload();
      } else {
        toast.error(res.error ?? "Failed to save event.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEvent = (ev: AdminEventRow) => {
    setEventForm({
      id: ev.id,
      day: ev.day,
      startTime: ev.startTime,
      endTime: ev.endTime,
      title: ev.title,
      bannerUrl: ev.bannerUrl || "",
      announcement: ev.announcement || "",
      isEnabled: ev.isEnabled,
    });
    setIsEventModalOpen(true);
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event? This will delete all product associations.")) return;
    try {
      const res = await deleteMarketEvent(id);
      if (res.success) {
        toast.success("Event deleted.");
        window.location.reload();
      } else {
        toast.error(res.error ?? "Failed to delete.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    }
  };

  // Handle Product Allocation Submit
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      toast.error("Please select an event first.");
      return;
    }
    if (!productForm.productId) {
      toast.error("Please select a product.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addEventProduct(selectedEventId, productForm.productId, productForm.saleType, {
        discountPercent: productForm.discountPercent,
        fixedPrice: productForm.fixedPrice > 0 ? productForm.fixedPrice : undefined,
        limitQuantity: productForm.limitQuantity,
        limitPerCustomer: productForm.limitPerCustomer,
        isFeatured: productForm.isFeatured,
        priority: productForm.priority,
        startingPrice: productForm.startingPrice,
        reservePrice: productForm.reservePrice,
        minIncrement: productForm.minIncrement,
        startTime: new Date(productForm.startTime).toISOString(),
        endTime: new Date(productForm.endTime).toISOString(),
        buyNowPrice: productForm.buyNowPrice > 0 ? productForm.buyNowPrice : undefined,
        autoExtendMinutes: productForm.autoExtendMinutes,
      });

      if (res.success) {
        toast.success("Product successfully allocated to event.");
        setIsProductModalOpen(false);
        loadEventProducts(selectedEventId);
      } else {
        toast.error(res.error ?? "Failed to allocate product.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (mpId: string) => {
    if (!confirm("Remove this product from the event?")) return;
    try {
      const res = await deleteEventProduct(mpId);
      if (res.success) {
        toast.success("Product removed from event.");
        loadEventProducts(selectedEventId);
      } else {
        toast.error(res.error ?? "Failed to remove product.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An unexpected error occurred.");
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Stats Workspace Overview Grid ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-7">
        <Card className="p-4 shadow-sm bg-card border">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs uppercase font-bold text-muted-foreground">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-2xl font-extrabold">{stats.upcomingEventsCount}</div>
            <p className="text-[10px] text-muted-foreground">Scheduled Events</p>
          </CardContent>
        </Card>

        <Card className="p-4 shadow-sm bg-card border">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs uppercase font-bold text-muted-foreground">Auctions</CardTitle>
            <Hammer className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-2xl font-extrabold">{stats.activeAuctionsCount}</div>
            <p className="text-[10px] text-muted-foreground">Live Bidding Wars</p>
          </CardContent>
        </Card>

        <Card className="p-4 shadow-sm bg-card border">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs uppercase font-bold text-muted-foreground">Discounts</CardTitle>
            <Percent className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-2xl font-extrabold">{stats.discountProductsCount}</div>
            <p className="text-[10px] text-muted-foreground">Allocated Deals</p>
          </CardContent>
        </Card>

        <Card className="p-4 shadow-sm bg-card border">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs uppercase font-bold text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-2xl font-extrabold text-green-600">{formatPrice(stats.revenue)}</div>
            <p className="text-[10px] text-muted-foreground">Event Revenue</p>
          </CardContent>
        </Card>

        <Card className="p-4 shadow-sm bg-card border">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs uppercase font-bold text-muted-foreground">Auction Rev</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-2xl font-extrabold">{formatPrice(stats.auctionRevenue)}</div>
            <p className="text-[10px] text-muted-foreground">Highest Bid Payouts</p>
          </CardContent>
        </Card>

        <Card className="p-4 shadow-sm bg-card border">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs uppercase font-bold text-muted-foreground">Total Bids</CardTitle>
            <Award className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-2xl font-extrabold">{stats.totalBidsCount}</div>
            <p className="text-[10px] text-muted-foreground">Unique Bids Placed</p>
          </CardContent>
        </Card>

        <Card className="p-4 shadow-sm bg-card border">
          <CardHeader className="p-0 flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs uppercase font-bold text-muted-foreground">Shoppers</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="p-0 pt-1">
            <div className="text-2xl font-extrabold">{stats.visitorsCount}</div>
            <p className="text-[10px] text-muted-foreground">Estimated visitors</p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("events")}
          className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "events"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Scheduled Events
        </button>
        <button
          onClick={() => setActiveTab("items")}
          className={`px-5 py-2.5 text-sm font-bold border-b-2 transition-colors ${
            activeTab === "items"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Assigned Deals &amp; Auctions
        </button>
      </div>

      {/* ── TAB 1: EVENTS ─────────────────────────────────────────── */}
      {activeTab === "events" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-foreground">Active Schedules</h2>
            <Button
              onClick={() => {
                setEventForm({
                  id: "",
                  day: "tuesday",
                  startTime: "09:00:00",
                  endTime: "21:00:00",
                  title: "",
                  bannerUrl: "",
                  announcement: "",
                  isEnabled: true,
                });
                setIsEventModalOpen(true);
              }}
              size="sm"
              className="font-bold flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Create Event
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-xs uppercase font-bold text-muted-foreground">
                  <th className="p-4">Title / Announcement</th>
                  <th className="p-4">Day</th>
                  <th className="p-4">Time window (UTC)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No events registered yet. Click Create Event to get started.
                    </td>
                  </tr>
                ) : (
                  events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-muted/10">
                      <td className="p-4">
                        <div className="font-bold text-foreground">{ev.title}</div>
                        {ev.announcement && <div className="text-xs text-muted-foreground line-clamp-1">{ev.announcement}</div>}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="uppercase font-bold">
                          {ev.day}
                        </Badge>
                      </td>
                      <td className="p-4 font-mono text-xs">
                        {ev.startTime} - {ev.endTime}
                      </td>
                      <td className="p-4">
                        <Badge variant={ev.isEnabled ? "default" : "outline"} className="font-bold">
                          {ev.isEnabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEditEvent(ev)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-500 border-red-500/20 hover:bg-red-500/5" onClick={() => handleDeleteEvent(ev.id)}>
                          <Trash className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: ASSIGNED PRODUCTS ───────────────────────────────── */}
      {activeTab === "items" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 border border-border p-4 rounded-xl">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Choose Event:</label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full sm:w-64 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-semibold"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.day.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={() => {
                setProductForm({
                  productId: "",
                  saleType: "discount",
                  discountPercent: 15,
                  fixedPrice: 0,
                  limitQuantity: 10,
                  limitPerCustomer: 1,
                  isFeatured: false,
                  priority: 0,
                  startingPrice: 100,
                  reservePrice: 150,
                  minIncrement: 10,
                  startTime: new Date().toISOString().slice(0, 16),
                  endTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
                  buyNowPrice: 0,
                  autoExtendMinutes: 5,
                });
                setIsProductModalOpen(true);
              }}
              size="sm"
              disabled={events.length === 0}
              className="font-bold flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Allocate Product
            </Button>
          </div>

          {selectedEventId && (
            <div className="space-y-8">
              {/* Discount Products List */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Percent className="h-4.5 w-4.5 text-red-500" /> Discount Deals Allocated
                </h3>
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border text-xs uppercase font-bold text-muted-foreground">
                        <th className="p-4">Product Name</th>
                        <th className="p-4">Original Price</th>
                        <th className="p-4">Flash Sale Price</th>
                        <th className="p-4">Limit / Customer</th>
                        <th className="p-4">Stock remaining</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {eventProducts.filter((p) => p.sale_type === "discount").length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-muted-foreground">
                            No discount deals added for this event.
                          </td>
                        </tr>
                      ) : (
                        eventProducts
                          .filter((p) => p.sale_type === "discount")
                          .map((mp) => {
                            const p = mp.products;
                            const r = mp.discount_rules?.[0];
                            const discountPrice = r?.fixed_price 
                              ? Number(r.fixed_price) 
                              : Number(p?.base_price ?? 0) * (1 - Number(r?.discount_percent ?? 0) / 100);

                            return (
                              <tr key={mp.id} className="hover:bg-muted/10">
                                <td className="p-4 font-bold text-foreground">
                                  {p?.name} <span className="font-mono text-xs text-muted-foreground ml-1">({p?.sku})</span>
                                </td>
                                <td className="p-4 opacity-70 line-through">{formatPrice(Number(p?.base_price))}</td>
                                <td className="p-4 font-bold text-green-600">
                                  {formatPrice(discountPrice)}
                                  {r?.discount_percent && <span className="text-[10px] ml-1 bg-red-100 text-red-600 px-1 py-0.5 rounded font-black">-{r.discount_percent}%</span>}
                                </td>
                                <td className="p-4">{r?.limit_per_customer ?? 0}</td>
                                <td className="p-4 font-mono font-semibold">{r?.stock_remaining ?? 0} / {r?.limit_quantity ?? 0}</td>
                                <td className="p-4 text-right">
                                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteProduct(mp.id)}>
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Auction items list */}
              <div className="space-y-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Hammer className="h-4.5 w-4.5 text-amber-500" /> Live Auctions Allocated
                </h3>
                <div className="overflow-x-auto rounded-xl border border-border bg-card">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border text-xs uppercase font-bold text-muted-foreground">
                        <th className="p-4">Product Name</th>
                        <th className="p-4">Starting Price</th>
                        <th className="p-4">Min Incr.</th>
                        <th className="p-4">Timeline</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {eventProducts.filter((p) => p.sale_type === "auction").length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-muted-foreground">
                            No auction items added for this event.
                          </td>
                        </tr>
                      ) : (
                        eventProducts
                          .filter((p) => p.sale_type === "auction")
                          .map((mp) => {
                            const p = mp.products;
                            const a = mp.auction_items?.[0];
                            const startStr = a?.start_time ? new Date(a.start_time).toLocaleDateString() : "—";
                            const endStr = a?.end_time ? new Date(a.end_time).toLocaleDateString() : "—";

                            return (
                              <tr key={mp.id} className="hover:bg-muted/10">
                                <td className="p-4 font-bold text-foreground">
                                  {p?.name} <span className="font-mono text-xs text-muted-foreground ml-1">({p?.sku})</span>
                                </td>
                                <td className="p-4 font-bold">{formatPrice(Number(a?.starting_price ?? 0))}</td>
                                <td className="p-4">{formatPrice(Number(a?.min_increment ?? 0))}</td>
                                <td className="p-4 text-xs font-mono">
                                  {startStr} - {endStr}
                                </td>
                                <td className="p-4">
                                  <Badge variant={a?.status === "active" ? "default" : "secondary"} className="uppercase font-bold">
                                    {a?.status ?? "pending"}
                                  </Badge>
                                </td>
                                <td className="p-4 text-right">
                                  <Button variant="ghost" size="sm" className="text-red-500" onClick={() => handleDeleteProduct(mp.id)}>
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL 1: CREATE / EDIT EVENT ────────────────────────────── */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-xl p-6 relative">
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">
              {eventForm.id ? "Edit Market Event" : "Create Market Event"}
            </h3>

            <form onSubmit={handleEventSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-muted-foreground">Select Day</label>
                  <select
                    value={eventForm.day}
                    onChange={(e) => setEventForm({ ...eventForm, day: e.target.value })}
                    className="w-full rounded-md border border-border bg-muted/20 px-3 py-2 text-sm font-semibold text-foreground"
                  >
                    <option value="monday">Monday</option>
                    <option value="tuesday">Tuesday</option>
                    <option value="wednesday">Wednesday</option>
                    <option value="thursday">Thursday</option>
                    <option value="friday">Friday</option>
                    <option value="saturday">Saturday</option>
                    <option value="sunday">Sunday</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-muted-foreground">Title</label>
                  <Input
                    required
                    value={eventForm.title}
                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                    placeholder="e.g. Saturday Flash Frenzy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-muted-foreground">Start Time (UTC)</label>
                  <Input
                    type="time"
                    required
                    value={eventForm.startTime}
                    onChange={(e) => setEventForm({ ...eventForm, startTime: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-muted-foreground">End Time (UTC)</label>
                  <Input
                    type="time"
                    required
                    value={eventForm.endTime}
                    onChange={(e) => setEventForm({ ...eventForm, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-muted-foreground">Announcement banner text</label>
                <Input
                  value={eventForm.announcement}
                  onChange={(e) => setEventForm({ ...eventForm, announcement: e.target.value })}
                  placeholder="e.g. Exclusive 15% discount on all original GX screens today only!"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-muted-foreground">Banner Image URL</label>
                <Input
                  value={eventForm.bannerUrl}
                  onChange={(e) => setEventForm({ ...eventForm, bannerUrl: e.target.value })}
                  placeholder="https://example.com/banner.jpg"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isEnabled"
                  checked={eventForm.isEnabled}
                  onChange={(e) => setEventForm({ ...eventForm, isEnabled: e.target.checked })}
                  className="rounded border-border"
                />
                <label htmlFor="isEnabled" className="text-sm font-semibold text-foreground">
                  Enable Event Schedule
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsEventModalOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Save Event
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ALLOCATE PRODUCT TO EVENT ────────────────────────── */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-xl p-6 relative max-h-[90vh] overflow-y-auto">
            <h3 className="font-heading text-lg font-bold text-foreground mb-4">Allocate Product to Event</h3>

            <form onSubmit={handleProductSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-muted-foreground">Select Product</label>
                <select
                  required
                  value={productForm.productId}
                  onChange={(e) => setProductForm({ ...productForm, productId: e.target.value })}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold"
                >
                  <option value="">-- Select a catalog item --</option>
                  {availableProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) — GHS {p.base_price}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-muted-foreground">Sale Strategy Type</label>
                <select
                  value={productForm.saleType}
                  onChange={(e) => setProductForm({ ...productForm, saleType: e.target.value as "discount" | "auction" })}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold"
                >
                  <option value="discount">Discount Deal (Flash Sale)</option>
                  <option value="auction">Live Bidding Auction</option>
                </select>
              </div>

              {/* Discount Fields */}
              {productForm.saleType === "discount" ? (
                <div className="space-y-4 border-t border-border pt-4 mt-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase font-bold text-muted-foreground">Discount Percent (%)</label>
                      <Input
                        type="number"
                        min="1"
                        max="99"
                        value={productForm.discountPercent}
                        onChange={(e) => setProductForm({ ...productForm, discountPercent: Number(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase font-bold text-muted-foreground">Fixed Price (GHS, Optional)</label>
                      <Input
                        type="number"
                        min="0"
                        value={productForm.fixedPrice}
                        onChange={(e) => setProductForm({ ...productForm, fixedPrice: Number(e.target.value) })}
                        placeholder="Leave empty for percent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase font-bold text-muted-foreground">Total Flash stock Quantity</label>
                      <Input
                        type="number"
                        min="1"
                        value={productForm.limitQuantity}
                        onChange={(e) => setProductForm({ ...productForm, limitQuantity: Number(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase font-bold text-muted-foreground">Limit per Customer</label>
                      <Input
                        type="number"
                        min="1"
                        value={productForm.limitPerCustomer}
                        onChange={(e) => setProductForm({ ...productForm, limitPerCustomer: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Auction Fields */
                <div className="space-y-4 border-t border-border pt-4 mt-2">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase font-bold text-muted-foreground">Starting price</label>
                      <Input
                        type="number"
                        min="1"
                        value={productForm.startingPrice}
                        onChange={(e) => setProductForm({ ...productForm, startingPrice: Number(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase font-bold text-muted-foreground">Reserve price</label>
                      <Input
                        type="number"
                        min="1"
                        value={productForm.reservePrice}
                        onChange={(e) => setProductForm({ ...productForm, reservePrice: Number(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase font-bold text-muted-foreground">Min Increment</label>
                      <Input
                        type="number"
                        min="1"
                        value={productForm.minIncrement}
                        onChange={(e) => setProductForm({ ...productForm, minIncrement: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase font-bold text-muted-foreground">Start Time</label>
                      <Input
                        type="datetime-local"
                        value={productForm.startTime}
                        onChange={(e) => setProductForm({ ...productForm, startTime: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase font-bold text-muted-foreground">End Time</label>
                      <Input
                        type="datetime-local"
                        value={productForm.endTime}
                        onChange={(e) => setProductForm({ ...productForm, endTime: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs uppercase font-bold text-muted-foreground">Auto Extend (Mins)</label>
                      <Input
                        type="number"
                        min="0"
                        value={productForm.autoExtendMinutes}
                        onChange={(e) => setProductForm({ ...productForm, autoExtendMinutes: Number(e.target.value) })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs uppercase font-bold text-muted-foreground">Buy Now (Optional)</label>
                      <Input
                        type="number"
                        min="0"
                        value={productForm.buyNowPrice}
                        onChange={(e) => setProductForm({ ...productForm, buyNowPrice: Number(e.target.value) })}
                        placeholder="Price to end auction early"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setIsProductModalOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Allocate Item
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
