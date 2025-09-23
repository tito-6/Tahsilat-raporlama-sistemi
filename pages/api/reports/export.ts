import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import { format as dateFnsFormat } from 'date-fns';

export const config = {
  api: {
    responseLimit: false,
  },
};

// Helper function to format currency values exactly like UI (no symbol, comma-separated)
function formatCurrency(value: number, showSymbol: boolean = false): string {
  if (!value || isNaN(value)) return showSymbol ? '$0' : '0';
  const formatted = value.toLocaleString('en-US', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });
  return showSymbol ? `$${formatted}` : formatted;
}

// Helper function to translate payment methods to Turkish
function translatePaymentMethod(method: string): string {
  const translations: Record<string, string> = {
    'Bank Transfer': 'Banka Havalesi',
    'Cash': 'Nakit',
    'Check': 'Çek',
    'Credit Card': 'Kredi Kartı'
  };
  return translations[method] || method;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { format = 'json', start_date, end_date, report_type = 'turkish' } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    // Fetch the report data first
    const apiPath = report_type === 'turkish' 
      ? '/api/reports/turkish-weekly' 
      : '/api/reports/weekly';
    
    const reportResponse = await fetch(
      `${req.headers.origin || 'http://localhost:3000'}${apiPath}?start_date=${start_date}&end_date=${end_date}`
    );

    if (!reportResponse.ok) {
      return res.status(reportResponse.status).json({ 
        error: 'Failed to generate report', 
        message: 'Could not fetch report data' 
      });
    }

    const reportData = await reportResponse.json();
    
    if (!reportData.success || !reportData.data) {
      return res.status(400).json({ 
        error: 'Invalid report data', 
        message: 'Report data is not in the expected format' 
      });
    }

    // Return JSON format directly
    if (format === 'json') {
      return res.status(200).json(reportData);
    }

    // Create a date-based filename
    const dateStr = reportData.data.date_range || 
      dateFnsFormat(new Date(), 'dd-MM-yyyy');
    
    const filename = `tahsilat_raporu_${dateStr}`;

    // Export as Excel with enhanced formatting
    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      
      // Create main worksheet data
      const wsData = [];
      let currentRow = 0;
      
      // Company Header
      wsData.push([reportData.data.report_title || 'MODEL KUYUM-MODEL SANAYİ MERKEZİ TAHSİLATLAR TABLOSU']);
      wsData.push([`Tarih: ${reportData.data.date_range || ''}`]);
      wsData.push([`Ödeme Şekli: ${reportData.data.payment_method || 'Banka Havalesi-Nakit'}`]);
      wsData.push([]); // Empty row
      currentRow = 4;
      
      // Main Collections Table Header
      const headerRow = [
        'SIRA NO', 
        'MÜŞTERİ ADI SOYADI', 
        'PROJE', 
        'PZT', 
        'SAL', 
        'ÇAR', 
        'PER', 
        'CUM', 
        'CTS', 
        'PAZ', 
        'GENEL TOPLAM'
      ];
      
      // Add date subheaders if available
      const dateSubheaderRow = ['', '', ''];
      if (reportData.data.day_map) {
        dateSubheaderRow.push(
          reportData.data.day_map.pazartesi || '',
          reportData.data.day_map.sali || '',
          reportData.data.day_map.carsamba || '',
          reportData.data.day_map.persembe || '',
          reportData.data.day_map.cuma || '',
          reportData.data.day_map.cumartesi || '',
          reportData.data.day_map.pazar || '',
          ''
        );
        wsData.push(dateSubheaderRow);
        currentRow++;
      }
      
      wsData.push(headerRow);
      currentRow++;
      
      // Add main collections data rows
      if (reportData.data.weekly_report) {
        reportData.data.weekly_report.forEach((row: any) => {
          wsData.push([
            row.sira_no,
            row.musteri_adi,
            row.proje,
            formatCurrency(row.pazartesi?.usd || 0, false),
            formatCurrency(row.sali?.usd || 0, false),
            formatCurrency(row.carsamba?.usd || 0, false),
            formatCurrency(row.persembe?.usd || 0, false),
            formatCurrency(row.cuma?.usd || 0, false),
            formatCurrency(row.cumartesi?.usd || 0, false),
            formatCurrency(row.pazar?.usd || 0, false),
            formatCurrency(row.genel_toplam?.usd || 0, false)
          ]);
          currentRow++;
        });
      }
      
      // Add totals row
      if (reportData.data.week_totals) {
        const totals = reportData.data.week_totals;
        wsData.push([
          'TOPLAM',
          '',
          '',
          formatCurrency(totals.pazartesi?.usd || 0, false),
          formatCurrency(totals.sali?.usd || 0, false),
          formatCurrency(totals.carsamba?.usd || 0, false),
          formatCurrency(totals.persembe?.usd || 0, false),
          formatCurrency(totals.cuma?.usd || 0, false),
          formatCurrency(totals.cumartesi?.usd || 0, false),
          formatCurrency(totals.pazar?.usd || 0, false),
          formatCurrency(totals.genel_toplam?.usd || 0, false)
        ]);
        currentRow++;
      }
      
      // Add empty rows before check payments
      wsData.push([]);
      wsData.push([]);
      currentRow += 2;
      
      // Check Payments Table
      if (reportData.data.check_payments && reportData.data.check_payments.length > 0) {
        // Center the title across the table width
        wsData.push(['HAFTALIK GENEL TAHSİLATLAR (ÇEK ÖDEMELERİ)', '', '', '', '', '', '', '', '', '', '']);
        wsData.push(headerRow); // Same header structure
        currentRow += 2;
        
        reportData.data.check_payments.forEach((row: any) => {
          wsData.push([
            row.sira_no,
            row.musteri_adi,
            row.proje,
            formatCurrency(row.pazartesi?.usd || 0, false),
            formatCurrency(row.sali?.usd || 0, false),
            formatCurrency(row.carsamba?.usd || 0, false),
            formatCurrency(row.persembe?.usd || 0, false),
            formatCurrency(row.cuma?.usd || 0, false),
            formatCurrency(row.cumartesi?.usd || 0, false),
            formatCurrency(row.pazar?.usd || 0, false),
            formatCurrency(row.genel_toplam?.usd || 0, false)
          ]);
          currentRow++;
        });
        
        // Check totals
        if (reportData.data.check_totals) {
          const checkTotals = reportData.data.check_totals;
          wsData.push([
            'TOPLAM',
            '',
            '',
            formatCurrency(checkTotals.pazartesi?.usd || 0, false),
            formatCurrency(checkTotals.sali?.usd || 0, false),
            formatCurrency(checkTotals.carsamba?.usd || 0, false),
            formatCurrency(checkTotals.persembe?.usd || 0, false),
            formatCurrency(checkTotals.cuma?.usd || 0, false),
            formatCurrency(checkTotals.cumartesi?.usd || 0, false),
            formatCurrency(checkTotals.pazar?.usd || 0, false),
            formatCurrency(checkTotals.genel_toplam?.usd || 0, false)
          ]);
          currentRow++;
        }
        
        wsData.push([]);
        wsData.push([]);
        currentRow += 2;
      }
      
      // Summary Tables Section - Properly Formatted
      wsData.push(['ÖZET TABLOLAR', '', '', '', '', '', '', '', '', '', '']);
      wsData.push([]);
      currentRow += 2;
      
      // Payment Method Summary
      wsData.push(['Ödeme Nedeni Özeti', '', '', '', '', '', '', '', '', '', '']);
      wsData.push(['Ödeme Şekli', 'Adet', '', '', '', '', '', '', '', '', '']);
      if (reportData.data.payment_methods) {
        Object.entries(reportData.data.payment_methods).forEach(([method, count]) => {
          wsData.push([translatePaymentMethod(method), count, '', '', '', '', '', '', '', '', '']);
          currentRow++;
        });
      }
      wsData.push([]);
      currentRow += 3;
      
      // Weekly Summary
      wsData.push(['Haftalık Toplam Özeti', '', '', '', '', '', '', '', '', '', '']);
      wsData.push(['Dönem', 'USD', '', '', '', '', '', '', '', '', '']);
      wsData.push(['HAFTALIK MKM', formatCurrency(reportData.data.summary_tables?.periodic_summary?.weekly?.['HAFTALIK MKM'] || 0, false), '', '', '', '', '', '', '', '', '']);
      wsData.push(['HAFTALIK MSM', formatCurrency(reportData.data.summary_tables?.periodic_summary?.weekly?.['HAFTALIK MSM'] || 0, false), '', '', '', '', '', '', '', '', '']);
      wsData.push(['TOPLAM', formatCurrency(reportData.data.summary_tables?.periodic_summary?.weekly?.['TOPLAM'] || 0, false), '', '', '', '', '', '', '', '', '']);
      wsData.push([]);
      currentRow += 6;
      
      // Monthly Summary
      wsData.push(['Aylık Toplam Özeti', '', '', '', '', '', '', '', '', '', '']);
      wsData.push(['Dönem', 'USD', '', '', '', '', '', '', '', '', '']);
      wsData.push(['AYLIK MKM', formatCurrency(reportData.data.summary_tables?.collection_details?.['TOPLAM']?.mkm || 0, false), '', '', '', '', '', '', '', '', '']);
      wsData.push(['AYLIK MSM', formatCurrency(reportData.data.summary_tables?.collection_details?.['TOPLAM']?.msm || 0, false), '', '', '', '', '', '', '', '', '']);
      wsData.push(['TOPLAM', formatCurrency((reportData.data.summary_tables?.collection_details?.['TOPLAM']?.mkm || 0) + (reportData.data.summary_tables?.collection_details?.['TOPLAM']?.msm || 0), false), '', '', '', '', '', '', '', '', '']);
      wsData.push([]);
      currentRow += 6;
      
      // Collection Details
      wsData.push(['Tahsilat Detayları', '', '', '', '', '', '', '', '', '', '']);
      wsData.push(['Kategori', 'MKM AYLIK USD', 'MSM AYLIK USD', 'TOPLAM USD', '', '', '', '', '', '', '']);
      ['CARŞI', 'KUYUMCUKENT', 'OFİS', 'BANKA HAVALESİ', 'ÇEK', 'TOPLAM'].forEach(category => {
        const details = reportData.data.summary_tables?.collection_details?.[category];
        wsData.push([
          category,
          formatCurrency(details?.mkm || 0, false),
          formatCurrency(details?.msm || 0, false),
          formatCurrency((details?.mkm || 0) + (details?.msm || 0), false),
          '', '', '', '', '', '', ''
        ]);
        currentRow++;
      });
      wsData.push([]);
      currentRow += 8;
      
      // Daily Breakdown - Vertical Format for Better Reading
      wsData.push(['Günlük Tahsilat Detayları', '', '', '', '', '', '', '', '', '', '']);
      wsData.push(['Gün', 'Miktar USD', '', '', '', '', '', '', '', '', '']);
      
      // Add each day as a separate row (vertical format)
      for (let day = 1; day <= 31; day++) {
        const dayStr = day.toString().padStart(2, '0');
        const dateKey = `${dayStr}-09-2025`;
        const amount = reportData.data.monthly_daily_totals?.daily_totals?.[dateKey] || 0;
        
        wsData.push([
          `${day} Eylül`,
          amount > 0 ? formatCurrency(amount, false) : '-',
          '', '', '', '', '', '', '', '', ''
        ]);
        currentRow++;
      }
      
      // Add total row
      wsData.push([
        'TOPLAM',
        formatCurrency((reportData.data.summary_tables?.collection_details?.['TOPLAM']?.mkm || 0) + (reportData.data.summary_tables?.collection_details?.['TOPLAM']?.msm || 0), false),
        '', '', '', '', '', '', '', '', ''
      ]);
      
      // Create the worksheet
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Apply comprehensive styling with borders - matching UI exactly
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      
      // Define border styles to match UI (gray.300 = #D1D5DB)
      const standardBorder = {
        top: { style: 'thin', color: { rgb: 'D1D5DB' } },
        bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
        left: { style: 'thin', color: { rgb: 'D1D5DB' } },
        right: { style: 'thin', color: { rgb: 'D1D5DB' } }
      };
      
      const thickBorder = {
        top: { style: 'medium', color: { rgb: '4A5568' } },
        bottom: { style: 'medium', color: { rgb: '4A5568' } },
        left: { style: 'medium', color: { rgb: '4A5568' } },
        right: { style: 'medium', color: { rgb: '4A5568' } }
      };
      
      // Apply styling to all cells with borders like in UI
      for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          
          // Initialize cell if it doesn't exist
          if (!ws[cellAddress]) {
            ws[cellAddress] = { t: 's', v: '' };
          }
          
          // Initialize cell style
          if (!ws[cellAddress].s) {
            ws[cellAddress].s = {};
          }
          
          // Apply standard borders to ALL cells (matching UI)
          ws[cellAddress].s.border = standardBorder;
          
          // Base font matching UI
          ws[cellAddress].s.font = {
            name: 'Century Gothic',
            sz: 10,
            color: { rgb: '1A202C' }
          };
          
          // Title rows (0-2) - Main header - matching UI header style
          if (row <= 2) {
            ws[cellAddress].s.font = {
              name: 'Century Gothic',
              sz: 14,
              bold: true,
              color: { rgb: '1A365D' }
            };
            ws[cellAddress].s.alignment = {
              horizontal: 'center',
              vertical: 'center',
              wrapText: true
            };
            ws[cellAddress].s.fill = {
              patternType: 'solid',
              fgColor: { rgb: 'EBF8FF' }
            };
            ws[cellAddress].s.border = thickBorder;
          }
          
          // Date subheader row - smaller text, centered
          else if (wsData[row] && wsData[row][col] && wsData[row][col].toString().includes('.')) {
            ws[cellAddress].s.font = {
              name: 'Century Gothic',
              sz: 9,
              color: { rgb: '4A5568' }
            };
            ws[cellAddress].s.alignment = {
              horizontal: 'center',
              vertical: 'center'
            };
            ws[cellAddress].s.fill = {
              patternType: 'solid',
              fgColor: { rgb: 'F7FAFC' }
            };
          }
          
          // Main data table headers (SIRA NO, MÜŞTERİ ADI, etc.)
          else if (wsData[row] && wsData[row][0] && wsData[row][0].toString().includes('SIRA NO')) {
            ws[cellAddress].s.font = {
              name: 'Century Gothic',
              sz: 10,
              bold: true,
              color: { rgb: 'FFFFFF' }
            };
            ws[cellAddress].s.alignment = {
              horizontal: col <= 2 ? (col === 0 ? 'center' : 'left') : 'center',
              vertical: 'center'
            };
            ws[cellAddress].s.fill = {
              patternType: 'solid',
              fgColor: { rgb: '4A5568' }
            };
            ws[cellAddress].s.border = thickBorder;
          }
          
          // Section headers (HAFTALIK GENEL TAHSİLATLAR, ÖZET TABLOLAR, etc.)
          else if (wsData[row] && wsData[row][0] && 
              (wsData[row][0].toString().includes('HAFTALIK GENEL') ||
               wsData[row][0].toString().includes('ÖZET TABLOLAR') ||
               wsData[row][0].toString().includes('Özeti') ||
               wsData[row][0].toString().includes('Detayları'))) {
            ws[cellAddress].s.font = {
              name: 'Century Gothic',
              sz: 12,
              bold: true,
              color: { rgb: '2D3748' }
            };
            ws[cellAddress].s.alignment = {
              horizontal: 'center',
              vertical: 'center'
            };
            ws[cellAddress].s.fill = {
              patternType: 'solid',
              fgColor: { rgb: 'FED7D7' }
            };
            ws[cellAddress].s.border = thickBorder;
          }
          
          // Summary table headers (smaller headers within sections)
          else if (wsData[row] && wsData[row][0] && 
              (wsData[row][0].toString().includes('Dönem') ||
               wsData[row][0].toString().includes('Kategori') ||
               wsData[row][0].toString().includes('Gün') ||
               wsData[row][0].toString().includes('Ödeme Şekli'))) {
            ws[cellAddress].s.font = {
              name: 'Century Gothic',
              sz: 10,
              bold: true,
              color: { rgb: '2D3748' }
            };
            ws[cellAddress].s.alignment = {
              horizontal: 'center',
              vertical: 'center'
            };
            ws[cellAddress].s.fill = {
              patternType: 'solid',
              fgColor: { rgb: 'E6FFFA' }
            };
            ws[cellAddress].s.border = thickBorder;
          }
          
          // Total rows - matching UI total styling with bold font
          else if (wsData[row] && wsData[row][0] && wsData[row][0].toString() === 'TOPLAM') {
            ws[cellAddress].s.font = {
              name: 'Century Gothic',
              sz: 11,
              bold: true,
              color: { rgb: '2D3748' }
            };
            ws[cellAddress].s.alignment = {
              horizontal: col <= 2 ? (col === 0 ? 'center' : 'left') : 'center',
              vertical: 'center'
            };
            ws[cellAddress].s.fill = {
              patternType: 'solid',
              fgColor: { rgb: 'FFF5F5' }
            };
            ws[cellAddress].s.border = thickBorder;
          }
          
          // Data rows - matching UI data cell formatting
          else if (wsData[row] && wsData[row][0] && 
                   typeof wsData[row][0] === 'number' && wsData[row][0] > 0) {
            // This is a data row (has a sequence number)
            ws[cellAddress].s.font = {
              name: 'Century Gothic',
              sz: 10,
              color: { rgb: '1A202C' }
            };
            ws[cellAddress].s.alignment = {
              horizontal: col <= 2 ? (col === 0 ? 'center' : 'left') : 'center',
              vertical: 'center'
            };
            // Alternating row colors for better readability
            const isEvenRow = (row % 2 === 0);
            ws[cellAddress].s.fill = {
              patternType: 'solid',
              fgColor: { rgb: isEvenRow ? 'FFFFFF' : 'F7FAFC' }
            };
          }
          
          // Currency values formatting - center align numbers without special formatting
          else if (wsData[row] && wsData[row][col] && 
                   typeof wsData[row][col] === 'string' && 
                   (wsData[row][col].toString().includes(',') || !isNaN(parseFloat(wsData[row][col])))) {
            ws[cellAddress].s.font = {
              name: 'Century Gothic',
              sz: 10,
              color: { rgb: '1A202C' }
            };
            ws[cellAddress].s.alignment = {
              horizontal: 'center',
              vertical: 'center'
            };
          }
          
          // Empty cells styling
          else if (!wsData[row] || !wsData[row][col] || wsData[row][col] === '') {
            ws[cellAddress].s.fill = {
              patternType: 'solid',
              fgColor: { rgb: 'FFFFFF' }
            };
          }
          
          // Default data cell formatting
          else {
            ws[cellAddress].s.font = {
              name: 'Century Gothic',
              sz: 10,
              color: { rgb: '1A202C' }
            };
            ws[cellAddress].s.alignment = {
              horizontal: col <= 2 ? (col === 0 ? 'center' : 'left') : 'center',
              vertical: 'center'
            };
          }
        }
      }
      
      // Set column widths to match UI table proportions exactly
      const colWidths = [
        {wch: 8},   // SIRA NO - narrow like UI (minW="30px")
        {wch: 40},  // CUSTOMER NAME - wide like UI (minW="150px") 
        {wch: 25},  // PROJECT - medium like UI (minW="100px")
        {wch: 15},  // PZT - day columns like UI (minW="70px")
        {wch: 15},  // SAL
        {wch: 15},  // ÇAR
        {wch: 15},  // PER
        {wch: 15},  // CUM
        {wch: 15},  // CTS
        {wch: 15},  // PAZ
        {wch: 18}   // GENEL TOPLAM - slightly wider for totals
      ];
      ws['!cols'] = colWidths;
      
      // Merge cells for titles and section headers
      const merges = [
        // Main title
        { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } }
      ];
      
      // Find and merge section titles
      for (let i = 0; i < wsData.length; i++) {
        if (wsData[i] && wsData[i][0]) {
          const cellValue = wsData[i][0].toString();
          if (cellValue.includes('HAFTALIK GENEL') || 
              cellValue.includes('ÖZET TABLOLAR') ||
              cellValue.includes('Özeti') ||
              cellValue.includes('Detayları')) {
            merges.push({ s: { r: i, c: 0 }, e: { r: i, c: 10 } });
          }
        }
      }
      
      ws['!merges'] = merges;
      
      XLSX.utils.book_append_sheet(wb, ws, 'Tahsilat Raporu');
      
      // Generate Excel file with enhanced options
      const excelBuffer = XLSX.write(wb, { 
        bookType: 'xlsx', 
        type: 'buffer',
        cellStyles: true,
        Props: {
          Title: 'Tahsilat Raporu',
          Subject: 'MODEL KUYUM-MODEL SANAYİ MERKEZİ TAHSİLATLAR TABLOSU',
          Author: 'Tahsilat Raporu Sistemi',
          CreatedDate: new Date()
        }
      });
      
      // Set headers for file download
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      // Send the file
      res.status(200).send(excelBuffer);
      return;
    }

    // Export as CSV
    if (format === 'csv') {
      // Similar to Excel, but create a CSV string
      let csvContent = '';
      
      // Add title rows
      csvContent += `${reportData.data.report_title || 'TAHSİLATLAR TABLOSU'}\n`;
      csvContent += `Tarih: ${reportData.data.date_range || ''}\n`;
      csvContent += `Ödeme Şekli: ${reportData.data.payment_method || 'Tümü'}\n\n`;
      
      // Add date subheader row if available
      if (reportData.data.day_map) {
        csvContent += `,,,${reportData.data.day_map.pazartesi || ''},`;
        csvContent += `${reportData.data.day_map.sali || ''},`;
        csvContent += `${reportData.data.day_map.carsamba || ''},`;
        csvContent += `${reportData.data.day_map.persembe || ''},`;
        csvContent += `${reportData.data.day_map.cuma || ''},`;
        csvContent += `${reportData.data.day_map.cumartesi || ''},`;
        csvContent += `${reportData.data.day_map.pazar || ''},\n`;
      }
      
      // Add header row
      csvContent += 'SIRA NO,MÜŞTERİ ADI SOYADI,PROJE,Pazartesi,Salı,Çarşamba,';
      csvContent += 'Perşembe,Cuma,Cumartesi,Pazar,GENEL TOPLAM\n';
      
      // Add data rows
      if (reportData.data.weekly_report) {
        reportData.data.weekly_report.forEach((row: any) => {
          // USD row only (simplified format) - no $ symbol like UI
          csvContent += `${row.sira_no},${row.musteri_adi},${row.proje},`;
          csvContent += `${formatCurrency(row.pazartesi?.usd || 0, false)},${formatCurrency(row.sali?.usd || 0, false)},${formatCurrency(row.carsamba?.usd || 0, false)},`;
          csvContent += `${formatCurrency(row.persembe?.usd || 0, false)},${formatCurrency(row.cuma?.usd || 0, false)},${formatCurrency(row.cumartesi?.usd || 0, false)},`;
          csvContent += `${formatCurrency(row.pazar?.usd || 0, false)},${formatCurrency(row.genel_toplam?.usd || 0, false)}\n`;
        });
      }
      
      // Add totals row
      if (reportData.data.week_totals) {
        const totals = reportData.data.week_totals;
        csvContent += `TOPLAM,,,${formatCurrency(totals.pazartesi?.usd || 0, false)},${formatCurrency(totals.sali?.usd || 0, false)},`;
        csvContent += `${formatCurrency(totals.carsamba?.usd || 0, false)},${formatCurrency(totals.persembe?.usd || 0, false)},`;
        csvContent += `${formatCurrency(totals.cuma?.usd || 0, false)},${formatCurrency(totals.cumartesi?.usd || 0, false)},`;
        csvContent += `${formatCurrency(totals.pazar?.usd || 0, false)},${formatCurrency(totals.genel_toplam?.usd || 0, false)}\n`;
      }
      
      // Set headers for file download
      res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      
      // Send the file
      res.status(200).send(csvContent);
      return;
    }
    
    // Unsupported format
    return res.status(400).json({ error: 'Unsupported export format' });

  } catch (error) {
    console.error('Report export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export report',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}