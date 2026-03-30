
import { neon } from '@neondatabase/serverless';
import { Expense, MedicalRecord, GrowthRecord, Trip, Caregiver, Milestone, AppSettings } from '../types';
import { INITIAL_CAREGIVERS } from '../constants';

// Requires DATABASE_URL in your .env.local file.
// Format: postgres://user:password@host/dbname?sslmode=require
const connectionString = (typeof process !== 'undefined' && process?.env?.DATABASE_URL)
  ? process.env.DATABASE_URL
  : (() => { throw new Error('DATABASE_URL is not set. Add it to your .env.local file.'); })();

export const sql = neon(connectionString);

let isDbInitialized = false;

export const repairDatabaseSchema = async () => {
    if (isDbInitialized) return true;
    const runMigration = async (query: any) => {
        try { await query; } catch (e) { console.warn("Migration notice:", e); }
    };
    
    // Performance: Create Indexes if they don't exist
    await runMigration(sql`CREATE INDEX IF NOT EXISTS idx_health_member ON health_records(memberId)`);
    await runMigration(sql`CREATE INDEX IF NOT EXISTS idx_health_date ON health_records(date)`);
    await runMigration(sql`CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)`);
    await runMigration(sql`CREATE INDEX IF NOT EXISTS idx_milestones_completed ON milestones(completed)`);

    await runMigration(sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS language TEXT`);
    await runMigration(sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS monthlyBudget NUMERIC`);
    await runMigration(sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS cornerRadius TEXT`);
    await runMigration(sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS appStyle TEXT`);
    await runMigration(sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS liveBackground TEXT`);
    await runMigration(sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS loan_stage NUMERIC`);
    await runMigration(sql`ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS loan_fees TEXT`);
    
    await runMigration(sql`ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS dateOfBirth TEXT`);
    await runMigration(sql`ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS bloodType TEXT`);
    await runMigration(sql`ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS allergies TEXT`);
    await runMigration(sql`ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS doctorName TEXT`);
    
    await runMigration(sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS startTime TEXT`);
    await runMigration(sql`ALTER TABLE trips ADD COLUMN IF NOT EXISTS endTime TEXT`);

    await runMigration(sql`ALTER TABLE health_records ADD COLUMN IF NOT EXISTS memberId TEXT`);
    await runMigration(sql`ALTER TABLE health_records ADD COLUMN IF NOT EXISTS medicineName TEXT`);
    await runMigration(sql`ALTER TABLE health_records ADD COLUMN IF NOT EXISTS medicineUsage TEXT`);
    await runMigration(sql`ALTER TABLE health_records ADD COLUMN IF NOT EXISTS medicinePhotoUrl TEXT`);
    await runMigration(sql`ALTER TABLE health_records ADD COLUMN IF NOT EXISTS time TEXT`);
    await runMigration(sql`ALTER TABLE health_records ADD COLUMN IF NOT EXISTS endDate TEXT`);
    await runMigration(sql`ALTER TABLE health_records ADD COLUMN IF NOT EXISTS dosage TEXT`);
    await runMigration(sql`ALTER TABLE health_records ADD COLUMN IF NOT EXISTS frequency TEXT`);
    await runMigration(sql`ALTER TABLE health_records ADD COLUMN IF NOT EXISTS medications JSONB`);

    await runMigration(sql`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS status TEXT`);
    await runMigration(sql`ALTER TABLE milestones ADD COLUMN IF NOT EXISTS linkedGrowthId TEXT`);
    await runMigration(sql`ALTER TABLE growth_records ADD COLUMN IF NOT EXISTS headCircumferenceCm NUMERIC`);

    return true;
};

export const initDB = async () => {
  if (isDbInitialized) return true;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS milestones (
        id TEXT PRIMARY KEY,
        title TEXT,
        category TEXT,
        ageMonth NUMERIC,
        completed BOOLEAN,
        dateCompleted TEXT,
        notes TEXT,
        photoUrl TEXT,
        linkedGrowthId TEXT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS health_records (
        id TEXT PRIMARY KEY,
        type TEXT,
        title TEXT,
        date TEXT,
        endDate TEXT,
        time TEXT,
        notes TEXT,
        nextDueDate TEXT,
        status TEXT,
        doctorName TEXT,
        memberId TEXT,
        medicineName TEXT,
        medicineUsage TEXT,
        medicinePhotoUrl TEXT,
        dosage TEXT,
        frequency TEXT,
        medications JSONB
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        title TEXT,
        amount NUMERIC,
        category TEXT,
        date TEXT,
        isSubscription BOOLEAN,
        frequency TEXT,
        renewalDate TEXT,
        status TEXT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        title TEXT,
        location TEXT,
        startDate TEXT,
        startTime TEXT,
        endDate TEXT,
        endTime TEXT,
        status TEXT,
        todos JSONB
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS caregivers (
        id TEXT PRIMARY KEY,
        name TEXT,
        role TEXT,
        phone TEXT,
        email TEXT,
        accessLevel TEXT,
        lastActive TEXT,
        photoUrl TEXT,
        dateOfBirth TEXT,
        bloodType TEXT,
        allergies TEXT,
        doctorName TEXT
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS growth_records (
        id TEXT PRIMARY KEY,
        date TEXT,
        ageMonths NUMERIC,
        heightCm NUMERIC,
        weightKg NUMERIC,
        headCircumferenceCm NUMERIC
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS app_settings (
        user_id TEXT PRIMARY KEY,
        font TEXT,
        density TEXT,
        accentColor TEXT,
        glassIntensity TEXT,
        language TEXT,
        monthlyBudget NUMERIC,
        cornerRadius TEXT,
        appStyle TEXT,
        liveBackground TEXT,
        loan_stage NUMERIC,
        loan_fees TEXT
      );
    `;
    await repairDatabaseSchema();
    isDbInitialized = true;
    return true;
  } catch (e) {
    console.error("DB Init Error", e);
    return false;
  }
};

