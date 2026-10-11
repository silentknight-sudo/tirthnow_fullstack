import { type Lang } from '@tirth-now/shared-types';
import { type WeatherDayResponse, type WeatherAdvisoryResponse } from '../dto/weather.dto';

type Code = 'heat' | 'cold' | 'rain' | 'fog' | 'storm';

const MESSAGES: Record<Code, Record<Lang, string>> = {
  heat: {
    en: 'Very hot day: plan parikrama and temple visits before 10 am or after sunset, and carry water.',
    hi: 'बहुत गर्म दिन: परिक्रमा और दर्शन सुबह 10 बजे से पहले या सूर्यास्त के बाद करें, पानी साथ रखें।',
  },
  cold: {
    en: 'Cold night and early morning: carry a shawl for mangla aarti.',
    hi: 'ठंडी रात और सुबह: मंगला आरती के लिए शॉल साथ रखें।',
  },
  rain: {
    en: 'Rain likely: temple floors and ghats get slippery; carry rain cover.',
    hi: 'बारिश की संभावना: मंदिर का फ़र्श और घाट फिसलन भरे हो सकते हैं; रेन कवर साथ रखें।',
  },
  fog: {
    en: 'Morning fog: trains and road travel may be delayed.',
    hi: 'सुबह कोहरा: ट्रेन और सड़क यात्रा में देरी हो सकती है।',
  },
  storm: {
    en: 'Thunderstorms forecast: avoid boat rides on the Yamuna.',
    hi: 'आंधी-तूफ़ान का पूर्वानुमान: यमुना में नौका विहार से बचें।',
  },
};

/** Traveller-facing advisories derived from the forecast (pure; thresholds tuned for Braj). */
export function advisoriesFor(days: WeatherDayResponse[], lang: Lang): WeatherAdvisoryResponse[] {
  const out: WeatherAdvisoryResponse[] = [];
  const add = (code: Code, severity: 'info' | 'warning', date: string) => {
    out.push({ code, severity, date, message: MESSAGES[code][lang] });
  };
  for (const d of days.slice(0, 3)) {
    if (d.maxC >= 40) add('heat', 'warning', d.date);
    else if (d.maxC >= 37) add('heat', 'info', d.date);
    if (d.minC <= 6) add('cold', 'warning', d.date);
    else if (d.minC <= 10) add('cold', 'info', d.date);
    if (d.condition === 'thunderstorm') add('storm', 'warning', d.date);
    else if (d.rainChancePct >= 60) add('rain', 'info', d.date);
    if (d.condition === 'fog') add('fog', 'info', d.date);
  }
  return out;
}
