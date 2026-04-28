import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link2, Copy, CheckCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useGenerateAffiliateLink } from "@workspace/api-client-react";
import { useLocation } from "wouter";

const formSchema = z.object({
  url: z.string()
    .url("Harap masukkan URL yang valid")
    .refine((val) => val.includes("shopee.co.id") || val.includes("shp.ee"), {
      message: "Hanya menerima link Shopee (shopee.co.id atau shp.ee)",
    }),
});

export function LinkGenerator() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const generateMutation = useGenerateAffiliateLink();
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [productSlug, setProductSlug] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    setGeneratedLink(null);
    setProductSlug(null);
    setCopied(false);
    
    generateMutation.mutate({ data: values }, {
      onSuccess: (data) => {
        setGeneratedLink(data.product.affiliateLink);
        setProductSlug(data.product.slug);
        if (data.isNew) {
          toast({
            title: "Produk berhasil ditambahkan!",
            description: "Link afiliasi telah dibuat.",
          });
        }
      },
      onError: (error: any) => {
        toast({
          title: "Gagal membuat link",
          description: error?.data?.message || "Terjadi kesalahan saat memproses URL Shopee.",
          variant: "destructive",
        });
      }
    });
  }

  const handleCopy = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      toast({
        title: "Tersalin!",
        description: "Link afiliasi telah disalin ke clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="border-primary/20 shadow-lg shadow-primary/5 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-3">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem className="flex-1 space-y-0">
                  <FormControl>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input 
                        placeholder="Tempel link Shopee di sini (shopee.co.id/...)" 
                        className="pl-10 h-12 text-base"
                        {...field} 
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="pt-2" />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              size="lg" 
              className="h-12 px-8 font-semibold shrink-0"
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? "Memproses..." : "Generate Link"}
            </Button>
          </form>
        </Form>

        {generatedLink && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex-1 w-full flex items-center justify-between bg-background border border-border rounded-md px-3 py-2">
              <span className="text-sm font-medium truncate mr-2">{generatedLink}</span>
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleCopy}>
                {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            
            {productSlug && (
              <Button variant="outline" className="w-full sm:w-auto gap-2" onClick={() => setLocation(`/product/${productSlug}`)}>
                Lihat Review <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