export const seedFamilyData = async () => {
  try {
    const current = await getCaregivers();
    for (const initial of INITIAL_CAREGIVERS) {
        const exists = current.find(c => c.id === initial.id);
        if (!exists) {
            await saveCaregiver(initial);
        }
    }
    return true;
  } catch (e) {
    console.error("Seeding Error", e);
    return false;
  }
};

export const resetDatabase = async () => {
    try {
        await sql`TRUNCATE TABLE expenses, health_records, milestones, trips, growth_records`;
        return true;
    } catch(e) {
        console.error(e);
        return false;
    }
}

export const testConnection = async () => {
  try {
    const result = await sql`SELECT version()`;
    return { success: true, version: result[0].version };
  } catch (error) {
    console.error("Database Connection Error:", error);
    return { success: false, error };
  }
};

const formatDate = (d: any) => {
    if (!d) return '';
    if (d instanceof Date) return d.toISOString().split('T')[0];
    return String(d);
}

export const getMilestones = async () => {
    const res = await sql`SELECT * FROM milestones ORDER BY ageMonth ASC`;
    return res.map((row: any) => ({
        id: row.id,
        title: row.title,
        category: row.category,
        ageMonth: Number(row.agemonth || row.ageMonth),
        completed: row.completed,
        dateCompleted: formatDate(row.datecompleted || row.dateCompleted),
        notes: row.notes,
        photoUrl: row.photourl || row.photoUrl,
        linkedGrowthId: row.linkedgrowthid || row.linkedGrowthId
    })) as Milestone[];
}

export const saveMilestone = async (m: Milestone) => {
    await sql`
      INSERT INTO milestones (id, title, category, agemonth, completed, datecompleted, notes, photourl, linkedgrowthid)
      VALUES (${m.id}, ${m.title}, ${m.category}, ${m.ageMonth}, ${m.completed}, ${m.dateCompleted || null}, ${m.notes || ''}, ${m.photoUrl || ''}, ${m.linkedGrowthId || null})
      ON CONFLICT (id) DO UPDATE SET 
        title = EXCLUDED.title,
        category = EXCLUDED.category,
        agemonth = EXCLUDED.agemonth,
        completed = EXCLUDED.completed,
        datecompleted = EXCLUDED.datecompleted,
        notes = EXCLUDED.notes,
        photourl = EXCLUDED.photourl,
        linkedgrowthid = EXCLUDED.linkedgrowthid
    `;
}

