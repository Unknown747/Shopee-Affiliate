import { Link } from "wouter";
import { Star, ExternalLink, ShoppingCart } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Product } from "@workspace/api-client-react";
import { formatIdr, formatNumber } from "@/lib/format";
import { useTrackProductClick } from "@workspace/api-client-react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const trackClick = useTrackProductClick();

  const handleOutboundClick = () => {
    trackClick.mutate({ id: product.id, data: { referer: window.location.href } });
  };

  const discount = product.priceBeforeDisc && product.priceBeforeDisc > product.price
    ? Math.round(((product.priceBeforeDisc - product.price) / product.priceBeforeDisc) * 100)
    : 0;

  return (
    <Card className="h-full flex flex-col overflow-hidden group hover:border-primary/50 transition-colors">
      <Link href={`/product/${product.slug}`} className="flex-1 flex flex-col">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img 
            src={product.imageUrl} 
            alt={product.name}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          {discount > 0 && (
            <Badge variant="destructive" className="absolute top-2 right-2 font-bold">
              -{discount}%
            </Badge>
          )}
        </div>
        <CardHeader className="p-4 pb-2 flex-none">
          <h3 className="font-semibold text-sm line-clamp-2 leading-tight group-hover:text-primary transition-colors">
            {product.name}
          </h3>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex-1 flex flex-col gap-2">
          <div className="mt-auto">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <div className="flex items-center text-secondary">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span className="font-medium text-foreground ml-1">{product.ratingStar?.toFixed(1) || "0.0"}</span>
              </div>
              <span>&bull;</span>
              <span>Terjual {product.soldCount ? formatNumber(product.soldCount) : 0}</span>
            </div>
            
            {product.priceBeforeDisc && product.priceBeforeDisc > product.price && (
              <div className="text-xs text-muted-foreground line-through">
                {formatIdr(product.priceBeforeDisc)}
              </div>
            )}
            <div className="text-lg font-bold text-primary">
              {formatIdr(product.price)}
            </div>
          </div>
        </CardContent>
      </Link>
      <CardFooter className="p-4 pt-0">
        <Button 
          asChild 
          className="w-full gap-2" 
          onClick={handleOutboundClick}
        >
          <a 
            href={product.affiliateLink} 
            target="_blank" 
            rel="sponsored noopener noreferrer"
          >
            <ShoppingCart className="h-4 w-4" />
            Beli di Shopee
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
