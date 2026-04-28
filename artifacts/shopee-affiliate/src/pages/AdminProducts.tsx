import { useState } from "react";
import { Link } from "wouter";
import { Layout } from "@/components/layout/Layout";
import { useAdminListProducts, usePublishProduct, useDeleteProduct } from "@workspace/api-client-react";
import { getAdminToken } from "@/hooks/use-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatIdr, formatNumber } from "@/lib/format";
import { Eye, MousePointerClick, Trash2, CheckCircle2, ExternalLink, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminProducts() {
  const { toast } = useToast();
  const token = getAdminToken();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useAdminListProducts(
    { page, limit: 20, status },
    { query: { queryKey: ["adminProducts", page, status] } } as any
  );

  const publishMutation = usePublishProduct();
  const deleteMutation = useDeleteProduct();

  const handlePublish = (id: string) => {
    publishMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Produk dipublish!" });
          refetch();
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Produk dihapus" });
          setDeleteId(null);
          refetch();
        },
        onError: () => {
          toast({ title: "Gagal menghapus produk", variant: "destructive" });
          setDeleteId(null);
        },
      }
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Kelola Produk</h1>
            <p className="text-muted-foreground">{data?.total ?? 0} produk total</p>
          </div>
          <Button asChild>
            <Link href="/">
              <Plus className="h-4 w-4 mr-2" />
              Tambah Produk
            </Link>
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Filter:</span>
          <Select value={status} onValueChange={(v: typeof status) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : !data?.products.length ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">Belum ada produk</p>
                <Button asChild className="mt-4">
                  <Link href="/">Tambah Produk Baru</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.products.map((product) => (
                  <div key={product.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-primary font-semibold">{formatIdr(product.price)}</span>
                        {product.category && (
                          <Badge variant="outline" className="text-xs">{product.category}</Badge>
                        )}
                      </div>
                    </div>

                    <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {formatNumber(product.viewCount)}</span>
                      <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" /> {formatNumber(product.clickCount)}</span>
                    </div>

                    <Badge variant={product.status === "published" ? "default" : "secondary"}>
                      {product.status}
                    </Badge>

                    <div className="flex items-center gap-1">
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                        <Link href={`/product/${product.slug}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </Button>

                      {product.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700"
                          onClick={() => handlePublish(product.id)}
                          disabled={publishMutation.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive/80"
                        onClick={() => setDeleteId(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
            <span className="flex items-center text-sm text-muted-foreground">{page} / {data.totalPages}</span>
            <Button variant="outline" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>Selanjutnya</Button>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Produk?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Produk dan semua data terkait akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