export const deleteMilestone = async (id: string) => {
    try {
        const result = await sql`DELETE FROM milestones WHERE id = ${id} RETURNING id`;
        return result.length > 0;
    } catch (e) {
        console.error("Failed to delete milestone:", e);
        return false;
    }
}

export const getHealthRecords = async () => {
    const res = await sql`SELECT * FROM health_records ORDER BY date DESC`;
    return res.map((row: any) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        date: formatDate(row.date),
        endDate: formatDate(row.enddate || row.endDate),
        time: row.time,
        notes: row.notes,
        nextDueDate: formatDate(row.nextduedate || row.nextDueDate),
        status: row.status,
        doctorName: row.doctorname || row.doctorName,
        memberId: row.memberid || row.memberId,
        medicineName: row.medicinename || row.medicineName,
        medicineUsage: row.medicineusage || row.medicineUsage,
        medicinePhotoUrl: row.medicinephotourl || row.medicinePhotoUrl,
        dosage: row.dosage,
        frequency: row.frequency,
        medications: Array.isArray(row.medications) ? row.medications : []
    })) as MedicalRecord[];
}

export const saveHealthRecord = async (r: MedicalRecord) => {
    let legacyName = r.medicineName || '';
    let legacyUsage = r.medicineUsage || '';
    let legacyPhoto = r.medicinePhotoUrl || '';
    let legacyDosage = r.dosage || '';
    let legacyFreq = r.frequency || '';

    if (r.medications && r.medications.length > 0) {
        const first = r.medications[0];
        legacyName = legacyName || first.name;
        legacyUsage = legacyUsage || first.usage || '';
        legacyPhoto = legacyPhoto || first.photoUrl || '';
        legacyDosage = legacyDosage || first.dosage;
        legacyFreq = legacyFreq || first.frequency;
    }

    await sql`
      INSERT INTO health_records (id, type, title, date, endDate, time, notes, nextDueDate, status, doctorName, memberId, medicineName, medicineUsage, medicinePhotoUrl, dosage, frequency, medications)
      VALUES (
        ${r.id}, 
        ${r.type}, 
        ${r.title}, 
        ${r.date}, 
        ${r.endDate || null}, 
        ${r.time || ''}, 
        ${r.notes || ''}, 
        ${r.nextDueDate || null}, 
        ${r.status}, 
        ${r.doctorName || ''}, 
        ${r.memberId || null}, 
        ${legacyName}, 
        ${legacyUsage}, 
        ${legacyPhoto},
        ${legacyDosage},
        ${legacyFreq},
        ${JSON.stringify(r.medications || [])}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        type = EXCLUDED.type,
        date = EXCLUDED.date,
        endDate = EXCLUDED.endDate,
        time = EXCLUDED.time,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        nextDueDate = EXCLUDED.nextDueDate,
        doctorName = EXCLUDED.doctorName,
        memberId = EXCLUDED.memberId,
        medicineName = EXCLUDED.medicineName,
        medicineUsage = EXCLUDED.medicineUsage,
        medicinePhotoUrl = EXCLUDED.medicinePhotoUrl,
        dosage = EXCLUDED.dosage,
        frequency = EXCLUDED.frequency,
        medications = EXCLUDED.medications
    `;
}

export const deleteHealthRecord = async (id: string) => {
    await sql`DELETE FROM health_records WHERE id = ${id}`;
}

export const getExpenses = async () => {
    const res = await sql`SELECT * FROM expenses ORDER BY date DESC`;
    return res.map(r => ({
        id: r.id,
        title: r.title,
        amount: Number(r.amount),
        category: r.category,
        date: formatDate(r.date),
        isSubscription: !!(r.issubscription || r.isSubscription), 
        frequency: r.frequency,
        renewalDate: formatDate(r.renewaldate || r.renewalDate),
        status: (r.issubscription || r.isSubscription) ? (r.status || 'Active') : r.status
    })) as Expense[];
}

export const saveExpense = async (e: Expense) => {
    await sql`
      INSERT INTO expenses (id, title, amount, category, date, isSubscription, frequency, renewalDate, status)
      VALUES (${e.id}, ${e.title}, ${e.amount}, ${e.category}, ${e.date}, ${e.isSubscription}, ${e.frequency || null}, ${e.renewalDate || null}, ${e.status || null})
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        amount = EXCLUDED.amount,
        category = EXCLUDED.category,
        date = EXCLUDED.date,
        isSubscription = EXCLUDED.isSubscription,
        frequency = EXCLUDED.frequency,
        renewalDate = EXCLUDED.renewalDate,
        status = EXCLUDED.status
    `;
}

