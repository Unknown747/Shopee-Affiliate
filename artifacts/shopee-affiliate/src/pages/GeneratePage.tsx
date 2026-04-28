import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useGenerateAiContent, useAdminListProducts, useUpdateProduct, usePublishProduct } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, Sparkles, Save, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAdminToken } from "@/hooks/use-admin";
import { useLocation } from "wouter";

interface GeneratedContent {
  reviewContent: string;
  pros: string[];
  cons: string[];
  faq: Array<{ question: string; answer: string }>;
  metaTitle: string;
  metaDesc: string;
  tags: string[];
}

export default function GeneratePage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const token = getAdminToken();
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [price, setPrice] = useState("");
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [editedReview, setEditedReview] = useState("");
  const [editedMetaTitle, setEditedMetaTitle] = useState("");
  const [editedMetaDesc, setEditedMetaDesc] = useState("");

  const { data: productsData } = useAdminListProducts({ limit: 100, status: "all" }, {
    query: {
      enabled: !!token,
      queryKey: ["adminListProducts", token],
    },
  } as any);

  const generateMutation = useGenerateAiContent();
  const updateProductMutation = useUpdateProduct();
  const publishMutation = usePublishProduct();

  const handleGenerate = () => {
    const nameToUse = selectedProductId
      ? productsData?.products.find((p) => p.id === selectedProductId)?.name || productName
      : productName;

    if (!nameToUse.trim()) {
      toast({ title: "Error", description: "Masukkan nama produk terlebih dahulu", variant: "destructive" });
      return;
    }

    generateMutation.mutate(
      {
        data: {
          productId: selectedProductId || null,
          productName: nameToUse,
          productCategory: productCategory || null,
          price: price ? parseInt(price) : null,
          productDescription: null,
        },
      },
      {
        onSuccess: (data) => {
          setGenerated(data);
          setEditedReview(data.reviewContent);
          setEditedMetaTitle(data.metaTitle);
          setEditedMetaDesc(data.metaDesc);
          toast({ title: "Konten berhasil digenerate!", description: "Silakan review dan edit sebelum simpan." });
        },
        onError: () => {
          toast({ title: "Gagal generate konten", description: "Terjadi kesalahan saat generate konten AI", variant: "destructive" });
        },
      }
    );
  };

  const handleSave = (publish = false) => {
    if (!selectedProductId || !generated) {
      toast({ title: "Pilih produk terlebih dahulu untuk menyimpan", variant: "destructive" });
      return;
    }

    updateProductMutation.mutate(
      {
        id: selectedProductId,
        data: {
          reviewContent: editedReview,
          pros: generated.pros,
          cons: generated.cons,
          faq: generated.faq,
          metaTitle: editedMetaTitle,
          metaDesc: editedMetaDesc,
          tags: generated.tags,
          status: publish ? "published" : null,
        },
      },
      {
        onSuccess: (product) => {
          if (publish) {
            publishMutation.mutate({ id: selectedProductId });
          }
          toast({ title: publish ? "Produk dipublish!" : "Konten tersimpan!", description: `Berhasil ${publish ? "dipublish" : "disimpan"}.` });
          if (publish) {
            setLocation(`/product/${product.slug}`);
          }
        },
        onError: () => {
          toast({ title: "Gagal menyimpan", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            Generator Konten AI
          </h1>
          <p className="text-muted-foreground mt-2">
            Buat review produk berkualitas tinggi secara otomatis menggunakan AI
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Input Form */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pengaturan Konten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {token && productsData?.products.length ? (
                  <div className="space-y-2">
                    <Label>Pilih Produk dari Database</Label>
                    <Select value={selectedProductId} onValueChange={(v) => {
                      setSelectedProductId(v === "manual" ? "" : v);
                      const p = productsData.products.find((prod) => prod.id === v);
                      if (p) { setProductName(p.name); setProductCategory(p.category || ""); setPrice(String(p.price)); }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Input manual..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Input manual</SelectItem>
                        {productsData.products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name.slice(0, 40)}{p.name.length > 40 ? "..." : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label>Nama Produk *</Label>
                  <Input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Masukkan nama produk lengkap..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Input
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    placeholder="Contoh: Handphone & Tablet"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Harga (IDR)</Label>
                  <Input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Contoh: 3499000"
                  />
                </div>

                <Button
                  className="w-full gap-2"
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  size="lg"
                >
                  <Sparkles className="h-4 w-4" />
                  {generateMutation.isPending ? "Sedang generate..." : "Generate Konten AI"}
                </Button>

                {generateMutation.isPending && (
                  <p className="text-sm text-center text-muted-foreground animate-pulse">
                    AI sedang menulis review untuk Anda...
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Generated Content */}
          <div className="lg:col-span-3 space-y-6">
            {!generated ? (
              <div className="border-2 border-dashed border-border rounded-xl p-12 text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold text-muted-foreground">Konten akan tampil di sini</h3>
                <p className="text-sm text-muted-foreground mt-1">Isi form di sebelah kiri dan klik "Generate Konten AI"</p>
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle className="text-base">Konten Review (Edit jika perlu)</CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleSave(false)} disabled={updateProductMutation.isPending}>
                        <Save className="h-4 w-4 mr-1" /> Simpan Draft
                      </Button>
                      <Button size="sm" onClick={() => handleSave(true)} disabled={publishMutation.isPending}>
                        <Eye className="h-4 w-4 mr-1" /> Publish
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Meta Title</Label>
                      <Input value={editedMetaTitle} onChange={(e) => setEditedMetaTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Meta Description</Label>
                      <Textarea value={editedMetaDesc} onChange={(e) => setEditedMetaDesc(e.target.value)} rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label>Review Lengkap</Label>
                      <Textarea
                        value={editedReview}
                        onChange={(e) => setEditedReview(e.target.value)}
                        rows={12}
                        className="font-mono text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Kelebihan</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {generated.pros.map((pro, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-sm flex items-center gap-2"><XCircle className="h-4 w-4 text-red-500" /> Kekurangan</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {generated.cons.map((con, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                            {con}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader><CardTitle className="text-sm">FAQ</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {generated.faq.map((item, i) => (
                        <div key={i} className="border-l-2 border-primary/30 pl-4">
                          <p className="font-medium text-sm">{item.question}</p>
                          <p className="text-sm text-muted-foreground">{item.answer}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Tags SEO</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {generated.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
