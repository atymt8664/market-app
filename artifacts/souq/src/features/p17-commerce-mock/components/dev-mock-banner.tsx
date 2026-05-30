import { P17_MOCK } from "../mock-strings";
import { P17_DEV_BANNER } from "../styles";

export function DevMockBanner() {
  return (
    <div className={P17_DEV_BANNER} dir="rtl">
      <p>{P17_MOCK.devBanner}</p>
      <p className="text-[10px] text-amber-200/70">{P17_MOCK.devBannerSub}</p>
    </div>
  );
}