export const deleteExpense = async (id: string) => {
    await sql`DELETE FROM expenses WHERE id = ${id}`;
}

export const getTrips = async () => {
    const res = await sql`SELECT * FROM trips ORDER BY startDate ASC`;
    return res.map((row: any) => ({
        id: row.id,
        title: row.title,
        location: row.location,
        startDate: formatDate(row.startdate || row.startDate),
        startTime: row.starttime || row.startTime,
        endDate: formatDate(row.enddate || row.endDate),
        endTime: row.endtime || row.endTime,
        status: row.status,
        todos: row.todos || []
    })) as Trip[];
}

export const saveTrip = async (t: Trip) => {
    await sql`
      INSERT INTO trips (id, title, location, startdate, starttime, enddate, endtime, status, todos)
      VALUES (${t.id}, ${t.title}, ${t.location}, ${t.startDate}, ${t.startTime || ''}, ${t.endDate}, ${t.endTime || ''}, ${t.status}, ${JSON.stringify(t.todos)})
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        location = EXCLUDED.location,
        startdate = EXCLUDED.startdate,
        starttime = EXCLUDED.starttime,
        enddate = EXCLUDED.enddate,
        endtime = EXCLUDED.endtime,
        status = EXCLUDED.status,
        todos = EXCLUDED.todos
    `;
}

export const deleteTrip = async (id: string) => {
    await sql`DELETE FROM trips WHERE id = ${id}`;
}

export const getCaregivers = async () => {
    const res = await sql`SELECT * FROM caregivers ORDER BY name ASC`;
    return res.map((row: any) => ({
        id: row.id,
        name: row.name,
        role: row.role,
        phone: row.phone,
        email: row.email,
        accessLevel: row.accesslevel || row.accessLevel,
        lastActive: row.lastactive || row.lastActive,
        photoUrl: row.photourl || row.photoUrl,
        dateOfBirth: formatDate(row.dateofbirth || row.dateOfBirth),
        bloodType: row.bloodtype || row.bloodType,
        allergies: row.allergies,
        doctorName: row.doctorname || row.doctorName
    })) as Caregiver[];
}

export const saveCaregiver = async (c: Caregiver) => {
    await sql`
      INSERT INTO caregivers (id, name, role, phone, email, accesslevel, lastactive, photourl, dateofbirth, bloodtype, allergies, doctorname)
      VALUES (${c.id}, ${c.name}, ${c.role}, ${c.phone || ''}, ${c.email || ''}, ${c.accessLevel}, ${c.lastActive}, ${c.photoUrl || ''}, ${c.dateOfBirth || ''}, ${c.bloodType || ''}, ${c.allergies || ''}, ${c.doctorName || ''})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        accesslevel = EXCLUDED.accesslevel,
        photourl = EXCLUDED.photourl,
        dateofbirth = EXCLUDED.dateofbirth,
        bloodtype = EXCLUDED.bloodtype,
        allergies = EXCLUDED.allergies,
        doctorname = EXCLUDED.doctorname
    `;
}

export const deleteCaregiver = async (id: string) => {
    await sql`DELETE FROM caregivers WHERE id = ${id}`;
}

export const getGrowthRecords = async () => {
    const res = await sql`SELECT * FROM growth_records ORDER BY ageMonths ASC`;
    return res.map(r => ({
        ...r, 
        date: formatDate(r.date),
        ageMonths: Number(r.agemonths || r.ageMonths), 
        heightCm: Number(r.heightcm || r.heightCm),
        weightKg: Number(r.weightkg || r.weightKg),
        headCircumferenceCm: Number(r.headcircumferencecm || r.headCircumferenceCm)
    })) as GrowthRecord[];
}

