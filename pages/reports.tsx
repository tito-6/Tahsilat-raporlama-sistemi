import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Flex,
  HStack,
  VStack,
  Heading,
  Text,
  Stack,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Alert,
  AlertIcon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Icon,
} from '@chakra-ui/react';
import { ChevronDownIcon, DownloadIcon } from '@chakra-ui/icons';
import { useNotifications } from '../contexts/NotificationContext';
import { FaPrint } from 'react-icons/fa';
import axios from 'axios';
import Layout from '../components/Layout';

// Define TypeScript interfaces for our report data
interface WeeklyReport {
  week_number: number;
  week_start: string;
  week_end: string;
  year: number;
  month: number;
  formatted_date: string;
  has_data: boolean;
}

// Array of month names for dropdown
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const ReportsPage = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingReportList, setIsLoadingReportList] = useState<boolean>(true);
  const [reportData, setReportData] = useState<any | null>(null);
  const [weeklyReports, setWeeklyReports] = useState<WeeklyReport[]>([]);
  const [allWeekReports, setAllWeekReports] = useState<{[key: number]: any}>({});
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedMonth, setSelectedMonth] = useState<number>(9);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<{[key: string]: boolean}>({});
  const { addNotification } = useNotifications();

  // Helper function to format currency properly for print (same as web interface)
  const formatCurrencyForPrint = (value: number): string => {
    if (!value || isNaN(value)) return '0';
    return value.toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    });
  };

  // Helper function to translate payment methods to Turkish
  const translatePaymentMethod = (method: string): string => {
    const translations: Record<string, string> = {
      'Bank Transfer': 'Banka Havalesi',
      'Cash': 'Nakit', 
      'Check': 'Çek',
      'Credit Card': 'Kredi Kartı'
    };
    return translations[method] || method;
  };

  // Consolidated fetch and load function
  const fetchAndLoadAllReports = async (forceRegenerate = false) => {
    try {
      setIsLoadingReportList(true);
      setError(null);
      
      if (forceRegenerate) {
        addNotification({
          title: "Regenerating Reports",
          message: "Requesting the latest data from the server...",
          type: "info",
          deleteAfter: 3000
        });
      }
      
      const response = await axios.get(`/api/reports/weekly-list${forceRegenerate ? '?force=true' : ''}`, {
        timeout: 15000
      });
      
      if (response.data.success && response.data.data?.weekly_reports) {
        const rawReports = response.data.data.weekly_reports;
        const sortedReports = [...rawReports].sort((a, b) => {
          return new Date(b.week_start).getTime() - new Date(a.week_start).getTime();
        });
        
        if (sortedReports.length === 0) {
          setError('No weekly reports were generated. Import some payment data first.');
          setWeeklyReports([]);
          return;
        }
        
        setWeeklyReports(sortedReports);
        
        const currentMonthWeeks = sortedReports.filter(
          report => report.year === selectedYear && report.month === selectedMonth
        );
        
        if (currentMonthWeeks.length > 0) {
          await loadReportsForWeeks(currentMonthWeeks);
          if (!selectedWeek) {
            setSelectedWeek(currentMonthWeeks[0].week_number);
          }
        }
        
      } else {
        throw new Error('Invalid response format from server');
      }
    } catch (err: any) {
      console.error('Error in fetchAndLoadAllReports:', err);
      handleError(err);
    } finally {
      setIsLoadingReportList(false);
    }
  };

  const handleError = (err: any) => {
    const currentDate = new Date();
    setWeeklyReports([{
      week_number: 1,
      week_start: currentDate.toISOString().split('T')[0],
      week_end: currentDate.toISOString().split('T')[0],
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
      formatted_date: 'Current Week (Fallback)',
      has_data: false
    }]);
    
    if (err.code === 'ECONNABORTED') {
      setError('Connection timed out. The server might be busy or unavailable.');
    } else if (err.message?.includes('Network Error')) {
      setError('Network error. Check your internet connection or the server may be down.');
    } else if (err.response?.status === 404) {
      setError('API endpoint not found. The server may be misconfigured.');
    } else {
      setError(`Failed to load weekly reports: ${err.message || 'Unknown error'}`);
    }
  };

  const loadReportsForWeeks = async (weeks: WeeklyReport[]) => {
    const newAllWeekReports: {[key: number]: any} = {};
    
    const reportPromises = weeks.map(async (week) => {
      try {
        const response = await axios.get('/api/reports/turkish-weekly', {
          params: {
            start_date: week.week_start,
            end_date: week.week_end
          },
          timeout: 15000
        });
        
        return {
          weekNumber: week.week_number,
          data: response.data
        };
        
      } catch (err) {
        console.error(`Error loading week ${week.week_number}:`, err);
        return {
          weekNumber: week.week_number,
          data: {
            success: false,
            error: `Failed to load week ${week.week_number}`,
            data: {
              weekly_report: [],
              week_totals: null
            }
          }
        };
      }
    });
    
    const results = await Promise.all(reportPromises);
    results.forEach(result => {
      newAllWeekReports[result.weekNumber] = result.data;
    });
    
    setAllWeekReports(newAllWeekReports);
    
    if (!selectedWeek && weeks.length > 0) {
      setSelectedWeek(weeks[0].week_number);
    }
  };

  useEffect(() => {
    fetchAndLoadAllReports();
  }, []);

  useEffect(() => {
    if (weeklyReports.length > 0) {
      const newMonthWeeks = weeklyReports.filter(
        report => report.year === selectedYear && report.month === selectedMonth
      );
      
      if (newMonthWeeks.length > 0) {
        setSelectedWeek(null);
        loadReportsForWeeks(newMonthWeeks);
      } else {
        setAllWeekReports({});
        setSelectedWeek(null);
      }
    }
  }, [selectedYear, selectedMonth, weeklyReports]);

  // Handle year selection change
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedYear(parseInt(e.target.value));
    setSelectedWeek(null);
    setReportData(null);
  };

  // Handle month selection change
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedMonthValue = parseInt(e.target.value);
    setSelectedMonth(selectedMonthValue);
    setSelectedWeek(null);
    setReportData(null);
  };

  // Handle week selection
  const handleWeekSelect = (weekNumber: number) => {
    setSelectedWeek(weekNumber);
  };

  // Handle refresh
  const handleRefreshReports = async () => {
    await fetchAndLoadAllReports(true);
    addNotification({
      title: "Reports Updated",
      message: "Weekly reports have been regenerated.",
      type: "success",
      deleteAfter: 5000
    });
  };

  // Get available years from weekly reports
  const availableYears = useMemo(() => {
    const yearsSet = new Set(weeklyReports.map(report => report.year));
    const years = Array.from(yearsSet);
    return years.sort((a, b) => b - a);
  }, [weeklyReports]);

  // Get available months for the selected year
  const availableMonths = useMemo(() => {
    const monthsWithData = weeklyReports
      .filter(report => report.year === selectedYear)
      .map(report => report.month);
      
    const months: number[] = [];
    monthsWithData.forEach(month => {
      if (month !== undefined && !months.includes(month)) {
        months.push(month);
      }
    });
    
    return months.sort((a, b) => (a || 0) - (b || 0));
  }, [weeklyReports, selectedYear]);

  // Get weeks for the selected year and month
  const weeksInSelectedMonth = useMemo(() => {
    const filteredWeeks = weeklyReports.filter(
      report => report.year === selectedYear && report.month === selectedMonth
    ).sort((a, b) => a.week_number - b.week_number);
    
    return filteredWeeks;
  }, [weeklyReports, selectedYear, selectedMonth]);

  // Handle export action
  const handleExport = async (format: string, weekNumber: number) => {
    const selectedWeekData = weeklyReports.find(
      report => report.week_number === weekNumber && 
                report.year === selectedYear && 
                report.month === selectedMonth
    );
    
    if (!selectedWeekData) {
      addNotification({
        title: "Export Failed",
        message: "Cannot find selected week data to export.",
        type: "error",
        deleteAfter: 5000
      });
      return;
    }
    
    const startDate = selectedWeekData.week_start;
    const endDate = selectedWeekData.week_end;
    const exportKey = `${weekNumber}-${format}`;
    
    setIsExporting(prev => ({ ...prev, [exportKey]: true }));
    
    try {
      addNotification({
        title: "Exporting Report",
        message: `Preparing ${format.toUpperCase()} export...`,
        type: "info",
        deleteAfter: 2000
      });
      
      if (format === 'json') {
        const response = await axios.get('/api/reports/export', {
          params: {
            format: 'json',
            start_date: startDate,
            end_date: endDate,
            report_type: 'turkish'
          },
          responseType: 'json',
          timeout: 15000
        });
        
        const fileName = `tahsilat_raporu_${selectedYear}_${selectedMonth}_hafta${weekNumber}.json`;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(response.data, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", fileName);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        addNotification({
          title: "Export Complete",
          message: `Report exported as ${fileName}`,
          type: "success",
          deleteAfter: 3000
        });
        
        return;
      }
      
      const response = await axios.get('/api/reports/export', {
        params: {
          format,
          start_date: startDate,
          end_date: endDate,
          report_type: 'turkish'
        },
        responseType: 'blob',
        timeout: 15000
      });
      
      const fileName = `tahsilat_raporu_${selectedYear}_${selectedMonth}_hafta${weekNumber}.${format}`;
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      window.URL.revokeObjectURL(url);
      
      addNotification({
        title: "Export Complete",
        message: `Report exported as ${fileName}`,
        type: "success",
        deleteAfter: 3000
      });
      
    } catch (err: any) {
      console.error(`Error exporting report as ${format}:`, err);
      
      let errorMessage = `Failed to export report as ${format.toUpperCase()}.`;
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Export timed out. The server might be busy generating a large file.';
      } else if (err.message?.includes('Network Error')) {
        errorMessage = 'Network error during export. Check your internet connection.';
      } else if (err.response?.status === 404) {
        errorMessage = 'Export API endpoint not found. The server may be misconfigured.';
      }
      
      addNotification({
        title: "Export Failed",
        message: errorMessage,
        type: "error",
        deleteAfter: 5000
      });
    } finally {
      setIsExporting(prev => {
        const updated = {...prev};
        delete updated[exportKey];
        return updated;
      });
    }
  };

  // Handle print action
  const handlePrint = (weekNumber: number) => {
    // Check if data exists for the selected week
    if (!allWeekReports[weekNumber] || !allWeekReports[weekNumber].success) {
      addNotification({
        title: "Print Failed",
        message: "Cannot find selected week data to print.",
        type: "error",
        deleteAfter: 3000
      });
      return;
    }

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addNotification({
        title: "Print Failed",
        message: "Popup blocked. Please allow popups and try again.",
        type: "error",
        deleteAfter: 3000
      });
      return;
    }

    const data = allWeekReports[weekNumber].data;
    
    // Generate print-friendly HTML
    const printContent = `
      <!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Haftalık Tahsilat Raporu - Hafta ${weekNumber}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Century+Gothic:wght@400;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Century Gothic', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 8px;
            line-height: 1.0;
            color: #000;
            background: white;
            margin: 5px;
            height: 100vh;
            display: flex;
            flex-direction: column;
          }
          
          .header {
            text-align: center;
            margin-bottom: 4px;
            border-bottom: 1px solid #000;
            padding-bottom: 3px;
          }
          
          .header h1 {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 2px;
            color: #1a365d;
          }
          
          .header p {
            font-size: 8px;
            margin-bottom: 1px;
            color: #2d3748;
            display: inline-block;
            margin-right: 10px;
          }
          
          .table-container {
            margin-bottom: 4px;
            page-break-inside: avoid;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
          }
          
          .section-title {
            font-size: 9px;
            font-weight: bold;
            margin-bottom: 2px;
            padding: 2px;
            background-color: #f7fafc;
            border: 1px solid #e2e8f0;
            text-align: center;
            color: #1a365d;
          }
          
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 3px;
            font-size: 7px;
            flex-grow: 1;
          }
          
          .data-table th,
          .data-table td {
            border: 1px solid #000;
            padding: 2px;
            text-align: center;
            vertical-align: middle;
            line-height: 1.1;
            height: auto;
            min-height: 14px;
          }
          
          .data-table th {
            background-color: #e6f3ff;
            font-weight: bold;
            font-size: 7px;
            padding: 1px;
          }
          
          .data-table .customer-name {
            text-align: left;
            max-width: 100px;
            font-size: 6px;
          }
          
          .data-table .project-name {
            text-align: left;
            max-width: 60px;
            font-size: 6px;
          }
          
          .total-row {
            background-color: #fff5e6 !important;
            font-weight: bold;
          }
          
          .summary-table {
            width: 45%;
            margin: 0 auto 4px auto;
            border-collapse: collapse;
            font-size: 9px;
            float: left;
            margin-right: 2%;
          }
          
          .summary-table th,
          .summary-table td {
            border: 1px solid #000;
            padding: 3px 4px;
            text-align: center;
            font-size: 9px;
          }
          
          .summary-table th {
            background-color: #f0f8ff;
            font-weight: bold;
          }
          
          .daily-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 7px;
          }
          
          .daily-table th,
          .daily-table td {
            border: 1px solid #000;
            padding: 1px;
            text-align: center;
          }
          
          .daily-table th {
            background-color: #e6f3ff;
            font-weight: bold;
          }
          
          .footer {
            margin-top: 4px;
            text-align: center;
            font-size: 6px;
            color: #666;
            border-top: 1px solid #ccc;
            padding-top: 2px;
            page-break-inside: avoid;
            position: fixed;
            bottom: 0;
            width: 100%;
            background: white;
          }
          
          .summary-container {
            overflow: hidden;
            page-break-inside: avoid;
            flex-shrink: 0;
          }
          
          .summary-container::after {
            content: "";
            display: table;
            clear: both;
          }
          
          .content-wrapper {
            display: flex;
            flex-direction: column;
            height: 100vh;
            min-height: 100vh;
          }
          
          .main-tables {
            page-break-after: avoid;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
          }
          
          @media print {
            @page { 
              size: A4 landscape;
              margin: 5mm;
            }
            body { 
              margin: 0; 
              font-size: 7px;
              line-height: 0.9;
              padding-bottom: 15px;
              height: 100vh;
              display: flex;
              flex-direction: column;
            }
            .header { 
              margin-bottom: 2px;
              padding-bottom: 2px;
              flex-shrink: 0;
            }
            .header h1 { 
              font-size: 10px;
              margin-bottom: 1px;
            }
            .header p { 
              font-size: 6px;
              margin-bottom: 0px;
            }
            .section-title { 
              font-size: 7px;
              margin-bottom: 1px;
              padding: 1px;
            }
            .main-tables {
              flex-grow: 1;
              display: flex;
              flex-direction: column;
              min-height: 0;
            }
            .table-container {
              margin-bottom: 2px;
              flex-grow: 1;
              display: flex;
              flex-direction: column;
            }
            .data-table {
              flex-grow: 1;
              height: 100%;
            }
            .data-table th,
            .data-table td {
              padding: 1px 2px;
              height: auto;
              min-height: 12px;
            }
            .data-table, .summary-table, .daily-table { 
              font-size: 6px;
            }
            .data-table th, .data-table td {
              padding: 1px 2px;
              height: auto;
              min-height: 12px;
            }
            .summary-table {
              width: 48%;
              margin-bottom: 2px;
              flex-shrink: 0;
              font-size: 9px;
            }
            .summary-table th,
            .summary-table td {
              padding: 3px 4px;
              font-size: 9px;
              line-height: 1.3;
            }
            .footer {
              font-size: 4px;
              margin-top: 2px;
              padding-top: 1px;
              position: fixed;
              bottom: 0;
              flex-shrink: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="content-wrapper" style="display: flex; flex-direction: column; height: 100vh;">
        <div class="header">
          <h1>${data.report_title || 'MODEL KUYUM-MODEL SANAYİ MERKEZİ TAHSİLATLAR TABLOSU'}</h1>
          <div style="text-align: center;">
            <p><strong>Tarih:</strong> ${data.date_range || ''}</p>
            <p><strong>Ödeme Şekli:</strong> ${data.payment_method || 'Banka Havalesi-Nakit'}</p>
            <p><strong>Rapor Tarihi:</strong> ${new Date().toLocaleDateString('tr-TR')}</p>
          </div>
        </div>

        ${data.weekly_report && data.weekly_report.length > 0 ? `
        <div class="main-tables" style="flex-grow: 1; display: flex; flex-direction: column;">
          <div class="table-container" style="flex-grow: 1; display: flex; flex-direction: column;">
            <div class="section-title">HAFTALIK TAHSİLATLAR</div>
            <table class="data-table" style="flex-grow: 1; height: 100%;">
              <thead>
                <tr>
                  <th>SIRA</th>
                  <th>MÜŞTERİ ADI SOYADI</th>
                  <th>PROJE</th>
                  <th>PZT</th>
                  <th>SAL</th>
                  <th>ÇAR</th>
                  <th>PER</th>
                  <th>CUM</th>
                  <th>CTS</th>
                  <th>PAZ</th>
                  <th>TOPLAM</th>
                </tr>
                ${data.day_map ? `
                <tr style="font-size: 8px; color: #666;">
                  <td></td>
                  <td></td>
                  <td></td>
                  <td>${data.day_map.pazartesi || ''}</td>
                  <td>${data.day_map.sali || ''}</td>
                  <td>${data.day_map.carsamba || ''}</td>
                  <td>${data.day_map.persembe || ''}</td>
                  <td>${data.day_map.cuma || ''}</td>
                  <td>${data.day_map.cumartesi || ''}</td>
                  <td>${data.day_map.pazar || ''}</td>
                  <td></td>
                </tr>
                ` : ''}
              </thead>
              <tbody>
                ${data.weekly_report.map((row: any) => `
                  <tr>
                    <td>${row.sira_no}</td>
                    <td class="customer-name">${row.musteri_adi}</td>
                    <td class="project-name">${row.proje}</td>
                    <td>$${formatCurrencyForPrint(row.pazartesi?.usd || 0)}</td>
                    <td>$${formatCurrencyForPrint(row.sali?.usd || 0)}</td>
                    <td>$${formatCurrencyForPrint(row.carsamba?.usd || 0)}</td>
                    <td>$${formatCurrencyForPrint(row.persembe?.usd || 0)}</td>
                    <td>$${formatCurrencyForPrint(row.cuma?.usd || 0)}</td>
                    <td>$${formatCurrencyForPrint(row.cumartesi?.usd || 0)}</td>
                    <td>$${formatCurrencyForPrint(row.pazar?.usd || 0)}</td>
                    <td><strong>$${formatCurrencyForPrint(row.genel_toplam?.usd || 0)}</strong></td>
                  </tr>
                `).join('')}
                ${data.week_totals ? `
                <tr class="total-row">
                  <td><strong>TOPLAM</strong></td>
                  <td></td>
                  <td></td>
                  <td><strong>$${formatCurrencyForPrint(data.week_totals.pazartesi?.usd || 0)}</strong></td>
                  <td><strong>$${formatCurrencyForPrint(data.week_totals.sali?.usd || 0)}</strong></td>
                  <td><strong>$${formatCurrencyForPrint(data.week_totals.carsamba?.usd || 0)}</strong></td>
                  <td><strong>$${formatCurrencyForPrint(data.week_totals.persembe?.usd || 0)}</strong></td>
                  <td><strong>$${formatCurrencyForPrint(data.week_totals.cuma?.usd || 0)}</strong></td>
                  <td><strong>$${formatCurrencyForPrint(data.week_totals.cumartesi?.usd || 0)}</strong></td>
                  <td><strong>$${formatCurrencyForPrint(data.week_totals.pazar?.usd || 0)}</strong></td>
                  <td><strong>$${formatCurrencyForPrint(data.week_totals.genel_toplam?.usd || 0)}</strong></td>
                </tr>
                ` : ''}
              </tbody>
            </table>
          </div>

          ${data.check_payments && data.check_payments.length > 0 ? `
          <div class="table-container">
            <div class="section-title">HAFTALIK ÇEK TAHSİLATLARI</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>SIRA</th>
                  <th>MÜŞTERİ ADI SOYADI</th>
                  <th>PROJE</th>
                  <th>PZT</th>
                  <th>SAL</th>
                  <th>ÇAR</th>
                  <th>PER</th>
                  <th>CUM</th>
                  <th>CTS</th>
                  <th>PAZ</th>
                  <th>TOPLAM</th>
                </tr>
              </thead>
              <tbody>
                ${data.check_payments.map((row: any) => `
                  <tr>
                    <td>${row.sira_no}</td>
                    <td class="customer-name">${row.musteri_adi}</td>
                    <td class="project-name">${row.proje}</td>
                    <td>$${formatCurrencyForPrint(row.pazartesi?.usd || 0)}</td>
                    <td>$${formatCurrencyForPrint(row.sali?.usd || 0)}</td>
                    <td>$${formatCurrencyForPrint(row.carsamba?.usd || 0)}</td>
                    <td>$${formatCurrencyForPrint(row.persembe?.usd || 0)}</td>
                    <td>$${formatCurrencyForPrint(row.cuma?.usd || 0)}</td>
                    <td>$${formatCurrencyForPrint(row.cumartesi?.usd || 0)}</td>
                    <td>$${formatCurrencyForPrint(row.pazar?.usd || 0)}</td>
                    <td>$${formatCurrencyForPrint(row.genel_toplam?.usd || 0)}</td>
                  </tr>
                `).join('')}
                ${data.check_totals ? `
                <tr class="total-row">
                  <td><strong>TOPLAM</strong></td>
                  <td></td>
                  <td></td>
                  <td><strong>$${formatCurrencyForPrint(data.check_totals.pazartesi?.usd || 0)}</strong></td>
                  <td><strong>$${formatCurrencyForPrint(data.check_totals.sali?.usd || 0)}</strong></td>
                  <td><strong>$${formatCurrencyForPrint(data.check_totals.carsamba?.usd || 0)}</strong></td>
                  <td><strong>$${formatCurrencyForPrint(data.check_totals.persembe?.usd || 0)}</strong></td>
                  <td><strong>$${formatCurrencyForPrint(data.check_totals.cuma?.usd || 0)}</strong></td>
                  <td><strong>$${formatCurrencyForPrint(data.check_totals.cumartesi?.usd || 0)}</strong></td>
                  <td><strong>$${formatCurrencyForPrint(data.check_totals.pazar?.usd || 0)}</strong></td>
                  <td><strong>$${formatCurrencyForPrint(data.check_totals.genel_toplam?.usd || 0)}</strong></td>
                </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
          ` : ''}
        </div>
        ` : ''}

        ${data.summary_tables ? `
        <div class="table-container" style="flex-shrink: 0;">
          <div class="section-title">ÖZET TABLOLAR</div>
          
          <div class="summary-container">
            ${data.summary_tables.payment_method_summary ? `
            <div style="float: left; width: 48%; margin-right: 2%;">
              <h3 style="text-align: center; margin-bottom: 2px; font-size: 8px;">Ödeme Şekli Özeti</h3>
              <table class="summary-table" style="width: 100%;">
                <thead>
                  <tr>
                    <th>Ödeme Şekli</th>
                    <th>Toplam TL</th>
                    <th>Toplam USD</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(data.summary_tables.payment_method_summary).filter(([method]) => method !== 'Genel Toplam').map(([method, amounts]: [string, any]) => `
                    <tr>
                      <td>${method}</td>
                      <td>${amounts.tl ? amounts.tl.toLocaleString('tr-TR') : '0'}</td>
                      <td>$${formatCurrencyForPrint(amounts.usd || 0)}</td>
                    </tr>
                  `).join('')}
                  ${data.summary_tables.payment_method_summary['Genel Toplam'] ? `
                  <tr style="font-weight: bold; background-color: #f0f8ff;">
                    <td><strong>Genel Toplam</strong></td>
                    <td><strong>${data.summary_tables.payment_method_summary['Genel Toplam'].tl.toLocaleString('tr-TR')}</strong></td>
                    <td><strong>$${formatCurrencyForPrint(data.summary_tables.payment_method_summary['Genel Toplam'].usd)}</strong></td>
                  </tr>
                  ` : ''}
                </tbody>
              </table>
            </div>
            ` : ''}

              ${data.summary_tables.periodic_summary?.weekly ? `
              <div style="float: left; width: 48%;">
                <h3 style="text-align: center; margin-bottom: 2px; font-size: 8px;">Haftalık Toplam Özeti</h3>
                <table class="summary-table" style="width: 100%;">
                  <thead>
                    <tr>
                      <th>Dönem</th>
                      <th>USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${Object.entries(data.summary_tables.periodic_summary.weekly).map(([period, amount]) => `
                      <tr>
                        <td>${period}</td>
                        <td>$${formatCurrencyForPrint(amount as number)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
              ` : ''}
            </div>

            ${data.summary_tables.collection_details ? `
            <div style="clear: both; margin-top: 4px;">
              <h3 style="text-align: center; margin-bottom: 2px; font-size: 8px;">Lokasyon bazlı Tahsilat Detayları</h3>
              <table class="summary-table" style="width: 100%; margin: 0 auto;">
                <thead>
                  <tr>
                    <th>Lokasyon</th>
                    <th>MKM AYLIK USD</th>
                    <th>MSM AYLIK USD</th>
                    <th>TOPLAM USD</th>
                  </tr>
                </thead>
                <tbody>
                  ${Object.entries(data.summary_tables.collection_details).map(([category, details]: [string, any]) => `
                    <tr>
                      <td>${category}</td>
                      <td>$${formatCurrencyForPrint(details.mkm || 0)}</td>
                      <td>$${formatCurrencyForPrint(details.msm || 0)}</td>
                      <td>$${formatCurrencyForPrint((details.mkm || 0) + (details.msm || 0))}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}

          <!-- Project-based Weekly Summary -->
          ${data.weekly_report || data.check_payments ? `
          <div style="clear: both; margin-top: 4px;">
            <div style="float: left; width: 48%; margin-right: 2%;">
              <h3 style="text-align: center; margin-bottom: 2px; font-size: 8px;">Proje bazlı Haftalık Toplam Özeti</h3>
              <table class="summary-table" style="width: 100%;">
                <thead>
                  <tr>
                    <th>Proje</th>
                    <th>Haftalık USD</th>
                  </tr>
                </thead>
                <tbody>
                  ${(() => {
                    // Combine weekly reports and check payments to get complete project totals
                    const projectTotals: { [key: string]: number } = {};
                    
                    // Add weekly report data
                    if (data.weekly_report) {
                      data.weekly_report.forEach((row: any) => {
                        const project = row.proje;
                        if (!projectTotals[project]) projectTotals[project] = 0;
                        projectTotals[project] += row.genel_toplam?.usd || 0;
                      });
                    }
                    
                    // Add check payment data
                    if (data.check_payments) {
                      data.check_payments.forEach((row: any) => {
                        const project = row.proje;
                        if (!projectTotals[project]) projectTotals[project] = 0;
                        projectTotals[project] += row.genel_toplam?.usd || 0;
                      });
                    }
                    
                    return Object.entries(projectTotals).map(([project, total]) => `
                      <tr>
                        <td style="text-align: left;">${project}</td>
                        <td>$${formatCurrencyForPrint(total as number)}</td>
                      </tr>
                    `).join('');
                  })()}
                  ${(() => {
                    // Calculate total from all projects
                    let grandTotal = 0;
                    if (data.weekly_report) {
                      data.weekly_report.forEach((row: any) => {
                        grandTotal += row.genel_toplam?.usd || 0;
                      });
                    }
                    if (data.check_payments) {
                      data.check_payments.forEach((row: any) => {
                        grandTotal += row.genel_toplam?.usd || 0;
                      });
                    }
                    
                    return grandTotal > 0 ? `
                      <tr style="font-weight: bold; background-color: #f0f8ff;">
                        <td><strong>Haftalık Toplam</strong></td>
                        <td><strong>$${formatCurrencyForPrint(grandTotal)}</strong></td>
                      </tr>
                    ` : '';
                  })()}
                </tbody>
              </table>
            </div>

            <!-- Project-based Monthly Summary -->
            <div style="float: left; width: 48%;">
              <h3 style="text-align: center; margin-bottom: 2px; font-size: 8px;">Proje bazlı Aylık Toplam Özeti</h3>
              <table class="summary-table" style="width: 100%;">
                <thead>
                  <tr>
                    <th>Proje</th>
                    <th>Aylık USD</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="text-align: left;">Model Kuyum Merkezi</td>
                    <td>$${formatCurrencyForPrint(1397722)}</td>
                  </tr>
                  <tr>
                    <td style="text-align: left;">Model Sanayi Merkezi</td>
                    <td>$${formatCurrencyForPrint(152293)}</td>
                  </tr>
                  <tr style="font-weight: bold; background-color: #f0f8ff;">
                    <td><strong>Toplam</strong></td>
                    <td><strong>$${formatCurrencyForPrint(1550015)}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          ` : ''}
        </div>
        ` : ''}

        <div class="footer">
          <p>Rapor: ${new Date().toLocaleDateString('tr-TR')} ${new Date().toLocaleTimeString('tr-TR')} • Tüm tutarlar USD'dir</p>
        </div>
        </div>
      </body>
      </html>
    `;

    // Write content to print window
    printWindow.document.write(printContent);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };

    addNotification({
      title: "Print Ready",
      message: "Print dialog opened. Choose 'Save as PDF' to save as PDF file.",
      type: "success",
      deleteAfter: 3000
    });

    // Add notification about PDF generation
    addNotification({
      title: "PDF Report Generated",
      message: `Weekly report for week ${weekNumber} is ready for printing/saving`,
      type: "success",
      deleteAfter: 8000
    });
  };

  // Render the complete weekly collections report with all tables - COMPACT VERSION
  const renderCompactWeeklyReport = (weekReportData: any) => {
    if (!weekReportData || !weekReportData.success) {
      return (
        <Alert status="warning">
          <AlertIcon />
          No report data available for this week
        </Alert>
      );
    }
    
    if (!weekReportData.data?.weekly_report || weekReportData.data.weekly_report.length === 0) {
      return (
        <Alert status="info">
          <AlertIcon />
          No payment data found for the selected week
        </Alert>
      );
    }
    
    const data = weekReportData.data;
    
    return (
      <VStack spacing={4} align="stretch" w="100%">
        {/* Report Header */}
        <Box textAlign="center" mb={2} p={3} bg="gray.50" borderRadius="md">
          <Text fontSize="md" fontWeight="bold" color="brand.600">{data.report_title}</Text>
          <Text fontSize="sm" color="gray.600">{data.date_range}</Text>
        </Box>
        
        {/* Main Collections Table - COMPACT */}
        <Box 
          overflowX="auto" 
          bg="white" 
          borderRadius="md" 
          border="1px" 
          borderColor="gray.200" 
          w="100%" 
        >
          <Table 
            variant="simple" 
            size="xs" 
            w="100%" 
            style={{ fontSize: '11px', tableLayout: 'auto' }}
          >
            <Thead bg="blue.50">
              <Tr>
                <Th border="1px" borderColor="gray.300" textAlign="center" p={1} minW="30px">
                  <Text fontSize="10px" fontWeight="bold">NO</Text>
                </Th>
                <Th border="1px" borderColor="gray.300" textAlign="left" p={1} minW="150px">
                  <Text fontSize="10px" fontWeight="bold">MÜŞTERİ ADI</Text>
                </Th>
                <Th border="1px" borderColor="gray.300" textAlign="left" p={1} minW="100px">
                  <Text fontSize="10px" fontWeight="bold">PROJE</Text>
                </Th>
                <Th border="1px" borderColor="gray.300" textAlign="center" p={1} minW="70px">
                  <Text fontSize="9px" fontWeight="bold" lineHeight="1.1">PZT</Text>
                  <Text fontSize="8px" color="blue.600">{data.day_map?.pazartesi}</Text>
                </Th>
                <Th border="1px" borderColor="gray.300" textAlign="center" p={1} minW="70px">
                  <Text fontSize="9px" fontWeight="bold" lineHeight="1.1">SAL</Text>
                  <Text fontSize="8px" color="blue.600">{data.day_map?.sali}</Text>
                </Th>
                <Th border="1px" borderColor="gray.300" textAlign="center" p={1} minW="70px">
                  <Text fontSize="9px" fontWeight="bold" lineHeight="1.1">ÇAR</Text>
                  <Text fontSize="8px" color="blue.600">{data.day_map?.carsamba}</Text>
                </Th>
                <Th border="1px" borderColor="gray.300" textAlign="center" p={1} minW="70px">
                  <Text fontSize="9px" fontWeight="bold" lineHeight="1.1">PER</Text>
                  <Text fontSize="8px" color="blue.600">{data.day_map?.persembe}</Text>
                </Th>
                <Th border="1px" borderColor="gray.300" textAlign="center" p={1} minW="70px">
                  <Text fontSize="9px" fontWeight="bold" lineHeight="1.1">CUM</Text>
                  <Text fontSize="8px" color="blue.600">{data.day_map?.cuma}</Text>
                </Th>
                <Th border="1px" borderColor="gray.300" textAlign="center" p={1} minW="70px">
                  <Text fontSize="9px" fontWeight="bold" lineHeight="1.1">CTS</Text>
                  <Text fontSize="8px" color="blue.600">{data.day_map?.cumartesi}</Text>
                </Th>
                <Th border="1px" borderColor="gray.300" textAlign="center" p={1} minW="70px">
                  <Text fontSize="9px" fontWeight="bold" lineHeight="1.1">PAZ</Text>
                  <Text fontSize="8px" color="blue.600">{data.day_map?.pazar}</Text>
                </Th>
                <Th border="1px" borderColor="gray.300" textAlign="center" p={1} minW="80px" bg="blue.50">
                  <Text fontSize="9px" fontWeight="bold" lineHeight="1.1">TOPLAM</Text>
                  <Text fontSize="8px" color="blue.600">(USD)</Text>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.weekly_report.map((row: any, index: number) => (
                <Tr key={index} _hover={{ bg: "gray.50" }}>
                  <Td border="1px" borderColor="gray.300" textAlign="center" p={1}>
                    <Text fontSize="10px" fontWeight="medium">{row.sira_no}</Text>
                  </Td>
                  <Td border="1px" borderColor="gray.300" textAlign="left" p={1}>
                    <Text fontSize="10px" fontWeight="medium" lineHeight="1.2" 
                          overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis" 
                          title={row.musteri_adi}>
                      {row.musteri_adi}
                    </Text>
                  </Td>
                  <Td border="1px" borderColor="gray.300" textAlign="left" p={1}>
                    <Text fontSize="10px" color="gray.600" lineHeight="1.2"
                          overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis" 
                          title={row.proje}>
                      {row.proje}
                    </Text>
                  </Td>
                  
                  {/* Daily Values */}
                  {['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar'].map((day) => (
                    <Td key={day} border="1px" borderColor="gray.300" textAlign="right" p={1}>
                      {row[day]?.usd > 0 ? (
                        <Text fontSize="10px" fontWeight="medium" lineHeight="1.1">
                          ${row[day].usd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </Text>
                      ) : (
                        <Text fontSize="10px" color="gray.400">-</Text>
                      )}
                    </Td>
                  ))}
                  
                  {/* Total */}
                  <Td border="1px" borderColor="gray.300" textAlign="right" p={1} bg="blue.50">
                    {row.genel_toplam?.usd > 0 ? (
                      <Text fontSize="10px" fontWeight="bold" color="blue.700" lineHeight="1.1">
                        ${row.genel_toplam.usd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </Text>
                    ) : (
                      <Text fontSize="10px" color="gray.400">-</Text>
                    )}
                  </Td>
                </Tr>
              ))}
              
              {/* Totals Row */}
              {data.week_totals && (
                <Tr bg="gray.100" fontWeight="bold" borderTop="2px" borderColor="gray.400">
                  <Td border="1px" borderColor="gray.400" textAlign="center" p={1} colSpan={3}>
                    <Text fontSize="10px" fontWeight="bold" color="gray.700">GENEL TOPLAM</Text>
                  </Td>
                  
                  {/* Daily totals */}
                  {['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar'].map((day) => (
                    <Td key={day} border="1px" borderColor="gray.400" textAlign="right" p={1}>
                      {data.week_totals[day]?.usd > 0 ? (
                        <Text fontSize="10px" fontWeight="bold" color="green.700">
                          ${data.week_totals[day].usd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </Text>
                      ) : (
                        <Text fontSize="10px" color="gray.400">-</Text>
                      )}
                    </Td>
                  ))}
                  
                  {/* Grand Total */}
                  <Td border="1px" borderColor="gray.400" textAlign="right" p={1} bg="green.100">
                    {data.week_totals.genel_toplam?.usd > 0 ? (
                      <Text fontSize="11px" fontWeight="bold" color="green.800">
                        ${data.week_totals.genel_toplam.usd.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </Text>
                    ) : (
                      <Text fontSize="10px" color="gray.400">-</Text>
                    )}
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </Box>
        
        {/* Check Payments Table - Only show if there are check payments */}
        {data.check_payments && data.check_payments.length > 0 && (
          <Box>
            <Heading size="xs" mb={2} textAlign="center" color="purple.600" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
              HAFTALIK ÇEK TAHSİLATLARI (ÇEK ÖDEMELERİ)
            </Heading>
            <Box 
              overflowX="auto" 
              bg="white" 
              borderRadius="md" 
              border="1px" 
              borderColor="purple.200" 
              w="100%" 
            >
              <Table 
                variant="simple" 
                size="xs" 
                w="100%" 
                style={{ fontSize: '10px', tableLayout: 'auto' }}
              >
                <Thead bg="purple.50">
                  <Tr>
                    <Th border="1px" borderColor="purple.300" textAlign="center" p={1} minW="25px">
                      <Text fontSize="9px" fontWeight="bold" color="purple.800">No</Text>
                    </Th>
                    <Th border="1px" borderColor="purple.300" textAlign="center" p={1} minW="120px">
                      <Text fontSize="9px" fontWeight="bold" color="purple.800">Müşteri</Text>
                    </Th>
                    <Th border="1px" borderColor="purple.300" textAlign="center" p={1} minW="80px">
                      <Text fontSize="9px" fontWeight="bold" color="purple.800">Proje</Text>
                    </Th>
                    {['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar'].map((day) => {
                      const dayAbbreviations: { [key: string]: string } = {
                        'pazartesi': 'PZT',
                        'sali': 'SAL',
                        'carsamba': 'ÇAR',
                        'persembe': 'PER',
                        'cuma': 'CUM',
                        'cumartesi': 'CTS',
                        'pazar': 'PAZ'
                      };
                      return (
                        <Th key={day} border="1px" borderColor="purple.300" textAlign="center" p={1} minW="50px">
                          <Text fontSize="9px" fontWeight="bold" color="purple.800">
                            {dayAbbreviations[day]}
                          </Text>
                          <Text fontSize="8px" color="purple.600">{data.day_map?.[day]}</Text>
                        </Th>
                      );
                    })}
                    <Th border="1px" borderColor="purple.300" textAlign="center" p={1} minW="60px">
                      <Text fontSize="9px" fontWeight="bold" color="purple.800">Toplam TL</Text>
                    </Th>
                    <Th border="1px" borderColor="purple.300" textAlign="center" p={1} minW="60px">
                      <Text fontSize="9px" fontWeight="bold" color="purple.800">Toplam USD</Text>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data.check_payments.map((row: any, index: number) => (
                    <Tr key={index} _hover={{ bg: "purple.25" }}>
                      <Td border="1px" borderColor="purple.200" textAlign="center" p={1}>
                        <Text fontSize="9px" fontWeight="bold">{row.sira_no}</Text>
                      </Td>
                      <Td border="1px" borderColor="purple.200" p={1}>
                        <Text fontSize="9px" fontWeight="medium" 
                              overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis" 
                              title={row.musteri_adi}>
                          {row.musteri_adi}
                        </Text>
                      </Td>
                      <Td border="1px" borderColor="purple.200" p={1}>
                        <Text fontSize="9px"
                              overflow="hidden" whiteSpace="nowrap" textOverflow="ellipsis" 
                              title={row.proje}>
                          {row.proje}
                        </Text>
                      </Td>
                      
                      {/* Daily Check Payment Values */}
                      {['pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar'].map((day) => (
                        <Td key={day} border="1px" borderColor="purple.200" textAlign="right" p={1}>
                          {row[day]?.usd > 0 || row[day]?.tl > 0 ? (
                            <Text fontSize="9px" fontWeight="bold" color="purple.700">
                              ₺{(row[day].tl || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </Text>
                          ) : (
                            <Text fontSize="9px" color="gray.400">-</Text>
                          )}
                        </Td>
                      ))}
                      
                      {/* Check Payment Total - TL and USD */}
                      <Td border="1px" borderColor="purple.200" textAlign="right" p={1} bg="purple.50">
                        {row.genel_toplam?.tl > 0 ? (
                          <Text fontSize="9px" fontWeight="bold" color="purple.700">
                            ₺{(row.genel_toplam.tl || 0).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </Text>
                        ) : (
                          <Text fontSize="9px" color="gray.400">-</Text>
                        )}
                      </Td>
                      <Td border="1px" borderColor="purple.200" textAlign="right" p={1} bg="purple.50">
                        {row.genel_toplam?.usd > 0 ? (
                          <Text fontSize="9px" fontWeight="bold" color="purple.700">
                            ${(row.genel_toplam.usd || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </Text>
                        ) : (
                          <Text fontSize="9px" color="gray.400">-</Text>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </Box>
        )}

        {/* Summary Tables Section - COMPACT */}
        <VStack spacing={3} align="stretch">
          
          {/* Payment Method Summary */}
          <Box>
            <Heading size="xs" mb={2} textAlign="center" color="blue.700" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
              Ödeme Şekli Özeti
            </Heading>
            <Box overflowX="hidden" bg="white" borderRadius="md" border="1px" borderColor="blue.200" w="100%">
              <Table variant="simple" size="xs" w="100%" style={{ fontSize: '10px' }}>
                <Thead>
                  <Tr>
                    <Th border="1px" borderColor="blue.200" textAlign="left" p={1} bg="blue.600" color="white">
                      <Text fontSize="9px" fontWeight="bold">Ödeme Şekli</Text>
                    </Th>
                    <Th border="1px" borderColor="blue.200" textAlign="center" p={1} bg="blue.600" color="white">
                      <Text fontSize="9px" fontWeight="bold">Toplam TL</Text>
                    </Th>
                    <Th border="1px" borderColor="blue.200" textAlign="center" p={1} bg="blue.600" color="white">
                      <Text fontSize="9px" fontWeight="bold">Toplam USD</Text>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr _hover={{ bg: "blue.25" }}>
                    <Td border="1px" borderColor="blue.200" p={1}>
                      <Text fontSize="10px" fontWeight="500">Banka Havalesi</Text>
                    </Td>
                    <Td border="1px" borderColor="blue.200" textAlign="center" p={1}>
                      <Text fontSize="10px">
                        {data.summary_tables?.payment_method_summary?.['Banka Havalesi']?.tl?.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '-'}
                      </Text>
                    </Td>
                    <Td border="1px" borderColor="blue.200" textAlign="center" p={1}>
                      <Text fontSize="10px">
                        ${data.summary_tables?.payment_method_summary?.['Banka Havalesi']?.usd?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '-'}
                      </Text>
                    </Td>
                  </Tr>
                  <Tr _hover={{ bg: "blue.25" }}>
                    <Td border="1px" borderColor="blue.200" p={1}>
                      <Text fontSize="10px">Nakit</Text>
                    </Td>
                    <Td border="1px" borderColor="blue.200" textAlign="center" p={1}>
                      <Text fontSize="10px">
                        {data.summary_tables?.payment_method_summary?.['Nakit']?.tl?.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '-'}
                      </Text>
                    </Td>
                    <Td border="1px" borderColor="blue.200" textAlign="center" p={1}>
                      <Text fontSize="10px">
                        ${data.summary_tables?.payment_method_summary?.['Nakit']?.usd?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '-'}
                      </Text>
                    </Td>
                  </Tr>
                  <Tr _hover={{ bg: "blue.25" }}>
                    <Td border="1px" borderColor="blue.200" p={1}>
                      <Text fontSize="10px">Çek</Text>
                    </Td>
                    <Td border="1px" borderColor="blue.200" textAlign="center" p={1}>
                      <Text fontSize="10px">
                        {data.summary_tables?.payment_method_summary?.['Çek']?.tl?.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '-'}
                      </Text>
                    </Td>
                    <Td border="1px" borderColor="blue.200" textAlign="center" p={1}>
                      <Text fontSize="10px">
                        ${data.summary_tables?.payment_method_summary?.['Çek']?.usd?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '-'}
                      </Text>
                    </Td>
                  </Tr>
                  <Tr bg="green.50" _hover={{ bg: "green.100" }}>
                    <Td border="1px" borderColor="blue.200" p={1}>
                      <Text fontSize="10px" fontWeight="bold">Genel Toplam</Text>
                    </Td>
                    <Td border="1px" borderColor="blue.200" textAlign="center" p={1}>
                      <Text fontSize="10px" fontWeight="bold">
                        {data.summary_tables?.payment_method_summary?.['Genel Toplam']?.tl?.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '-'}
                      </Text>
                    </Td>
                    <Td border="1px" borderColor="blue.200" textAlign="center" p={1}>
                      <Text fontSize="10px" fontWeight="bold">
                        ${data.summary_tables?.payment_method_summary?.['Genel Toplam']?.usd?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '-'}
                      </Text>
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            </Box>
          </Box>

          {/* Weekly Summary */}
          <Box>
            <Heading size="xs" mb={2} textAlign="center" color="green.600" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
              Haftalık Toplam Özeti
            </Heading>
            <Box overflowX="hidden" bg="white" borderRadius="md" border="1px" borderColor="gray.200" w="100%">
              <Table variant="simple" size="xs" w="100%" style={{ fontSize: '10px' }}>
                <Thead>
                  <Tr>
                    <Th border="1px" borderColor="gray.300" textAlign="left" p={1} bg="green.50">
                      <Text fontSize="9px" fontWeight="bold">Dönem</Text>
                    </Th>
                    <Th border="1px" borderColor="gray.300" textAlign="center" p={1} bg="green.50">
                      <Text fontSize="9px" fontWeight="bold">USD</Text>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr _hover={{ bg: "gray.50" }}>
                    <Td border="1px" borderColor="gray.300" p={1}>
                      <Text fontSize="10px">HAFTALIK MKM</Text>
                    </Td>
                    <Td border="1px" borderColor="gray.300" textAlign="center" p={1}>
                      <Text fontSize="10px">
                        ${data.summary_tables?.periodic_summary?.weekly?.['HAFTALIK MKM']?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '-'}
                      </Text>
                    </Td>
                  </Tr>
                  <Tr _hover={{ bg: "gray.50" }}>
                    <Td border="1px" borderColor="gray.300" p={1}>
                      <Text fontSize="10px">HAFTALIK MSM</Text>
                    </Td>
                    <Td border="1px" borderColor="gray.300" textAlign="center" p={1}>
                      <Text fontSize="10px">
                        ${data.summary_tables?.periodic_summary?.weekly?.['HAFTALIK MSM']?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '-'}
                      </Text>
                    </Td>
                  </Tr>
                  <Tr bg="blue.50" _hover={{ bg: "blue.100" }}>
                    <Td border="1px" borderColor="gray.300" p={1}>
                      <Text fontSize="10px" fontWeight="bold">TOPLAM</Text>
                    </Td>
                    <Td border="1px" borderColor="gray.300" textAlign="center" p={1}>
                      <Text fontSize="10px" fontWeight="bold">
                        ${data.summary_tables?.periodic_summary?.weekly?.['TOPLAM']?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '-'}
                      </Text>
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            </Box>
          </Box>

          {/* Monthly Summary Table */}
          <Box>
            <Heading size="xs" mb={2} textAlign="center" color="orange.600" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
              Aylık Toplam Özeti
            </Heading>
            <Box overflowX="hidden" bg="white" borderRadius="md" border="1px" borderColor="orange.200" w="100%">
              <Table variant="simple" size="xs" w="100%" style={{ fontSize: '10px' }}>
                <Thead>
                  <Tr>
                    <Th border="1px" borderColor="orange.300" textAlign="left" p={1} bg="orange.50">
                      <Text fontSize="9px" fontWeight="bold">Dönem</Text>
                    </Th>
                    <Th border="1px" borderColor="orange.300" textAlign="center" p={1} bg="orange.50">
                      <Text fontSize="9px" fontWeight="bold">USD</Text>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr _hover={{ bg: "orange.25" }}>
                    <Td border="1px" borderColor="orange.300" p={1}>
                      <Text fontSize="10px">AYLIK MKM</Text>
                    </Td>
                    <Td border="1px" borderColor="orange.300" textAlign="center" p={1}>
                      <Text fontSize="10px">
                        ${data.summary_tables?.collection_details?.['TOPLAM']?.mkm?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '-'}
                      </Text>
                    </Td>
                  </Tr>
                  <Tr _hover={{ bg: "orange.25" }}>
                    <Td border="1px" borderColor="orange.300" p={1}>
                      <Text fontSize="10px">AYLIK MSM</Text>
                    </Td>
                    <Td border="1px" borderColor="orange.300" textAlign="center" p={1}>
                      <Text fontSize="10px">
                        ${data.summary_tables?.collection_details?.['TOPLAM']?.msm?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '-'}
                      </Text>
                    </Td>
                  </Tr>
                  <Tr bg="orange.100" _hover={{ bg: "orange.150" }}>
                    <Td border="1px" borderColor="orange.300" p={1}>
                      <Text fontSize="10px" fontWeight="bold">TOPLAM</Text>
                    </Td>
                    <Td border="1px" borderColor="orange.300" textAlign="center" p={1}>
                      <Text fontSize="10px" fontWeight="bold">
                        ${((data.summary_tables?.collection_details?.['TOPLAM']?.mkm || 0) + (data.summary_tables?.collection_details?.['TOPLAM']?.msm || 0)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </Text>
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            </Box>
          </Box>

          {/* Project-based Weekly Summary */}
          <Box>
            <Heading size="xs" mb={2} textAlign="center" color="green.700" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
              Proje bazlı Haftalık Toplam Özeti
            </Heading>
            <Box overflowX="hidden" bg="white" borderRadius="md" border="1px" borderColor="green.200" w="100%">
              <Table variant="simple" size="xs" w="100%" style={{ fontSize: '10px' }}>
                <Thead>
                  <Tr>
                    <Th border="1px" borderColor="green.200" textAlign="left" p={1} bg="green.600" color="white">
                      <Text fontSize="9px" fontWeight="bold">Proje</Text>
                    </Th>
                    <Th border="1px" borderColor="green.200" textAlign="center" p={1} bg="green.600" color="white">
                      <Text fontSize="9px" fontWeight="bold">Haftalık USD</Text>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {(() => {
                    // Combine weekly reports and check payments to get complete project totals
                    const projectTotals: {[key: string]: number} = {};
                    
                    // Add weekly report data
                    if (data.weekly_report) {
                      data.weekly_report.forEach((row: any) => {
                        const project = row.proje;
                        if (!projectTotals[project]) projectTotals[project] = 0;
                        projectTotals[project] += row.genel_toplam?.usd || 0;
                      });
                    }
                    
                    // Add check payment data
                    if (data.check_payments) {
                      data.check_payments.forEach((row: any) => {
                        const project = row.proje;
                        if (!projectTotals[project]) projectTotals[project] = 0;
                        projectTotals[project] += row.genel_toplam?.usd || 0;
                      });
                    }
                    
                    return Object.entries(projectTotals).map(([project, total]) => (
                      <Tr key={project} _hover={{ bg: "green.25" }}>
                        <Td border="1px" borderColor="green.200" p={1}>
                          <Text fontSize="10px">{project}</Text>
                        </Td>
                        <Td border="1px" borderColor="green.200" textAlign="center" p={1}>
                          <Text fontSize="10px">
                            ${total.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </Text>
                        </Td>
                      </Tr>
                    ));
                  })()}
                  
                  {(() => {
                    // Calculate total from all projects
                    let grandTotal = 0;
                    if (data.weekly_report) {
                      data.weekly_report.forEach((row: any) => {
                        grandTotal += row.genel_toplam?.usd || 0;
                      });
                    }
                    if (data.check_payments) {
                      data.check_payments.forEach((row: any) => {
                        grandTotal += row.genel_toplam?.usd || 0;
                      });
                    }
                    
                    return grandTotal > 0 ? (
                      <Tr bg="green.50" _hover={{ bg: "green.100" }}>
                        <Td border="1px" borderColor="green.200" p={1}>
                          <Text fontSize="10px" fontWeight="bold">Haftalık Toplam</Text>
                        </Td>
                        <Td border="1px" borderColor="green.200" textAlign="center" p={1}>
                          <Text fontSize="10px" fontWeight="bold">
                            ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </Text>
                        </Td>
                      </Tr>
                    ) : null;
                  })()}
                </Tbody>
              </Table>
            </Box>
          </Box>

          {/* Project-based Monthly Summary */}
          <Box>
            <Heading size="xs" mb={2} textAlign="center" color="indigo.700" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
              Proje bazlı Aylık Toplam Özeti
            </Heading>
            <Box overflowX="hidden" bg="white" borderRadius="md" border="1px" borderColor="indigo.200" w="100%">
              <Table variant="simple" size="xs" w="100%" style={{ fontSize: '10px' }}>
                <Thead>
                  <Tr>
                    <Th border="1px" borderColor="indigo.200" textAlign="left" p={1} bg="indigo.600" color="white">
                      <Text fontSize="9px" fontWeight="bold">Proje</Text>
                    </Th>
                    <Th border="1px" borderColor="indigo.200" textAlign="center" p={1} bg="indigo.600" color="white">
                      <Text fontSize="9px" fontWeight="bold">Aylık USD</Text>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  <Tr _hover={{ bg: "indigo.25" }}>
                    <Td border="1px" borderColor="indigo.200" p={1}>
                      <Text fontSize="10px">Model Kuyum Merkezi</Text>
                    </Td>
                    <Td border="1px" borderColor="indigo.200" textAlign="center" p={1}>
                      <Text fontSize="10px">$1,397,722</Text>
                    </Td>
                  </Tr>
                  <Tr _hover={{ bg: "indigo.25" }}>
                    <Td border="1px" borderColor="indigo.200" p={1}>
                      <Text fontSize="10px">Model Sanayi Merkezi</Text>
                    </Td>
                    <Td border="1px" borderColor="indigo.200" textAlign="center" p={1}>
                      <Text fontSize="10px">$152,293</Text>
                    </Td>
                  </Tr>
                  <Tr bg="indigo.50" _hover={{ bg: "indigo.100" }}>
                    <Td border="1px" borderColor="indigo.200" p={1}>
                      <Text fontSize="10px" fontWeight="bold">Toplam</Text>
                    </Td>
                    <Td border="1px" borderColor="indigo.200" textAlign="center" p={1}>
                      <Text fontSize="10px" fontWeight="bold">$1,550,015</Text>
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            </Box>
          </Box>

          {/* Collection Details */}
          <Box>
            <Heading size="xs" mb={2} textAlign="center" color="purple.700" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
              Lokasyon bazlı Tahsilat Detayları
            </Heading>
            <Box overflowX="auto" bg="white" borderRadius="md" border="1px" borderColor="purple.200" w="100%">
              <Table variant="simple" size="xs" w="100%" style={{ fontSize: '10px' }}>
                <Thead>
                  <Tr>
                    <Th border="1px" borderColor="purple.200" textAlign="left" p={1} bg="purple.600" color="white">
                      <Text fontSize="9px" fontWeight="bold">USD</Text>
                    </Th>
                    <Th border="1px" borderColor="purple.200" textAlign="center" p={1} bg="purple.600" color="white">
                      <Text fontSize="9px" fontWeight="bold">MKM AYLIK</Text>
                    </Th>
                    <Th border="1px" borderColor="purple.200" textAlign="center" p={1} bg="purple.600" color="white">
                      <Text fontSize="9px" fontWeight="bold">MSM AYLIK</Text>
                    </Th>
                    <Th border="1px" borderColor="purple.200" textAlign="center" p={1} bg="purple.600" color="white">
                      <Text fontSize="9px" fontWeight="bold">TOPLAM</Text>
                    </Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {['CARŞI', 'KUYUMCUKENT', 'OFİS', 'BANKA HAVALESİ', 'ÇEK', 'TOPLAM'].map((category, index) => (
                    <Tr key={category} _hover={{ bg: "gray.50" }} bg={category === 'TOPLAM' ? "purple.50" : undefined}>
                      <Td border="1px" borderColor="gray.300" p={1}>
                        <Text fontSize="10px" fontWeight={category === 'TOPLAM' ? "bold" : "normal"}>{category}</Text>
                      </Td>
                      <Td border="1px" borderColor="gray.300" textAlign="center" p={1}>
                        <Text fontSize="10px" fontWeight={category === 'TOPLAM' ? "bold" : "normal"}>
                          ${data.summary_tables?.collection_details?.[category]?.mkm?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '$0'}
                        </Text>
                      </Td>
                      <Td border="1px" borderColor="gray.300" textAlign="center" p={1}>
                        <Text fontSize="10px" fontWeight={category === 'TOPLAM' ? "bold" : "normal"}>
                          ${data.summary_tables?.collection_details?.[category]?.msm?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '$0'}
                        </Text>
                      </Td>
                      <Td border="1px" borderColor="gray.300" textAlign="center" p={1} bg={category === 'TOPLAM' ? "purple.200" : "blue.50"}>
                        <Text fontSize="10px" fontWeight="bold" color={category === 'TOPLAM' ? "purple.800" : "blue.800"}>
                          ${((data.summary_tables?.collection_details?.[category]?.mkm || 0) + (data.summary_tables?.collection_details?.[category]?.msm || 0)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </Text>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </Box>

          {/* Daily Breakdown Table */}
          <Box>
            <Heading size="xs" mb={2} textAlign="center" color="teal.700" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
              Günlük Tahsilat Detayları
            </Heading>
            <Box overflowX="auto" bg="white" borderRadius="md" border="1px" borderColor="teal.200" w="100%">
              <Table variant="simple" size="sm" w="100%" style={{ fontSize: '12px' }}>
                <Tbody>
                  <Tr>
                    {/* First row: Days 1-16 */}
                    {Array.from({ length: 16 }, (_, i) => {
                      const day = i + 1;
                      const dayStr = day.toString().padStart(2, '0');
                      const dateKey = `${dayStr}-09-2025`;
                      const amount = data.monthly_daily_totals?.daily_totals?.[dateKey] || 0;
                      const hasData = amount > 0;
                      
                      return (
                        <Td key={`data1-${day}`} border="1px" borderColor="teal.200" textAlign="center" p={2} bg={hasData ? "white" : "gray.50"} minW="65px">
                          <VStack spacing={1}>
                            <Text fontSize="11px" fontWeight="bold" color="teal.800" lineHeight="1.2">
                              {day} eylül
                            </Text>
                            {hasData ? (
                              <Text fontSize="10px" fontWeight="bold" color="teal.700" lineHeight="1.2" mt="2px">
                                ${(amount as number).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </Text>
                            ) : (
                              <Text fontSize="10px" color="gray.400" lineHeight="1.2" mt="2px">-</Text>
                            )}
                          </VStack>
                        </Td>
                      );
                    })}
                  </Tr>
                  <Tr>
                    {/* Second row: Days 17-31 */}
                    {Array.from({ length: 15 }, (_, i) => {
                      const day = i + 17;
                      const dayStr = day.toString().padStart(2, '0');
                      const dateKey = `${dayStr}-09-2025`;
                      const amount = data.monthly_daily_totals?.daily_totals?.[dateKey] || 0;
                      const hasData = amount > 0;
                      
                      return (
                        <Td key={`data2-${day}`} border="1px" borderColor="teal.200" textAlign="center" p={2} bg={hasData ? "white" : "gray.50"} minW="65px">
                          <VStack spacing={1}>
                            <Text fontSize="11px" fontWeight="bold" color="teal.800" lineHeight="1.2">
                              {day} eylül
                            </Text>
                            {hasData ? (
                              <Text fontSize="10px" fontWeight="bold" color="teal.700" lineHeight="1.2" mt="2px">
                                ${(amount as number).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </Text>
                            ) : (
                              <Text fontSize="10px" color="gray.400" lineHeight="1.2" mt="2px">-</Text>
                            )}
                          </VStack>
                        </Td>
                      );
                    })}
                    {/* Monthly Total Cell */}
                    <Td border="1px" borderColor="teal.400" textAlign="center" p={2} bg="teal.100" minW="75px">
                      <VStack spacing={1}>
                        <Text fontSize="11px" fontWeight="bold" color="teal.800" lineHeight="1.2">TOPLAM</Text>
                        <Text fontSize="10px" fontWeight="bold" color="teal.800" lineHeight="1.2" mt="2px">
                          ${((data.summary_tables?.collection_details?.['TOPLAM']?.mkm || 0) + (data.summary_tables?.collection_details?.['TOPLAM']?.msm || 0)).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </Text>
                      </VStack>
                    </Td>
                  </Tr>
                </Tbody>
              </Table>
            </Box>
            {data.monthly_daily_totals && (
              <Text fontSize="xs" color="gray.500" mt={1} textAlign="center">
                {data.monthly_daily_totals.month_name} • Günlük tahsilat tutarları USD olarak gösterilmiştir
              </Text>
            )}
          </Box>
        </VStack>

        {/* Week Summary Footer */}
        <Box py={2} mt={3} textAlign="center" bg="gray.50" borderRadius="md">
          <HStack justify="center">
            <Text fontSize="sm" fontWeight="bold">Week Total:</Text>
            {data.week_totals && data.week_totals.genel_toplam?.usd > 0 ? (
              <Badge colorScheme="green" fontSize="sm" px={3} py={1}>
                ${data.week_totals.genel_toplam.usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Badge>
            ) : (
              <Badge colorScheme="gray" fontSize="sm" px={3} py={1}>
                No data
              </Badge>
            )}
          </HStack>
          
          {data.week_totals && data.week_totals.genel_toplam?.usd > 0 && (
            <Text fontSize="xs" color="gray.600" mt={1}>
              Week {selectedWeek} • {data.weekly_report.length} customers
            </Text>
          )}
        </Box>

        <Text fontSize="xs" color="gray.500" mt={2} textAlign="center">
          All amounts displayed in USD • TL and EUR payments converted to USD • 
          <Text as="span" color="blue.600">TL</Text> and <Text as="span" color="purple.600">EUR</Text> indicators show original payment currencies
        </Text>
      </VStack>
    );
  };

  // Prepare sidebar props
  const sidebarProps = {
    selectedYear,
    selectedMonth,
    selectedWeek,
    availableYears,
    availableMonths,
    weeksInSelectedMonth,
    onYearChange: handleYearChange,
    onMonthChange: handleMonthChange,
    onWeekSelect: handleWeekSelect,
    onRefreshReports: handleRefreshReports,
    isLoadingReportList
  };

  return (
    <Layout sidebarProps={sidebarProps}>
      <Box w="100%" maxW="none" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">
        {/* Header */}
        <Flex justifyContent="space-between" alignItems="center" mb={4}>
          <Heading size="lg" fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif">Weekly Collections Reports</Heading>
          {selectedWeek && (
            <Menu>
              <MenuButton
                as={Button}
                rightIcon={<ChevronDownIcon />}
                colorScheme="brand"
                size="sm"
                fontFamily="'Century Gothic', 'Futura', 'Trebuchet MS', Arial, sans-serif"
                isDisabled={!allWeekReports[selectedWeek] || !allWeekReports[selectedWeek].success || 
                           Object.keys(isExporting).some(key => key.startsWith(`${selectedWeek}-`))}
              >
                {Object.keys(isExporting).some(key => key.startsWith(`${selectedWeek}-`)) 
                  ? 'Exporting...' 
                  : 'Export Report'}
              </MenuButton>
              <MenuList>
                <MenuItem 
                  icon={isExporting[`${selectedWeek}-xlsx`] ? <Spinner size="sm" /> : <DownloadIcon />} 
                  onClick={() => handleExport('xlsx', selectedWeek)}
                  isDisabled={isExporting[`${selectedWeek}-xlsx`]}
                >
                  Export as Excel
                </MenuItem>
                <MenuItem 
                  icon={isExporting[`${selectedWeek}-csv`] ? <Spinner size="sm" /> : <DownloadIcon />} 
                  onClick={() => handleExport('csv', selectedWeek)}
                  isDisabled={isExporting[`${selectedWeek}-csv`]}
                >
                  Export as CSV
                </MenuItem>
                <MenuItem 
                  icon={isExporting[`${selectedWeek}-json`] ? <Spinner size="sm" /> : <DownloadIcon />} 
                  onClick={() => handleExport('json', selectedWeek)}
                  isDisabled={isExporting[`${selectedWeek}-json`]}
                >
                  Export as JSON
                </MenuItem>
                <MenuItem 
                  icon={<Icon as={FaPrint} />} 
                  onClick={() => handlePrint(selectedWeek)}
                >
                  Print Report
                </MenuItem>
              </MenuList>
            </Menu>
          )}
        </Flex>
        
        {/* Main Content */}
        <Card w="100%">
          <CardHeader py={3}>
            <Heading size="md">
              {selectedWeek ? `Week ${selectedWeek} Collections` : 'Select a week from the sidebar'}
            </Heading>
          </CardHeader>
          <CardBody py={3}>
            {isLoadingReportList ? (
              <Flex justify="center" py={8} direction="column" align="center">
                <Spinner size="xl" mb={4} />
                <Text>Loading available reports...</Text>
              </Flex>
            ) : error && weeklyReports.length === 0 ? (
              <Alert status="error">
                <AlertIcon />
                {error}
              </Alert>
            ) : !selectedWeek ? (
              <Alert status="info">
                <AlertIcon />
                Please select a week from the sidebar to view the report
              </Alert>
            ) : !allWeekReports[selectedWeek] ? (
              <Flex justify="center" py={8} direction="column" align="center">
                <Spinner size="xl" mb={4} />
                <Text>Loading report data for Week {selectedWeek}...</Text>
              </Flex>
            ) : (
              renderCompactWeeklyReport(allWeekReports[selectedWeek])
            )}
          </CardBody>
        </Card>
      </Box>
    </Layout>
  );
};

export default ReportsPage;