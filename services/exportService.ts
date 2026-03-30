

import { Expense, MedicalRecord, GrowthRecord } from '../types';

export const exportToCSV = (data: any[], filename: string) => {
  if (!data || !data.length) return;
  
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => 
    Object.values(obj).map(val => 
      typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
    ).join(',')
  );
  
  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateICalEvent = (title: string, date: string, description?: string) => {
  // Simple iCal generator
  const formatDate = (dateStr: string) => dateStr.replace(/-/g, '');
  
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//FamilyFlow//APP//EN
BEGIN:VEVENT
UID:${Date.now()}@familyflow.app
DTSTAMP:${formatDate(new Date().toISOString().split('T')[0])}T000000Z
DTSTART:${formatDate(date)}
SUMMARY:${title}
DESCRIPTION:${description || ''}
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${title.replace(/\s+/g, '_')}.ics`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const generateCalendarICS = (events: Array<{id: string, title: string, date: string, description?: string}>) => {
  const formatDate = (dateStr: string) => dateStr.replace(/-/g, '');
  const now = formatDate(new Date().toISOString().split('T')[0]) + 'T000000Z';

  let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//FamilyFlow//APP//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:FamilyFlow Calendar
X-WR-TIMEZONE:Asia/Phnom_Penh
`;

  events.forEach((evt) => {
    // Use the event ID as the UID to prevent duplicates on re-import
    const uid = `${evt.id}@familyflow.app`;
    
    icsContent += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${now}
DTSTART;VALUE=DATE:${formatDate(evt.date)}
SUMMARY:${evt.title}
DESCRIPTION:${evt.description || ''}
STATUS:CONFIRMED
END:VEVENT
`;
  });

  icsContent += `END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `FamilyFlow_Calendar.ics`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
