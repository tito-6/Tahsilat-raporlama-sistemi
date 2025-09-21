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

    // Export as Excel
    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      
      // Create worksheet data
      const wsData = [];
      
      // Add title rows
      wsData.push([reportData.data.report_title || 'TAHSİLATLAR TABLOSU']);
      wsData.push([`Tarih: ${reportData.data.date_range || ''}`]);
      wsData.push([`Ödeme Şekli: ${reportData.data.payment_method || 'Tümü'}`]);
      wsData.push([]); // Empty row
      
      // Add header row
      const headerRow = [
        'SIRA NO', 
        'MÜŞTERİ ADI SOYADI', 
        'PROJE', 
        'Pazartesi', 
        'Salı', 
        'Çarşamba', 
        'Perşembe', 
        'Cuma', 
        'Cumartesi', 
        'Pazar', 
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
      }
      
      wsData.push(headerRow);
      
      // Add data rows
      if (reportData.data.weekly_report) {
        reportData.data.weekly_report.forEach((row: any) => {
          // TL row
          wsData.push([
            row.sira_no,
            row.musteri_adi,
            row.proje,
            row.pazartesi?.tl || 0,
            row.sali?.tl || 0,
            row.carsamba?.tl || 0,
            row.persembe?.tl || 0,
            row.cuma?.tl || 0,
            row.cumartesi?.tl || 0,
            row.pazar?.tl || 0,
            row.genel_toplam?.tl || 0
          ]);
          
          // USD row (as comment/note)
          wsData.push([
            '',
            '',
            '',
            row.pazartesi?.usd ? `$${row.pazartesi.usd}` : '',
            row.sali?.usd ? `$${row.sali.usd}` : '',
            row.carsamba?.usd ? `$${row.carsamba.usd}` : '',
            row.persembe?.usd ? `$${row.persembe.usd}` : '',
            row.cuma?.usd ? `$${row.cuma.usd}` : '',
            row.cumartesi?.usd ? `$${row.cumartesi.usd}` : '',
            row.pazar?.usd ? `$${row.pazar.usd}` : '',
            row.genel_toplam?.usd ? `$${row.genel_toplam.usd}` : ''
          ]);
        });
      }
      
      // Add totals row
      if (reportData.data.week_totals) {
        const totals = reportData.data.week_totals;
        wsData.push([
          'TOPLAM',
          '',
          '',
          totals.pazartesi?.tl || 0,
          totals.sali?.tl || 0,
          totals.carsamba?.tl || 0,
          totals.persembe?.tl || 0,
          totals.cuma?.tl || 0,
          totals.cumartesi?.tl || 0,
          totals.pazar?.tl || 0,
          totals.genel_toplam?.tl || 0
        ]);
        
        wsData.push([
          '',
          '',
          '',
          totals.pazartesi?.usd ? `$${totals.pazartesi.usd}` : '',
          totals.sali?.usd ? `$${totals.sali.usd}` : '',
          totals.carsamba?.usd ? `$${totals.carsamba.usd}` : '',
          totals.persembe?.usd ? `$${totals.persembe.usd}` : '',
          totals.cuma?.usd ? `$${totals.cuma.usd}` : '',
          totals.cumartesi?.usd ? `$${totals.cumartesi.usd}` : '',
          totals.pazar?.usd ? `$${totals.pazar.usd}` : '',
          totals.genel_toplam?.usd ? `$${totals.genel_toplam.usd}` : ''
        ]);
      }
      
      // Add the worksheet to the workbook
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Tahsilat Raporu');
      
      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
      
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
          // TL row
          csvContent += `${row.sira_no},${row.musteri_adi},${row.proje},`;
          csvContent += `${row.pazartesi?.tl || 0},${row.sali?.tl || 0},${row.carsamba?.tl || 0},`;
          csvContent += `${row.persembe?.tl || 0},${row.cuma?.tl || 0},${row.cumartesi?.tl || 0},`;
          csvContent += `${row.pazar?.tl || 0},${row.genel_toplam?.tl || 0}\n`;
          
          // USD row
          csvContent += `,,,"$${row.pazartesi?.usd || 0}","$${row.sali?.usd || 0}","$${row.carsamba?.usd || 0}",`;
          csvContent += `"$${row.persembe?.usd || 0}","$${row.cuma?.usd || 0}","$${row.cumartesi?.usd || 0}",`;
          csvContent += `"$${row.pazar?.usd || 0}","$${row.genel_toplam?.usd || 0}"\n`;
        });
      }
      
      // Add totals row
      if (reportData.data.week_totals) {
        const totals = reportData.data.week_totals;
        csvContent += `TOPLAM,,,${totals.pazartesi?.tl || 0},${totals.sali?.tl || 0},`;
        csvContent += `${totals.carsamba?.tl || 0},${totals.persembe?.tl || 0},`;
        csvContent += `${totals.cuma?.tl || 0},${totals.cumartesi?.tl || 0},`;
        csvContent += `${totals.pazar?.tl || 0},${totals.genel_toplam?.tl || 0}\n`;
        
        csvContent += `,,,"$${totals.pazartesi?.usd || 0}","$${totals.sali?.usd || 0}",`;
        csvContent += `"$${totals.carsamba?.usd || 0}","$${totals.persembe?.usd || 0}",`;
        csvContent += `"$${totals.cuma?.usd || 0}","$${totals.cumartesi?.usd || 0}",`;
        csvContent += `"$${totals.pazar?.usd || 0}","$${totals.genel_toplam?.usd || 0}"\n`;
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