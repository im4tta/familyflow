

import { KhmerDate } from "../types";

const KHMER_DAY_STRING: Record<string, string> = {
    "1": "១កើត", "2": "២កើត", "3": "៣កើត", "4": "៤កើត", "5": "៥កើត",
    "6": "៦កើត", "7": "៧កើត", "8": "៨កើត", "9": "៩កើត", "10": "១០កើត",
    "11": "១១កើត", "12": "១២កើត", "13": "១៣កើត", "14": "១៤កើត", "15": "១៥កើត",
    "16": "១រោច", "17": "២រោច", "18": "៣រោច", "19": "៤រោច", "20": "៥រោច",
    "21": "៦រោច", "22": "៧រោច", "23": "៨រោច", "24": "៩រោច", "25": "១០រោច",
    "26": "១១រោច", "27": "១២រោច", "28": "១៣រោច", "29": "១៤រោច", "30": "១៥រោច",
};

const KHMER_DAY_OF_WEEK: Record<string, string> = {
    "Monday": "ចន្ទ",
    "Tuesday": "អង្គារ",
    "Wednesday": "ពុធ",
    "Thursday": "ព្រហស្បតិ៍",
    "Friday": "សុក្រ",
    "Saturday": "សៅរ៍",
    "Sunday": "អាទិត្យ",
};

const KHMER_DIGITS: Record<string, string> = {
    "0": "០", "1": "១", "2": "២", "3": "៣", "4": "៤",
    "5": "៥", "6": "៦", "7": "៧", "8": "៨", "9": "៩",
};

const KHMER_MONTHS = [
    "ចេត្រ", "ពិសាខ", "ជេស្ឋ", "អាសាឍ", "ស្រាពណ៍", "ភទ្របទ",
    "អស្សុជ", "កត្តិក", "មិគសិរ", "បុស្ស", "មាឃ", "ផល្គុន",
];

const KHMER_GREGORIAN_MONTHS = [
    "មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា",
    "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"
];

const KHMER_ZODIAC = [
    "ជូត", "ឆ្លូវ", "ខាល", "ថោះ", "រោង", "ម្សាញ់",
    "មមី", "មមែ", "វក", "រកា", "ច", "កុរ",
];

const KHMER_STEMS = [
    "ឯកស័ក", "ទោស័ក", "ត្រីស័ក", "ចត្វាស័ក", "បញ្ចស័ក",
    "ឆស័ក", "សប្តស័ក", "អដ្ឋស័ក", "នព្វស័ក", "សំរឹទ្ធិស័ក",
];

const replaceAll = (text: string, dic: Record<string, string>): string => {
    let result = text;
    for (const [key, value] of Object.entries(dic)) {
        result = result.split(key).join(value);
    }
    return result;
};

const isValidDate = (day: number, month: number, year: number): boolean => {
    if (month < 1 || month > 12) return false;
    if (year < 1) return false;
    
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) {
        daysInMonth[1] = 29;
    }
    
    return day >= 1 && day <= daysInMonth[month - 1];
};

const gregorianToJd = (day: number, month: number, year: number): number => {
    const a = Math.floor((14 - month) / 12);
    const y = year + 4800 - a;
    const m = month + 12 * a - 3;
    const jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
    return jd;
};

const getNewMoonDay = (k: number, timezone: number = 7.0): number => {
    const T = k / 1236.85;
    let JDE = 2451550.09766
        + 29.530588861 * k
        + 0.00015437 * Math.pow(T, 2)
        - 0.000000150 * Math.pow(T, 3)
        + 0.00000000073 * Math.pow(T, 4);
    
    JDE += timezone / 24.0;
    return Math.floor(JDE + 0.5);
};

const getSunLongitude = (jd: number): number => {
    const T = (jd - 2451545.0) / 36525.0;
    const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * Math.pow(T, 2);
    let M = 357.52911 + 35999.05029 * T - 0.0001537 * Math.pow(T, 2);
    // Convert M to radians for Math.sin
    const M_rad = M * Math.PI / 180;
    
    const C = (1.914602 - 0.004817 * T - 0.000014 * Math.pow(T, 2)) * Math.sin(M_rad)
        + (0.019993 - 0.000101 * T) * Math.sin(2 * M_rad)
        + 0.000289 * Math.sin(3 * M_rad);
        
    const solarLong = (L0 + C) % 360;
    return solarLong;
};

const isLeapMonth = (jdStart: number, jdEnd: number): boolean => {
    const longStart = getSunLongitude(jdStart);
    const longEnd = getSunLongitude(jdEnd);
    
    for (let i = 0; i < 12; i++) {
        const term = i * 30.0;
        if ((longStart <= term && term < longEnd) || (longEnd < longStart && (longStart <= term || term < longEnd))) {
            return false;
        }
    }
    return true;
};

const getKhmerZodiacYear = (lunarYear: number): string => {
    return KHMER_ZODIAC[(lunarYear - 2020 + 1200) % 12]; // +1200 to ensure positive result
};

