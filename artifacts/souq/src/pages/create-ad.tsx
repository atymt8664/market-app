import { useListCategories, useListSubcategories, useCreateAd, useImproveDescription, useSuggestPrice, getListSubcategoriesQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Camera, Sparkles, Wand2, Loader2, Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const createAdSchema = z.object({
  title: z.string().min(3, "العنوان قصير جداً").max(65, "العنوان طويل جداً"),
  description: z.string().min(10, "الوصف قصير جداً").max(4000, "الوصف طويل جداً"),
  price: z.coerce.number().optional().nullable(),
  priceType: z.enum(["fixed", "negotiable", "free", "swap"]),
  type: z.enum(["offer", "request"]),
  categoryId: z.number().min(1, "الرجاء اختيار تصنيف"),
  subcategoryId: z.number().optional().nullable(),
  city: z.string().min(2, "اسم المدينة مطلوب"),
  sellerName: z.string().min(2, "الاسم مطلوب"),
  sellerPhone: z.string().min(5, "رقم الهاتف مطلوب"),
  images: z.array(z.string()).optional()
});

type CreateAdFormValues = z.infer<typeof createAdSchema>;

export default function CreateAd() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [profile, setProfile] = useLocalStorage("seller_profile", { name: "", phone: "", city: "" });
  
  const { data: categories } = useListCategories();
  const createAdMutation = useCreateAd();
  const improveDescMutation = useImproveDescription();
  const suggestPriceMutation = useSuggestPrice();

  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  
  const { data: subcategories } = useListSubcategories(selectedCatId || 0, {
    query: {
      enabled: !!selectedCatId,
      queryKey: getListSubcategoriesQueryKey(selectedCatId || 0),
    },
  });

  const form = useForm<CreateAdFormValues>({
    resolver: zodResolver(createAdSchema),
    defaultValues: {
      title: "",
      description: "",
      price: null,
      priceType: "fixed",
      type: "offer",
      categoryId: 0,
      subcategoryId: null,
      city: profile.city || "",
      sellerName: profile.name || "",
      sellerPhone: profile.phone || "",
      images: []
    }
  });

  const watchTitle = form.watch("title");
  const watchDesc = form.watch("description");
  const watchPriceType = form.watch("priceType");
  const watchCategoryId = form.watch("categoryId");
  const watchSubcategoryId = form.watch("subcategoryId");

  const selectedCategory = categories?.find(c => c.id === watchCategoryId);
  const selectedSubcategory = subcategories?.find(s => s.id === watchSubcategoryId);

  const onSubmit = (data: CreateAdFormValues) => {
    // Save profile for future
    setProfile({ name: data.sellerName, phone: data.sellerPhone, city: data.city });
    
    // Placeholder image since we don't have real upload
    data.images = ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80"];

    createAdMutation.mutate({ data }, {
      onSuccess: (ad) => {
        toast({ title: "تم نشر الإعلان بنجاح", className: "bg-primary text-primary-foreground" });
        navigate(`/ad/${ad.id}`);
      },
      onError: () => {
        toast({ title: "حدث خطأ أثناء النشر", variant: "destructive" });
      }
    });
  };

  const handleImproveDescription = () => {
    if (!watchTitle || !watchDesc) {
      toast({ title: "أدخل عنواناً ووصفاً مبدئياً أولاً", variant: "destructive" });
      return;
    }
    
    improveDescMutation.mutate({
      data: {
        title: watchTitle,
        description: watchDesc,
        category: selectedCategory?.name
      }
    }, {
      onSuccess: (res) => {
        form.setValue("description", res.description, { shouldValidate: true });
        toast({ title: "تم تحسين الوصف بنجاح!" });
      }
    });
  };

  const handleSuggestPrice = () => {
    if (!watchTitle) {
      toast({ title: "أدخل عنوان الإعلان أولاً", variant: "destructive" });
      return;
    }

    suggestPriceMutation.mutate({
      data: {
        title: watchTitle,
        description: watchDesc,
        category: selectedCategory?.name
      }
    }, {
      onSuccess: (res) => {
        form.setValue("price", res.price, { shouldValidate: true });
        form.setValue("priceType", "negotiable");
        toast({ title: "تم اقتراح السعر", description: res.reasoning });
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col w-full min-h-[100dvh] bg-background pb-24"
    >
      <header className="sticky top-0 z-40 bg-background border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <button className="p-2 -mr-2 rounded-full hover:bg-muted active:scale-95 transition-all">
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="font-bold text-lg">إنشاء إعلان</h1>
        </div>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 flex flex-col gap-6">
          
          {/* Photo Upload area (mock) */}
          <div className="w-full aspect-video border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-3 bg-muted/20 active:bg-muted/50 transition-colors">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Camera className="w-8 h-8" />
            </div>
            <span className="font-medium">إضافة الصور</span>
            <span className="text-xs text-muted-foreground">صورة واحدة على الأقل</span>
          </div>

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="space-y-1">
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex gap-4 p-1 bg-muted rounded-lg"
                    dir="rtl"
                  >
                    <FormItem className="flex-1">
                      <FormControl>
                        <RadioGroupItem value="offer" className="peer sr-only" />
                      </FormControl>
                      <FormLabel className="flex items-center justify-center w-full py-3 rounded-md font-medium cursor-pointer peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm transition-all">
                        أعرض (بيع)
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex-1">
                      <FormControl>
                        <RadioGroupItem value="request" className="peer sr-only" />
                      </FormControl>
                      <FormLabel className="flex items-center justify-center w-full py-3 rounded-md font-medium cursor-pointer peer-data-[state=checked]:bg-background peer-data-[state=checked]:shadow-sm transition-all">
                        أبحث (شراء)
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>عنوان الإعلان</FormLabel>
                <FormControl>
                  <Input placeholder="مثال: آيفون 13 برو مستعمل بحالة ممتازة" {...field} />
                </FormControl>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <FormMessage />
                  <span>{field.value.length}/65</span>
                </div>
              </FormItem>
            )}
          />

          <div className="flex flex-col gap-2">
            <FormLabel>التصنيف</FormLabel>
            <Sheet open={categorySheetOpen} onOpenChange={setCategorySheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="w-full justify-between py-6 h-auto text-right font-normal">
                  <span className={watchCategoryId ? "text-foreground" : "text-muted-foreground"}>
                    {watchCategoryId 
                      ? `${selectedCategory?.name}${selectedSubcategory ? ` > ${selectedSubcategory.name}` : ''}`
                      : "اختر التصنيف..."
                    }
                  </span>
                  <ArrowRight className="w-4 h-4 opacity-50 rotate-180" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] px-0 flex flex-col" dir="rtl">
                <SheetHeader className="px-4 border-b border-border pb-4 text-right">
                  <SheetTitle>اختر التصنيف</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                  {!selectedCatId ? (
                    categories?.map((cat) => (
                      <div 
                        key={cat.id} 
                        className="flex items-center justify-between p-4 border-b border-border hover:bg-muted cursor-pointer"
                        onClick={() => setSelectedCatId(cat.id)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{cat.icon}</span>
                          <span className="font-medium">{cat.name}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground rotate-180" />
                      </div>
                    ))
                  ) : (
                    <>
                      <div 
                        className="flex items-center gap-3 p-4 bg-muted/50 border-b border-border cursor-pointer font-medium text-primary"
                        onClick={() => setSelectedCatId(null)}
                      >
                        <ArrowRight className="w-4 h-4" />
                        العودة للتصنيفات الرئيسية
                      </div>
                      <div 
                        className="p-4 border-b border-border font-medium hover:bg-muted cursor-pointer"
                        onClick={() => {
                          form.setValue("categoryId", selectedCatId);
                          form.setValue("subcategoryId", null);
                          setCategorySheetOpen(false);
                        }}
                      >
                        الكل في {categories?.find(c => c.id === selectedCatId)?.name}
                      </div>
                      {subcategories?.map((sub) => (
                        <div 
                          key={sub.id} 
                          className="p-4 border-b border-border hover:bg-muted cursor-pointer pr-8"
                          onClick={() => {
                            form.setValue("categoryId", selectedCatId);
                            form.setValue("subcategoryId", sub.id);
                            setCategorySheetOpen(false);
                          }}
                        >
                          {sub.name}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            {form.formState.errors.categoryId && (
              <span className="text-xs text-destructive">{form.formState.errors.categoryId.message}</span>
            )}
          </div>

          <div className="flex gap-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <FormLabel>السعر (€)</FormLabel>
                    {watchTitle && watchPriceType !== "free" && watchPriceType !== "swap" && (
                      <button 
                        type="button" 
                        onClick={handleSuggestPrice}
                        disabled={suggestPriceMutation.isPending}
                        className="text-xs font-medium text-primary flex items-center gap-1 hover:underline disabled:opacity-50"
                      >
                        {suggestPriceMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        اقترح السعر
                      </button>
                    )}
                  </div>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      {...field} 
                      value={field.value ?? ""} 
                      onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      disabled={watchPriceType === "free" || watchPriceType === "swap"}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="priceType"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel className="mb-2 block">نوع السعر</FormLabel>
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="w-full justify-between font-normal">
                        {field.value === "fixed" && "ثابت"}
                        {field.value === "negotiable" && "قابل للتفاوض"}
                        {field.value === "free" && "مجاناً"}
                        {field.value === "swap" && "مقايضة"}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-auto pb-8" dir="rtl">
                      <SheetHeader className="text-right mb-4">
                        <SheetTitle>اختر نوع السعر</SheetTitle>
                      </SheetHeader>
                      <div className="flex flex-col gap-2">
                        {[
                          { id: "fixed", label: "ثابت" },
                          { id: "negotiable", label: "قابل للتفاوض" },
                          { id: "free", label: "مجاناً" },
                          { id: "swap", label: "مقايضة" }
                        ].map(pt => (
                          <div 
                            key={pt.id}
                            className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted"
                            onClick={() => {
                              field.onChange(pt.id);
                              if (pt.id === "free" || pt.id === "swap") form.setValue("price", null);
                            }}
                          >
                            <span className="font-medium">{pt.label}</span>
                            {field.value === pt.id && <Check className="w-5 h-5 text-primary" />}
                          </div>
                        ))}
                      </div>
                    </SheetContent>
                  </Sheet>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الوصف</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="صف المنتج بدقة. اذكر حالته، مدة الاستخدام، وأي تفاصيل تهم المشتري." 
                    className="min-h-[120px] resize-none"
                    {...field} 
                  />
                </FormControl>
                <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                  <FormMessage />
                  <span>{field.value.length}/4000</span>
                </div>
                
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="w-full mt-2 gap-2 text-violet-500 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20"
                  onClick={handleImproveDescription}
                  disabled={improveDescMutation.isPending || !watchTitle}
                >
                  {improveDescMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                  تحسين الوصف بالذكاء الاصطناعي
                </Button>
              </FormItem>
            )}
          />

          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="font-bold text-lg">معلومات التواصل</h3>
            
            <FormField
              control={form.control}
              name="sellerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الاسم</FormLabel>
                  <FormControl>
                    <Input placeholder="اسمك" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="sellerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم الهاتف (للواتساب)</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="مثال: +491761234567" dir="ltr" className="text-right" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المدينة / الرمز البريدي</FormLabel>
                  <FormControl>
                    <Input placeholder="مثال: Berlin 10115" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Sticky Bottom Actions */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border z-40 flex gap-3 max-w-[480px] mx-auto">
            <Button 
              type="submit" 
              className="flex-1 py-6 text-lg font-bold shadow-lg"
              disabled={createAdMutation.isPending}
            >
              {createAdMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "نشر الإعلان"}
            </Button>
            <Button type="button" variant="outline" className="py-6 px-6 font-medium">
              معاينة
            </Button>
          </div>
        </form>
      </Form>
    </motion.div>
  );
}
