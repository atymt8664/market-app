export type SignupCountry = {
  code: string;
  name: string;
  phoneCode: string;
};

export const SIGNUP_COUNTRIES: SignupCountry[] = [
  { code: "AL", name: "ألبانيا", phoneCode: "+355" },
  { code: "AD", name: "أندورا", phoneCode: "+376" },
  { code: "AT", name: "النمسا", phoneCode: "+43" },
  { code: "BY", name: "بيلاروس", phoneCode: "+375" },
  { code: "BE", name: "بلجيكا", phoneCode: "+32" },
  { code: "BA", name: "البوسنة والهرسك", phoneCode: "+387" },
  { code: "BG", name: "بلغاريا", phoneCode: "+359" },
  { code: "HR", name: "كرواتيا", phoneCode: "+385" },
  { code: "CY", name: "قبرص", phoneCode: "+357" },
  { code: "CZ", name: "التشيك", phoneCode: "+420" },
  { code: "DK", name: "الدنمارك", phoneCode: "+45" },
  { code: "EE", name: "إستونيا", phoneCode: "+372" },
  { code: "FI", name: "فنلندا", phoneCode: "+358" },
  { code: "FR", name: "فرنسا", phoneCode: "+33" },
  { code: "DE", name: "ألمانيا", phoneCode: "+49" },
  { code: "GR", name: "اليونان", phoneCode: "+30" },
  { code: "HU", name: "المجر", phoneCode: "+36" },
  { code: "IS", name: "آيسلندا", phoneCode: "+354" },
  { code: "IE", name: "إيرلندا", phoneCode: "+353" },
  { code: "IT", name: "إيطاليا", phoneCode: "+39" },
  { code: "XK", name: "كوسوفو", phoneCode: "+383" },
  { code: "LV", name: "لاتفيا", phoneCode: "+371" },
  { code: "LI", name: "ليختنشتاين", phoneCode: "+423" },
  { code: "LT", name: "ليتوانيا", phoneCode: "+370" },
  { code: "LU", name: "لوكسمبورغ", phoneCode: "+352" },
  { code: "MT", name: "مالطا", phoneCode: "+356" },
  { code: "MD", name: "مولدوفا", phoneCode: "+373" },
  { code: "MC", name: "موناكو", phoneCode: "+377" },
  { code: "ME", name: "الجبل الأسود", phoneCode: "+382" },
  { code: "NL", name: "هولندا", phoneCode: "+31" },
  { code: "MK", name: "مقدونيا الشمالية", phoneCode: "+389" },
  { code: "NO", name: "النرويج", phoneCode: "+47" },
  { code: "PL", name: "بولندا", phoneCode: "+48" },
  { code: "PT", name: "البرتغال", phoneCode: "+351" },
  { code: "RO", name: "رومانيا", phoneCode: "+40" },
  { code: "SM", name: "سان مارينو", phoneCode: "+378" },
  { code: "RS", name: "صربيا", phoneCode: "+381" },
  { code: "SK", name: "سلوفاكيا", phoneCode: "+421" },
  { code: "SI", name: "سلوفينيا", phoneCode: "+386" },
  { code: "ES", name: "إسبانيا", phoneCode: "+34" },
  { code: "SE", name: "السويد", phoneCode: "+46" },
  { code: "CH", name: "سويسرا", phoneCode: "+41" },
  { code: "UA", name: "أوكرانيا", phoneCode: "+380" },
  { code: "GB", name: "المملكة المتحدة", phoneCode: "+44" },
  { code: "VA", name: "الفاتيكان", phoneCode: "+379" },
  { code: "US", name: "الولايات المتحدة", phoneCode: "+1" },
  { code: "CA", name: "كندا", phoneCode: "+1" },
];

export const SIGNUP_COUNTRY_BY_CODE = Object.fromEntries(
  SIGNUP_COUNTRIES.map((country) => [country.code, country]),
);

/** علم Unicode من رمز ISO 3166-1 alpha-2 (مثل DE → 🇩🇪). */
export function countryCodeToFlagEmoji(code: string): string {
  const c = code.trim().toUpperCase();
  if (c.length !== 2 || !/^[A-Z]{2}$/.test(c)) return "";
  const BASE = 0x1f1e6 - 0x41;
  return String.fromCodePoint(c.charCodeAt(0) + BASE, c.charCodeAt(1) + BASE);
}
