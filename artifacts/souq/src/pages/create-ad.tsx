import {
  useListCategories,
  useListSubcategories,
  useCreateAd,
  useUpdateAd,
  useGetAd,
  useImproveDescription,
  useSuggestPrice,
  getListSubcategoriesQueryKey,
  getGetAdQueryKey,
  getListMyAdsQueryKey,
  getListRecommendedAdsQueryKey,
} from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { ArrowRight, Camera, Sparkles, Wand2, Loader2, Check, X, Plus } from "lucide-react";
import { useUpload } from "@workspace/object-storage-web";
import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

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

interface CreateAdProps {
  editId?: number;
}

export default function CreateAd({ editId }: CreateAdProps = {}) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = typeof editId === "number";

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const target = isEdit ? `/edit/${editId}` : "/new";
      navigate(`/login?redirect=${encodeURIComponent(target)}`);
    }
  }, [authLoading, isAuthenticated, isEdit, editId, navigate]);

  const { data: categories } = useListCategories();
  const { data: existingAd } = useGetAd(editId ?? 0, {
    query: { enabled: isEdit, queryKey: getGetAdQueryKey(editId ?? 0) },
  });
  const createAdMutation = useCreateAd();
  const updateAdMutation = useUpdateAd();
  const improveDescMutation = useImproveDescription();
  const suggestPriceMutation = useSuggestPrice();

  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, isUploading, progress } = useUpload();
  
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
      city: user?.city || "",
      sellerName: user?.name || "",
      sellerPhone: user?.phone || "",
      images: []
    }
  });

  useEffect(() => {
    if (existingAd && isEdit) {
      form.reset({
        title: existingAd.title,
        description: existingAd.description,
        price: existingAd.price,
        priceType: existingAd.priceType as "fixed" | "negotiable" | "free" | "swap",
        type: existingAd.type as "offer" | "request",
        categoryId: existingAd.categoryId,
        subcategoryId: existingAd.subcategoryId ?? null,
        city: existingAd.city,
        sellerName: existingAd.sellerName,
        sellerPhone: existingAd.sellerPhone,
        images: existingAd.images,
      });
      setSelectedCatId(existingAd.categoryId);
      setUploadedImages(existingAd.images);
    }
  }, [existingAd, isEdit, form]);

  useEffect(() => {
    if (!isEdit && user) {
      if (!form.getValues("sellerName")) form.setValue("sellerName", user.name);
      if (!form.getValues("sellerPhone")) form.setValue("sellerPhone", user.phone);
      if (!form.getValues("city") && user.city) form.setValue("city", user.city);
    }
  }, [user, isEdit, form]);

  const watchTitle = form.watch("title");
  const watchDesc = form.watch("description");
  const watchPriceType = form.watch("priceType");
  const watchCategoryId = form.watch("categoryId");
  const watchSubcategoryId = form.watch("subcategoryId");

  const selectedCategory = categories?.find(c => c.id === watchCategoryId);
  const selectedSubcategory = subcategories?.find(s => s.id === watchSubcategoryId);

  const onSubmit = (data: CreateAdFormValues) => {
    if (uploadedImages.length === 0) {
      toast({ title: "أضف صورة واحدة على الأقل", variant: "destructive" });
      return;
    }
    data.images = uploadedImages;

    const invalidate = async () => {
      await queryClient.invalidateQueries({ queryKey: getListMyAdsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getListRecommendedAdsQueryKey() });
      if (isEdit) {
        await queryClient.invalidateQueries({ queryKey: getGetAdQueryKey(editId!) });
      }
    };

    if (isEdit) {
      updateAdMutation.mutate(
        { adId: editId!, data },
        {
          onSuccess: async () => {
            await invalidate();
            toast({
              title: "تم تحديث الإعلان",
              className: "bg-primary text-primary-foreground border-primary",
            });
            navigate("/profile");
          },
          onError: () => {
            toast({ title: "حدث خطأ أثناء التحديث", variant: "destructive" });
          },
        },
      );
    } else {
      createAdMutation.mutate(
        { data },
        {
          onSuccess: async () => {
            await invalidate();
            toast({
              title: "تم نشر الإعلان بنجاح",
              description: "إعلانك أصبح مرئياً في السوق الآن",
              className: "bg-primary text-primary-foreground border-primary",
            });
            navigate("/");
          },
          onError: () => {
            toast({ title: "حدث خطأ أثناء النشر", variant: "destructive" });
          },
        },
      );
    }
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).slice(0, 10 - uploadedImages.length);
    for (const file of list) {
      if (!file.type.startsWith("image/")) {
        toast({ title: "الصور فقط مسموح بها", variant: "destructive" });
        continue;
      }
      const result = await uploadFile(file);
      if (result?.objectPath) {
        setUploadedImages(prev => [...prev, `/api/storage${result.objectPath}`]);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
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
          <h1 className="font-bold text-lg">{isEdit ? "تعديل الإعلان" : "إنشاء إعلان"}</h1>
        </div>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 flex flex-col gap-6">
          
          {/* Photo Upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
            {uploadedImages.length === 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full aspect-video border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-3 bg-muted/20 active:bg-muted/50 hover:border-primary/50 transition-colors disabled:opacity-50"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Camera className="w-8 h-8" />}
                </div>
                <span className="font-medium">{isUploading ? `جارٍ الرفع... ${progress}%` : "إضافة الصور"}</span>
                <span className="text-xs text-muted-foreground">صورة واحدة على الأقل · حتى 10 صور</span>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {uploadedImages.map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">الرئيسية</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        className="absolute top-1 left-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {uploadedImages.length < 10 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-50"
                    >
                      {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-6 h-6" />}
                      <span className="text-[10px]">{isUploading ? `${progress}%` : "إضافة"}</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center">{uploadedImages.length} من 10 صور</p>
              </div>
            )}
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
            <label className="text-sm font-medium">التصنيف</label>
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
              disabled={createAdMutation.isPending || updateAdMutation.isPending}
            >
              {createAdMutation.isPending || updateAdMutation.isPending ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : isEdit ? (
                "حفظ التعديلات"
              ) : (
                "نشر الإعلان"
              )}
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