const getKhmerStem = (year: number): string => {
    return KHMER_STEMS[(year - 2019 + 1000) % 10]; // +1000 to ensure positive result
};

const gregorianToKhmerLunarRaw = (day: number, month: number, year: number) => {
    if (!isValidDate(day, month, year)) {
        throw new Error("Invalid Gregorian date");
    }

    const jd = gregorianToJd(day, month, year);
    
    // Estimate K
    let k = Math.floor((jd - 2451545.0) / 29.530588853);
    let newMoonJd = getNewMoonDay(k);

    if (newMoonJd > jd) {
        k -= 1;
        newMoonJd = getNewMoonDay(k);
    } else if (getNewMoonDay(k + 1) <= jd) {
        k += 1;
        newMoonJd = getNewMoonDay(k);
    }

    let lunarDay = jd - newMoonJd + 1;
    if (lunarDay < 1) {
        k -= 1;
        newMoonJd = getNewMoonDay(k);
        lunarDay = jd - newMoonJd + 1;
    }

    // Reference calculation (Visak Bochea reference usually)
    const refYear = (month > 4 || (month === 4 && day >= 14)) ? year : year - 1;
    const jdRef = gregorianToJd(14, 4, refYear);
    const kRef = Math.floor((jdRef - 2451545.0) / 29.530588853);

    let monthCount = 0;
    let currentK = kRef;
    let currentNewMoon = getNewMoonDay(currentK);

    while (currentNewMoon <= newMoonJd) {
        monthCount += 1;
        currentK += 1;
        currentNewMoon = getNewMoonDay(currentK);
    }
    
    let isLeapMonthCurrent = false;
    // We only really care if the *current* month we landed on is a leap month index-wise relative to the reference.
    
    // Simplified algorithm for standard calendar display (approximation for UI):
    // 1. Calculate Lunar Month Index (0-11)
    let lunarMonthIndex = (monthCount - 1) % 12; // 0 = Chet
    if (lunarMonthIndex < 0) lunarMonthIndex += 12;
    
    // 2. Check for leap month
    const currentMonthStart = getNewMoonDay(k);
    const currentMonthEnd = getNewMoonDay(k + 1);
    // If no major solar term falls in this lunar month, it's a leap month (roughly)
    isLeapMonthCurrent = isLeapMonth(currentMonthStart, currentMonthEnd);

    // Khmer New Year trigger (approx April) handles the Era increment
    // 544 is added if after April 14 approx
    const lunarYear = (month > 4 || (month === 4 && day >= 14)) ? year + 544 : year + 543;

    let monthName = KHMER_MONTHS[lunarMonthIndex];
    if (isLeapMonthCurrent) {
        monthName += " (Leap)"; 
    }

    const zodiacYear = getKhmerZodiacYear(year); // Zodiac changes at new year
    const stem = getKhmerStem(year);

    return {
        lunarDay,
        monthName,
        lunarYear,
        zodiacYear,
        stem
    };
};

export const getKhmerLunarDate = (date: Date): KhmerDate => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const dayNameEn = date.toLocaleDateString('en-US', { weekday: 'long' });

    try {
        const result = gregorianToKhmerLunarRaw(day, month, year);
        
        const lunarDayStr = KHMER_DAY_STRING[result.lunarDay.toString()] || result.lunarDay.toString();
        const khmerDayOfWeek = KHMER_DAY_OF_WEEK[dayNameEn] || dayNameEn;
        const buddhistYearKh = replaceAll(result.lunarYear.toString(), KHMER_DIGITS);
        
        // Gregorian to Khmer format
        const dayKh = replaceAll(day.toString(), KHMER_DIGITS);
        const monthKh = KHMER_GREGORIAN_MONTHS[month - 1];
        const yearKh = replaceAll(year.toString(), KHMER_DIGITS);
        const gregorianDateKh = `ត្រូវនឹងថ្ងៃទី${dayKh} ខែ${monthKh} ឆ្នាំ${yearKh}`;
        
        // Compact format for calendar card
        // Format: ថ្ងៃចន្ទ ១៥កើត ខែចេត្រ ឆ្នាំរោង
        const compactDate = `ថ្ងៃ${khmerDayOfWeek} ${lunarDayStr} ខែ${result.monthName} ឆ្នាំ${result.zodiacYear}`;

        return {
            dayOfWeek: khmerDayOfWeek,
            lunarDay: lunarDayStr,
            monthName: result.monthName,
            zodiacYear: result.zodiacYear,
            stem: result.stem,
            buddhistEra: buddhistYearKh,
            gregorianDateKh: gregorianDateKh,
            compactDate: compactDate,
            fullDate: `ថ្ងៃ${khmerDayOfWeek} ${lunarDayStr} ខែ${result.monthName} ឆ្នាំ${result.zodiacYear} ${result.stem} ព.ស. ${buddhistYearKh}`
        };
    } catch (e) {
        console.error(e);
        return {
            dayOfWeek: "",
            lunarDay: "",
            monthName: "",
            zodiacYear: "",
            stem: "",
            buddhistEra: "",
            gregorianDateKh: ""
        };
    }
};