export const saveGrowthRecord = async (g: GrowthRecord) => {
    await sql`
      INSERT INTO growth_records (id, date, ageMonths, heightCm, weightKg, headCircumferenceCm)
      VALUES (${g.id}, ${g.date}, ${g.ageMonths}, ${g.heightCm}, ${g.weightKg}, ${g.headCircumferenceCm})
      ON CONFLICT (id) DO UPDATE SET
        heightCm = EXCLUDED.heightCm,
        weightKg = EXCLUDED.weightKg,
        headCircumferenceCm = EXCLUDED.headCircumferenceCm
    `;
}

export const deleteGrowthRecord = async (id: string) => {
    await sql`DELETE FROM growth_records WHERE id = ${id}`;
}

export const saveSettings = async (userId: string, s: AppSettings) => {
    await sql`
        INSERT INTO app_settings (user_id, font, density, accentColor, glassIntensity, language, monthlyBudget, cornerRadius, appStyle, liveBackground, loan_stage, loan_fees)
        VALUES (${userId}, ${s.font}, ${s.density}, ${s.accentColor}, ${s.glassIntensity}, ${s.language}, ${s.monthlyBudget}, ${s.cornerRadius}, ${s.appStyle}, ${s.liveBackground}, ${s.loanStage}, ${s.loanFees})
        ON CONFLICT (user_id) DO UPDATE SET
            font = EXCLUDED.font,
            density = EXCLUDED.density,
            accentColor = EXCLUDED.accentColor,
            glassIntensity = EXCLUDED.glassIntensity,
            language = EXCLUDED.language,
            monthlyBudget = EXCLUDED.monthlyBudget,
            cornerRadius = EXCLUDED.cornerRadius,
            appStyle = EXCLUDED.appStyle,
            liveBackground = EXCLUDED.liveBackground,
            loan_stage = EXCLUDED.loan_stage,
            loan_fees = EXCLUDED.loan_fees
    `;
}

export const getSettings = async (userId: string) => {
    try {
        const res = await sql`SELECT * FROM app_settings WHERE user_id = ${userId}`;
        if(res[0]) {
            return {
                font: res[0].font,
                density: res[0].density,
                accentColor: res[0].accentcolor || res[0].accentColor,
                glassIntensity: res[0].glassintensity || res[0].glassIntensity,
                language: res[0].language,
                monthlyBudget: Number(res[0].monthlybudget || res[0].monthlyBudget),
                cornerRadius: res[0].cornerradius || res[0].cornerRadius || 'large',
                appStyle: res[0].appstyle || res[0].appStyle || 'glass',
                liveBackground: res[0].livebackground || res[0].liveBackground || 'none',
                loanStage: Number(res[0].loan_stage || res[0].loanStage || -1),
                loanFees: res[0].loan_fees || res[0].loanFees || ''
            } as AppSettings;
        }
    } catch (e) {
        console.error("Failed to get settings", e);
    }
    return undefined;
}

export const checkAndGenerateRecurringExpenses = async () => {
  try {
    const expenses = await getExpenses();
    if (!expenses || expenses.length === 0) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    const newExpenses: Expense[] = [];
    const activeSubs = expenses.filter(e => e.isSubscription && e.status === 'Active');

    for (const sub of activeSubs) {
        let nextDueDate = new Date(sub.date);
        let safety = 0;
        while(safety < 60) {
            if (sub.frequency === 'Weekly') nextDueDate.setDate(nextDueDate.getDate() + 7);
            else if (sub.frequency === 'Yearly') nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
            else {
                const expectedDay = nextDueDate.getDate();
                nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                if (nextDueDate.getDate() !== expectedDay) nextDueDate.setDate(0); 
            }
            const dateStr = nextDueDate.toISOString().split('T')[0];
            if (dateStr > todayStr) break;
            const exists = expenses.some(e => e.title === sub.title && e.date === dateStr);
            const pending = newExpenses.some(e => e.title === sub.title && e.date === dateStr);
            if (!exists && !pending) {
                newExpenses.push({
                    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    title: sub.title,
                    amount: sub.amount,
                    category: sub.category,
                    date: dateStr,
                    isSubscription: false
                });
            }
            safety++;
        }
    }
    if (newExpenses.length > 0) {
        for (const exp of newExpenses) await saveExpense(exp);
        return true;
    }
    return false;
  } catch (e) {
      console.error("Error generating recurring expenses", e);
      return false;
  }
}
